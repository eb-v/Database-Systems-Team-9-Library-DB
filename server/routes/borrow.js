const db = require('../db');
const ITEM_FEE_POLICY = require('../config/itemFeePolicy');

const formatDate = (d) => d.toISOString().split('T')[0];

async function borrowItem(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { person_id, item_id } = JSON.parse(body);

            // anyone can only borrow on their own behalf
            if (req.user.person_id !== parseInt(person_id)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only borrow on your own behalf' }));
            }

            // step 1 — check the patron exists and is allowed to borrow
            const [personRows] = await db.query(
                `SELECT borrow_status FROM Person WHERE Person_ID = ?`,
                [person_id]
            );
            if (personRows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Person not found' }));
            }
            if (personRows[0].borrow_status !== 1) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'Borrowing is restricted due to outstanding fees. Please pay your fees to restore borrowing access.' }));
            }

            // step 1b — enforce borrow limits (staff: 5, patrons: 3)
            const borrowLimit = req.user.role === 1 ? 5 : 3;
            const [activeBorrows] = await db.query(
                `SELECT COUNT(DISTINCT bi.Copy_ID) AS count FROM BorrowedItem bi
                 JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
                 WHERE bi.Person_ID = ? AND cp.Copy_status = 2
                   AND bi.BorrowedItem_ID = (
                     SELECT MAX(bi2.BorrowedItem_ID)
                     FROM BorrowedItem bi2
                     WHERE bi2.Copy_ID = bi.Copy_ID
                   )`,
                [person_id]
            );
            if (activeBorrows[0].count >= borrowLimit) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: `Borrow limit reached. You can have at most ${borrowLimit} items checked out at a time.` }));
            }

            // prevent borrowing the same item twice at the same time
            const [alreadyBorrowed] = await db.query(
                `SELECT bi.BorrowedItem_ID FROM BorrowedItem bi
                 JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
                 WHERE bi.Person_ID = ? AND cp.Item_ID = ? AND cp.Copy_status = 2
                   AND bi.BorrowedItem_ID = (
                     SELECT MAX(bi2.BorrowedItem_ID)
                     FROM BorrowedItem bi2
                     WHERE bi2.Copy_ID = bi.Copy_ID
                   )`,
                [person_id, item_id]
            );
            if (alreadyBorrowed.length > 0) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'You already have this item checked out.' }));
            }

            const today = new Date();
            const todayStr = formatDate(today);

            // step 2 — expire any stale Ready holds on this item
            // setting hold_status=0 fires shift_hold_queue trigger automatically
            const [expiredHolds] = await db.query(
                `SELECT h.Hold_ID FROM HoldItem h
                 JOIN Copy c ON h.Copy_ID = c.Copy_ID
                 WHERE c.Item_ID = ? AND h.hold_status = 2 AND h.expiry_date < ?`,
                [item_id, todayStr]
            );
            for (const expired of expiredHolds) {
                await db.query(`UPDATE HoldItem SET hold_status = 0 WHERE Hold_ID = ?`, [expired.Hold_ID]);
            }

            // step 3 — find available copies (not reserved for any Ready hold)
            const [availableCopies] = await db.query(
                `SELECT cp.Copy_ID FROM Copy cp
                 WHERE cp.Item_ID = ? AND cp.Copy_status = 1
                 AND cp.Copy_ID NOT IN (SELECT Copy_ID FROM HoldItem WHERE hold_status = 2)`,
                [item_id]
            );

            // step 4 — check active item-level holds
            const [activeHolds] = await db.query(
                `SELECT h.Hold_ID, h.Person_ID, h.queue_status, h.hold_status, h.Copy_ID
                 FROM HoldItem h
                 JOIN Copy c ON h.Copy_ID = c.Copy_ID
                 WHERE c.Item_ID = ? AND h.hold_status IN (1, 2)
                 ORDER BY h.queue_status ASC`,
                [item_id]
            );

            let copy_id;
            let patronHold = null;

            if (activeHolds.length > 0) {
                // holds exist — patron must be first in the item queue
                patronHold = activeHolds.find(
                    h => parseInt(h.Person_ID) === parseInt(person_id) &&
                         (h.hold_status === 2 || h.queue_status === 0)
                );
                if (!patronHold) {
                    res.writeHead(403);
                    return res.end(JSON.stringify({ error: 'This item has active holds. You must be first in the hold queue to check it out.' }));
                }

                if (patronHold.hold_status === 2) {
                    // Ready hold — use the specific copy already assigned to them
                    copy_id = patronHold.Copy_ID;
                } else {
                    // Waiting but first in queue — grab any available copy
                    if (availableCopies.length === 0) {
                        res.writeHead(400);
                        return res.end(JSON.stringify({ error: 'No copies currently available' }));
                    }
                    copy_id = availableCopies[0].Copy_ID;
                }
            } else {
                // no holds — use any available copy
                if (availableCopies.length === 0) {
                    res.writeHead(400);
                    return res.end(JSON.stringify({ error: 'No copies available' }));
                }
                copy_id = availableCopies[0].Copy_ID;
            }

            // step 5 — calculate borrow and return-by dates (staff: 2 weeks, patrons: 1 week)
            const borrowDate = new Date();
            const returnByDate = new Date();
            const borrowDays = req.user.role === 1 ? 14 : 7;
            returnByDate.setDate(returnByDate.getDate() + borrowDays);

            // step 6 — insert BorrowedItem
            const [result] = await db.query(
                `INSERT INTO BorrowedItem (borrow_date, returnBy_date, Person_ID, Copy_ID)
                 VALUES (?, ?, ?, ?)`,
                [formatDate(borrowDate), formatDate(returnByDate), person_id, copy_id]
            );

            // step 7 — mark copy as checked out
            await db.query(`UPDATE Copy SET Copy_status = 2 WHERE Copy_ID = ?`, [copy_id]);

            // step 8 — fulfill patron's hold if they had one
            if (patronHold) {
                await db.query(`UPDATE HoldItem SET hold_status = 3 WHERE Hold_ID = ?`, [patronHold.Hold_ID]);

                // shift item-level queue — everyone behind this patron's position moves up
                await db.query(
                    `UPDATE HoldItem h JOIN Copy c ON h.Copy_ID = c.Copy_ID
                     SET h.queue_status = h.queue_status - 1
                     WHERE c.Item_ID = ? AND h.hold_status IN (1, 2) AND h.queue_status > ?`,
                    [item_id, patronHold.queue_status]
                );

                // edge case: if other copies are still available after checkout,
                // promote the next person (no Copy status changed, so trigger won't fire)
                const [stillAvailable] = await db.query(
                    `SELECT cp.Copy_ID FROM Copy cp
                     WHERE cp.Item_ID = ? AND cp.Copy_status = 1 AND cp.Copy_ID != ?
                     AND cp.Copy_ID NOT IN (SELECT Copy_ID FROM HoldItem WHERE hold_status = 2)
                     LIMIT 1`,
                    [item_id, copy_id]
                );
                if (stillAvailable.length > 0) {
                    const [nextHold] = await db.query(
                        `SELECT h.Hold_ID FROM HoldItem h
                         JOIN Copy c ON h.Copy_ID = c.Copy_ID
                         WHERE c.Item_ID = ? AND h.hold_status = 1
                         ORDER BY h.queue_status ASC, h.hold_date ASC LIMIT 1`,
                        [item_id]
                    );
                    if (nextHold.length > 0) {
                        const expiry = new Date();
                        expiry.setDate(expiry.getDate() + 2);
                        await db.query(
                            `UPDATE HoldItem SET hold_status = 2, expiry_date = ?, Copy_ID = ? WHERE Hold_ID = ?`,
                            [formatDate(expiry), stillAvailable[0].Copy_ID, nextHold[0].Hold_ID]
                        );
                    }
                }
            }

            res.writeHead(201);
            res.end(JSON.stringify({
                message: 'Item checked out successfully',
                borrowedItem_id: result.insertId,
                return_by: formatDate(returnByDate)
            }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to borrow item', details: err.message }));
        }
    });
}

async function returnItem(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { borrowedItem_id, damaged, lost } = JSON.parse(body);

            // step 1 — look up the borrowed item record
            const [borrowRows] = await db.query(
                `SELECT bi.BorrowedItem_ID, bi.returnBy_date, bi.Copy_ID, bi.Person_ID, i.Item_type, cp.Copy_status
                 FROM BorrowedItem bi
                 JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
                 JOIN Item i ON cp.Item_ID = i.Item_ID
                 WHERE bi.BorrowedItem_ID = ?`,
                [borrowedItem_id]
            );
            if (borrowRows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Borrowed item record not found' }));
            }

            const record = borrowRows[0];

            if (req.user.person_id !== parseInt(record.Person_ID)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only return your own borrowed items' }));
            }

            if (damaged && lost) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Item cannot be both damaged and lost' }));
            }

            if (record.Copy_status !== 2) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'This item has already been returned' }));
            }

            const today = new Date();
            const returnByDate = new Date(record.returnBy_date);

            // step 2 — check if late (late fee does not apply to lost items)
            const isLate = !lost && today > returnByDate;

            if (isLate) {
                const lateFee = ITEM_FEE_POLICY[record.Item_type]?.late || 5.0;
                await db.query(
                    `INSERT INTO FeeOwed (date_owed, status, fee_amount, fee_type, Person_ID, BorrowedItem_ID)
                     VALUES (?, 1, ?, 1, ?, ?)`,
                    [formatDate(today), lateFee, record.Person_ID, borrowedItem_id]
                );
            }

            if (damaged) {
                const damageFee = ITEM_FEE_POLICY[record.Item_type]?.damage || 25.0;
                await db.query(
                    `INSERT INTO FeeOwed (date_owed, status, fee_amount, fee_type, Person_ID, BorrowedItem_ID)
                     VALUES (?, 1, ?, 2, ?, ?)`,
                    [formatDate(today), damageFee, record.Person_ID, borrowedItem_id]
                );
            }

            if (lost) {
                const lossFee = ITEM_FEE_POLICY[record.Item_type]?.loss || 30.0;
                await db.query(
                    `INSERT INTO FeeOwed (date_owed, status, fee_amount, fee_type, Person_ID, BorrowedItem_ID)
                     VALUES (?, 1, ?, 3, ?, ?)`,
                    [formatDate(today), lossFee, record.Person_ID, borrowedItem_id]
                );
            }

            // step 3 — update copy status
            // if returned normally (status=1), promote_next_hold trigger fires automatically
            const newCopyStatus = lost ? 3 : damaged ? 4 : 1;
            await db.query(`UPDATE Copy SET Copy_status = ? WHERE Copy_ID = ?`, [newCopyStatus, record.Copy_ID]);

            res.writeHead(200);
            res.end(JSON.stringify({
                message: 'Item returned successfully',
                late: isLate,
                damaged: !!damaged,
                lost: !!lost,
                fees_charged: {
                    late: isLate ? (ITEM_FEE_POLICY[record.Item_type]?.late || 5.0) : 0,
                    damage: damaged ? (ITEM_FEE_POLICY[record.Item_type]?.damage || 25.0) : 0,
                    loss: lost ? (ITEM_FEE_POLICY[record.Item_type]?.loss || 30.0) : 0
                }
            }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to return item', details: err.message }));
        }
    });
}

async function getBorrowedItems(req, res) {
    try {
        const personId = req.url.split('/')[3];

        if (req.user.role === 2 && req.user.person_id !== parseInt(personId)) {
            res.writeHead(403);
            return res.end(JSON.stringify({ error: 'Access denied' }));
        }

        const [personRows] = await db.query(`SELECT Person_ID FROM Person WHERE Person_ID = ?`, [personId]);
        if (personRows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'Person not found' }));
        }

        const [rows] = await db.query(
            `SELECT
                bi.BorrowedItem_ID, bi.borrow_date, bi.returnBy_date,
                bi.Copy_ID, cp.Copy_status,
                i.Item_ID, i.Item_name, i.Item_type
             FROM BorrowedItem bi
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             JOIN Item i ON cp.Item_ID = i.Item_ID
             WHERE bi.Person_ID = ?
               AND bi.BorrowedItem_ID = (
                 SELECT MAX(bi2.BorrowedItem_ID)
                 FROM BorrowedItem bi2
                 WHERE bi2.Copy_ID = bi.Copy_ID
               )
             ORDER BY bi.borrow_date DESC`,
            [personId]
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch borrowed items', details: err.message }));
    }
}

async function getAllBorrows(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT
                bi.BorrowedItem_ID, bi.borrow_date, bi.returnBy_date,
                bi.Person_ID, p.First_name, p.Last_name,
                bi.Copy_ID, cp.Copy_status, i.Item_ID, i.Item_name, i.Item_type
             FROM BorrowedItem bi
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             JOIN Item i ON cp.Item_ID = i.Item_ID
             JOIN Person p ON bi.Person_ID = p.Person_ID
             ORDER BY bi.borrow_date DESC`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch borrow history', details: err.message }));
    }
}

module.exports = { borrowItem, returnItem, getBorrowedItems, getAllBorrows };
