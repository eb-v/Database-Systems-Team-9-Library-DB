const db = require('../db');

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

            // step 1 — check the patron exists and is allowed to borrow (borrow_status 1 = allowed)
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

            // step 2 — find the best available copy. prefer copies with no active holds,
            // then fall back to a copy where this patron is first in the hold queue
            const [availableCopies] = await db.query(
                `SELECT cp.Copy_ID,
                    EXISTS(
                        SELECT 1 FROM HoldItem h
                        WHERE h.Copy_ID = cp.Copy_ID AND h.hold_status IN (1, 2)
                    ) AS has_holds,
                    (
                        SELECT COUNT(*) FROM HoldItem h
                        WHERE h.Copy_ID = cp.Copy_ID AND h.hold_status IN (1, 2)
                        AND h.Person_ID = ? AND h.queue_status = 0
                    ) AS patron_is_first
                 FROM Copy cp
                 WHERE cp.Item_ID = ? AND cp.Copy_status = 1
                 ORDER BY has_holds ASC`,
                [person_id, item_id]
            );

            if (availableCopies.length === 0) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'No copies available' }));
            }

            const selectedCopy = availableCopies.find(c => !c.has_holds) || availableCopies.find(c => c.patron_is_first);

            if (!selectedCopy) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'All available copies have active holds. You must be first in line to check out.' }));
            }

            const copy_id = selectedCopy.Copy_ID;

            // step 3 — expire any holds on this copy that have passed their expiry date
            const today = new Date();
            const formatDate = (d) => d.toISOString().split('T')[0];
            const todayStr = formatDate(today);

            const [expiredHolds] = await db.query(
                `SELECT Hold_ID, queue_status FROM HoldItem
                 WHERE Copy_ID = ? AND hold_status = 2 AND expiry_date < ?`,
                [copy_id, todayStr]
            );

            for (const expired of expiredHolds) {
                // soft delete the expired hold
                await db.query(`UPDATE HoldItem SET hold_status = 0 WHERE Hold_ID = ?`, [expired.Hold_ID]);
                // shift queue for everyone behind it
                await db.query(
                    `UPDATE HoldItem SET queue_status = queue_status - 1
                     WHERE Copy_ID = ? AND hold_status IN (1, 2) AND queue_status > ?`,
                    [copy_id, expired.queue_status]
                );
            }

            // if any holds were expired, check if the next person in queue should be promoted
            if (expiredHolds.length > 0) {
                const [nextHold] = await db.query(
                    `SELECT Hold_ID FROM HoldItem WHERE Copy_ID = ? AND hold_status = 1 AND queue_status = 0`,
                    [copy_id]
                );
                if (nextHold.length > 0) {
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + 2);
                    await db.query(
                        `UPDATE HoldItem SET hold_status = 2, expiry_date = ? WHERE Hold_ID = ?`,
                        [formatDate(expiry), nextHold[0].Hold_ID]
                    );
                }
            }

            // step 4 — check if there are active holds on this copy
            const [activeHolds] = await db.query(
                `SELECT Hold_ID, Person_ID, queue_status FROM HoldItem
                 WHERE Copy_ID = ? AND hold_status IN (1, 2)`,
                [copy_id]
            );

            if (activeHolds.length > 0) {
                // holds exist — only allow checkout if this patron is first in line (queue_status = 0)
                const patronHold = activeHolds.find(
                    h => parseInt(h.Person_ID) === parseInt(person_id) && h.queue_status === 0
                );
                if (!patronHold) {
                    res.writeHead(403);
                    return res.end(JSON.stringify({ error: 'This copy has active holds. You must be first in line to check it out.' }));
                }
                // mark their hold as fulfilled (hold_status 3) and shift the queue
                await db.query(`UPDATE HoldItem SET hold_status = 3 WHERE Hold_ID = ?`, [patronHold.Hold_ID]);
                await db.query(
                    `UPDATE HoldItem SET queue_status = queue_status - 1
                     WHERE Copy_ID = ? AND hold_status IN (1, 2) AND queue_status > 0`,
                    [copy_id]
                );
            }

            // step 5 — calculate borrow date (today) and return-by date (2 weeks from today)
            const borrowDate = new Date();
            const returnByDate = new Date();
            returnByDate.setDate(returnByDate.getDate() + 14);

            // step 6 — insert into BorrowedItem
            const [result] = await db.query(
                `INSERT INTO BorrowedItem (borrow_date, returnBy_date, Person_ID, Copy_ID)
                 VALUES (?, ?, ?, ?)`,
                [formatDate(borrowDate), formatDate(returnByDate), person_id, copy_id]
            );

            // step 7 — update the copy status to 2 (checked out)
            await db.query(`UPDATE Copy SET Copy_status = 2 WHERE Copy_ID = ?`, [copy_id]);

            // step 8 — fulfill any active hold this patron has on this item (regardless of which copy)
            const [patronHoldOnItem] = await db.query(
                `SELECT h.Hold_ID, h.Copy_ID, h.queue_status FROM HoldItem h
                 JOIN Copy cp ON h.Copy_ID = cp.Copy_ID
                 WHERE cp.Item_ID = ? AND h.Person_ID = ? AND h.hold_status IN (1, 2)`,
                [item_id, person_id]
            );
            if (patronHoldOnItem.length > 0) {
                const ph = patronHoldOnItem[0];
                await db.query(`UPDATE HoldItem SET hold_status = 3 WHERE Hold_ID = ?`, [ph.Hold_ID]);
                // shift queue for others behind this hold on that copy
                await db.query(
                    `UPDATE HoldItem SET queue_status = queue_status - 1
                     WHERE Copy_ID = ? AND hold_status IN (1, 2) AND queue_status > ?`,
                    [ph.Copy_ID, ph.queue_status]
                );
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

            // step 1 — look up the borrowed item record, join Copy and Item to get copy_id and item_type
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

            // anyone can only return their own borrowed items
            if (req.user.person_id !== parseInt(record.Person_ID)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only return your own borrowed items' }));
            }

            // damaged and lost are mutually exclusive
            if (damaged && lost) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Item cannot be both damaged and lost' }));
            }

            // check the item hasn't already been returned (1 = available, 3 = lost, 4 = damaged)
            if (record.Copy_status !== 2) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'This item has already been returned' }));
            }

            const today = new Date();
            const returnByDate = new Date(record.returnBy_date);
            const formatDate = (d) => d.toISOString().split('T')[0];

            // step 2 — check if return is late (late fee does not apply to lost items)
            const isLate = !lost && today > returnByDate;

            if (isLate) {
                // step 3 — determine flat fee based on item type. 1 = book $5, 2 = CD $10, 3 = device $20
                const feeMap = { 1: 5.00, 2: 10.00, 3: 20.00 };
                const lateFee = feeMap[record.Item_type] || 5.00;

                // step 4 — insert a FeeOwed record. status 1 = unpaid, fee_type 1 = late
                await db.query(
                    `INSERT INTO FeeOwed (date_owed, status, fee_amount, fee_type, Person_ID, BorrowedItem_ID)
                     VALUES (?, 1, ?, 1, ?, ?)`,
                    [formatDate(today), lateFee, record.Person_ID, borrowedItem_id]
                );
            }

            // step 4b — issue damage fee if item is returned damaged. fee_type 2 = damage
            if (damaged) {
                const damageFeeMap = { 1: 25.00, 2: 15.00, 3: 50.00 };
                const damageFee = damageFeeMap[record.Item_type] || 25.00;
                await db.query(
                    `INSERT INTO FeeOwed (date_owed, status, fee_amount, fee_type, Person_ID, BorrowedItem_ID)
                     VALUES (?, 1, ?, 2, ?, ?)`,
                    [formatDate(today), damageFee, record.Person_ID, borrowedItem_id]
                );
            }

            // step 4c — issue loss fee if item is lost. fee_type 3 = loss
            if (lost) {
                const lossFeeMap = { 1: 30.00, 2: 20.00, 3: 100.00 };
                const lossFee = lossFeeMap[record.Item_type] || 30.00;
                await db.query(
                    `INSERT INTO FeeOwed (date_owed, status, fee_amount, fee_type, Person_ID, BorrowedItem_ID)
                     VALUES (?, 1, ?, 3, ?, ?)`,
                    [formatDate(today), lossFee, record.Person_ID, borrowedItem_id]
                );
            }

            // step 5 — set copy status. 1 = available, 3 = lost, 4 = damaged
            const newCopyStatus = lost ? 3 : damaged ? 4 : 1;
            await db.query(`UPDATE Copy SET Copy_status = ? WHERE Copy_ID = ?`, [newCopyStatus, record.Copy_ID]);


            res.writeHead(200);
            res.end(JSON.stringify({
                message: 'Item returned successfully',
                late: isLate,
                damaged: !!damaged,
                lost: !!lost,
                fees_charged: {
                    late: isLate ? (({ 1: 5.00, 2: 10.00, 3: 20.00 })[record.Item_type] || 5.00) : 0,
                    damage: damaged ? (({ 1: 25.00, 2: 15.00, 3: 50.00 })[record.Item_type] || 25.00) : 0,
                    loss: lost ? (({ 1: 30.00, 2: 20.00, 3: 100.00 })[record.Item_type] || 30.00) : 0
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
        // extract person ID from URL — e.g. /api/borrow/3
        const personId = req.url.split('/')[3];

        // if the requester is a patron (role 2), they can only view their own borrowed items
        if (req.user.role === 2 && req.user.person_id !== parseInt(personId)) {
            res.writeHead(403);
            return res.end(JSON.stringify({ error: 'Access denied' }));
        }

        // check the person exists
        const [personRows] = await db.query(`SELECT Person_ID FROM Person WHERE Person_ID = ?`, [personId]);
        if (personRows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'Person not found' }));
        }

        // get the most recent borrow record per copy for this person
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
                 WHERE bi2.Copy_ID = bi.Copy_ID AND bi2.Person_ID = bi.Person_ID
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
        // get all borrow history across all patrons — frontend can filter by Copy_status for active/inactive
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
