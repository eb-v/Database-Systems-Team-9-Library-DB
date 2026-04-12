const db = require('../db');

const formatDate = (d) => d.toISOString().split('T')[0];

async function cleanupExpiredHolds() {
    const todayStr = formatDate(new Date());

    const [expiredHolds] = await db.query(
        `SELECT h.Hold_ID, h.queue_status, h.Copy_ID, c.Item_ID
         FROM HoldItem h
         JOIN Copy c ON h.Copy_ID = c.Copy_ID
         WHERE h.hold_status = 2 AND h.expiry_date < ?`,
        [todayStr]
    );

    for (const expired of expiredHolds) {
        // cancel the expired hold
        await db.query(`UPDATE HoldItem SET hold_status = 0 WHERE Hold_ID = ?`, [expired.Hold_ID]);

        // shift item-level queue
        await db.query(
            `UPDATE HoldItem h JOIN Copy c ON h.Copy_ID = c.Copy_ID
             SET h.queue_status = h.queue_status - 1
             WHERE c.Item_ID = ? AND h.hold_status IN (1, 2) AND h.queue_status > ?`,
            [expired.Item_ID, expired.queue_status]
        );

        // promote next waiting hold
        const [nextHold] = await db.query(
            `SELECT h.Hold_ID FROM HoldItem h
             JOIN Copy c ON h.Copy_ID = c.Copy_ID
             WHERE c.Item_ID = ? AND h.hold_status = 1
             ORDER BY h.queue_status ASC, h.hold_date ASC LIMIT 1`,
            [expired.Item_ID]
        );
        if (nextHold.length > 0) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 2);
            await db.query(
                `UPDATE HoldItem SET hold_status = 2, expiry_date = ?, Copy_ID = ? WHERE Hold_ID = ?`,
                [formatDate(expiry), expired.Copy_ID, nextHold[0].Hold_ID]
            );
        }
    }
}

async function placeHold(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { person_id, item_id } = JSON.parse(body);

            if (req.user.person_id !== parseInt(person_id)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only place holds on your own behalf' }));
            }

            const [itemRows] = await db.query(`SELECT Item_ID FROM Item WHERE Item_ID = ?`, [item_id]);
            if (itemRows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Item not found' }));
            }

            // check patron is under the 2-hold limit
            const [holdCountRows] = await db.query(
                `SELECT COUNT(*) as count FROM HoldItem WHERE Person_ID = ? AND hold_status IN (1, 2)`,
                [person_id]
            );
            if (holdCountRows[0].count >= 2) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'You already have the maximum number of active holds (2)' }));
            }

            // check patron doesn't already have an active hold on this item
            const [existingHold] = await db.query(
                `SELECT h.Hold_ID FROM HoldItem h
                 JOIN Copy c ON h.Copy_ID = c.Copy_ID
                 WHERE c.Item_ID = ? AND h.Person_ID = ? AND h.hold_status IN (1, 2)`,
                [item_id, person_id]
            );
            if (existingHold.length > 0) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'You already have an active hold on this item' }));
            }

            // need at least one non-removed copy to satisfy the FK for waiting holds
            const [anyCopy] = await db.query(
                `SELECT Copy_ID FROM Copy WHERE Item_ID = ? AND Copy_status != 0 LIMIT 1`,
                [item_id]
            );
            if (anyCopy.length === 0) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'No copies exist for this item' }));
            }

            // item-level queue position = total active holds across all copies of this item
            const [itemHoldCount] = await db.query(
                `SELECT COUNT(*) as count FROM HoldItem h
                 JOIN Copy c ON h.Copy_ID = c.Copy_ID
                 WHERE c.Item_ID = ? AND h.hold_status IN (1, 2)`,
                [item_id]
            );
            const queuePosition = itemHoldCount[0].count;

            // find an available copy not already reserved for a Ready hold
            const [availableCopies] = await db.query(
                `SELECT cp.Copy_ID FROM Copy cp
                 WHERE cp.Item_ID = ? AND cp.Copy_status = 1
                 AND cp.Copy_ID NOT IN (SELECT Copy_ID FROM HoldItem WHERE hold_status = 2)
                 LIMIT 1`,
                [item_id]
            );

            // if a copy is free right now, go straight to Ready — otherwise wait
            const isReady = availableCopies.length > 0;
            const assignedCopyId = isReady ? availableCopies[0].Copy_ID : anyCopy[0].Copy_ID;

            const today = new Date();
            const holdDate = formatDate(today);
            let holdStatus, expiryDate;

            if (isReady) {
                holdStatus = 2;
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 2);
                expiryDate = formatDate(expiry);
            } else {
                holdStatus = 1;
                expiryDate = null;
            }

            const [result] = await db.query(
                `INSERT INTO HoldItem (queue_status, hold_status, hold_date, expiry_date, Person_ID, Copy_ID)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [queuePosition, holdStatus, holdDate, expiryDate, person_id, assignedCopyId]
            );

            res.writeHead(201);
            res.end(JSON.stringify({
                message: 'Hold placed successfully',
                hold_id: result.insertId,
                queue_position: queuePosition + 1,
                status: holdStatus === 2 ? 'ready for pickup' : 'waiting',
                expiry_date: expiryDate
            }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to place hold', details: err.message }));
        }
    });
}

async function cancelHold(req, res) {
    try {
        const holdId = req.url.split('/')[3];

        const [holdRows] = await db.query(`SELECT * FROM HoldItem WHERE Hold_ID = ?`, [holdId]);
        if (holdRows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'Hold not found' }));
        }

        const hold = holdRows[0];

        // patrons can only cancel their own holds; staff can cancel any
        if (req.user.role !== 1 && req.user.person_id !== parseInt(hold.Person_ID)) {
            res.writeHead(403);
            return res.end(JSON.stringify({ error: 'You can only cancel your own holds' }));
        }

        if (hold.hold_status === 0) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Hold is already cancelled' }));
        }
        if (hold.hold_status === 3) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Cannot cancel a fulfilled hold' }));
        }

        // get item_id via the hold's copy
        const [copyRow] = await db.query(`SELECT Item_ID FROM Copy WHERE Copy_ID = ?`, [hold.Copy_ID]);
        const itemId = copyRow[0].Item_ID;

        // soft delete
        await db.query(`UPDATE HoldItem SET hold_status = 0 WHERE Hold_ID = ?`, [holdId]);

        // shift item-level queue — everyone behind this position moves up
        await db.query(
            `UPDATE HoldItem h JOIN Copy c ON h.Copy_ID = c.Copy_ID
             SET h.queue_status = h.queue_status - 1
             WHERE c.Item_ID = ? AND h.hold_status IN (1, 2) AND h.queue_status > ?`,
            [itemId, hold.queue_status]
        );

        // if the cancelled hold was Ready, its assigned copy is still available —
        // the promote_next_hold trigger won't fire (no Copy status changed), so promote manually
        if (hold.hold_status === 2) {
            const [nextHold] = await db.query(
                `SELECT h.Hold_ID FROM HoldItem h
                 JOIN Copy c ON h.Copy_ID = c.Copy_ID
                 WHERE c.Item_ID = ? AND h.hold_status = 1
                 ORDER BY h.queue_status ASC, h.hold_date ASC LIMIT 1`,
                [itemId]
            );
            if (nextHold.length > 0) {
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 2);
                await db.query(
                    `UPDATE HoldItem SET hold_status = 2, expiry_date = ?, Copy_ID = ? WHERE Hold_ID = ?`,
                    [formatDate(expiry), hold.Copy_ID, nextHold[0].Hold_ID]
                );
            }
        }

        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Hold cancelled successfully' }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to cancel hold', details: err.message }));
    }
}

async function getHoldsForPerson(req, res) {
    try {
        await cleanupExpiredHolds();

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
                h.Hold_ID, h.queue_status, h.hold_status, h.hold_date, h.expiry_date,
                h.Copy_ID, h.Person_ID,
                i.Item_ID, i.Item_name, i.Item_type
             FROM HoldItem h
             JOIN Copy c ON h.Copy_ID = c.Copy_ID
             JOIN Item i ON c.Item_ID = i.Item_ID
             WHERE h.Person_ID = ?
             ORDER BY h.hold_date DESC`,
            [personId]
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch holds', details: err.message }));
    }
}

async function getAllHolds(req, res) {
    try {
        await cleanupExpiredHolds();

        const [rows] = await db.query(
            `SELECT
                h.Hold_ID, h.queue_status, h.hold_status, h.hold_date, h.expiry_date,
                h.Person_ID, p.First_name, p.Last_name,
                h.Copy_ID, i.Item_ID, i.Item_name, i.Item_type
             FROM HoldItem h
             JOIN Person p ON h.Person_ID = p.Person_ID
             JOIN Copy c ON h.Copy_ID = c.Copy_ID
             JOIN Item i ON c.Item_ID = i.Item_ID
             ORDER BY h.hold_date DESC`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch all holds', details: err.message }));
    }
}

module.exports = { placeHold, getHoldsForPerson, getAllHolds, cancelHold };
