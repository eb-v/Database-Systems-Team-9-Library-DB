const db = require('../db');

async function placeHold(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { person_id, item_id } = JSON.parse(body);

            // can only place hold on own behalf
            if (req.user.person_id !== parseInt(person_id)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only place holds on your own behalf' }));
            }

            // check item exists
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

            // get all non-removed copies of this item
            const [copies] = await db.query(
                `SELECT Copy_ID, Copy_status FROM Copy WHERE Item_ID = ? AND Copy_status != 0`,
                [item_id]
            );
            if (copies.length === 0) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'No copies exist for this item' }));
            }

            // for each copy, count how many active holds it has
            const copyHoldCounts = await Promise.all(copies.map(async (copy) => {
                const [rows] = await db.query(
                    `SELECT COUNT(*) as count FROM HoldItem WHERE Copy_ID = ? AND hold_status IN (1, 2)`,
                    [copy.Copy_ID]
                );
                return { ...copy, holdCount: rows[0].count };
            }));

            // prefer an available copy with no active holds — otherwise pick the least queued copy
            let assignedCopy = copyHoldCounts.find(c => c.Copy_status === 1 && c.holdCount === 0);
            if (!assignedCopy) {
                assignedCopy = copyHoldCounts.sort((a, b) => a.holdCount - b.holdCount)[0];
            }

            const queuePosition = assignedCopy.holdCount; // 0 = first in line
            const isReady = assignedCopy.Copy_status === 1 && queuePosition === 0;

            const today = new Date();
            const formatDate = (d) => d.toISOString().split('T')[0];
            const holdDate = formatDate(today);

            let holdStatus, expiryDate;
            if (isReady) {
                // copy is available and patron is first — ready for pickup with 2-day window
                holdStatus = 2;
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 2);
                expiryDate = formatDate(expiry);
            } else {
                holdStatus = 1; // waiting in queue
                expiryDate = null;
            }

            const [result] = await db.query(
                `INSERT INTO HoldItem (queue_status, hold_status, hold_date, expiry_date, Person_ID, Copy_ID)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [queuePosition, holdStatus, holdDate, expiryDate, person_id, assignedCopy.Copy_ID]
            );

            res.writeHead(201);
            res.end(JSON.stringify({
                message: 'Hold placed successfully',
                hold_id: result.insertId,
                copy_id: assignedCopy.Copy_ID,
                queue_position: queuePosition,
                status: holdStatus === 2 ? 'ready for pickup' : 'waiting',
                expiry_date: expiryDate
            }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to place hold', details: err.message }));
        }
    });
}

async function getHoldsForPerson(req, res) {
    try {
        const personId = req.url.split('/')[3];

        // patrons can only view their own holds
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
        // get all holds across all patrons — join Person, Copy, and Item for full details
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

async function cancelHold(req, res) {
    try {
        const holdId = req.url.split('/')[3];

        // look up the hold
        const [holdRows] = await db.query(`SELECT * FROM HoldItem WHERE Hold_ID = ?`, [holdId]);
        if (holdRows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'Hold not found' }));
        }

        const hold = holdRows[0];

        // anyone can only cancel their own holds
        if (req.user.person_id !== parseInt(hold.Person_ID)) {
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

        // soft delete
        await db.query(`UPDATE HoldItem SET hold_status = 0 WHERE Hold_ID = ?`, [holdId]);

        // shift queue — decrement everyone behind this hold on the same copy
        await db.query(
            `UPDATE HoldItem SET queue_status = queue_status - 1
             WHERE Copy_ID = ? AND hold_status IN (1, 2) AND queue_status > ?`,
            [hold.Copy_ID, hold.queue_status]
        );

        // if the copy is available and there is now a hold at position 0, mark it ready
        const [copyRows] = await db.query(`SELECT Copy_status FROM Copy WHERE Copy_ID = ?`, [hold.Copy_ID]);
        if (copyRows[0].Copy_status === 1) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 2);
            const expiryDate = expiry.toISOString().split('T')[0];

            await db.query(
                `UPDATE HoldItem SET hold_status = 2, expiry_date = ?
                 WHERE Copy_ID = ? AND hold_status = 1 AND queue_status = 0`,
                [expiryDate, hold.Copy_ID]
            );
        }

        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Hold cancelled successfully' }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to cancel hold', details: err.message }));
    }
}

module.exports = { placeHold, getHoldsForPerson, getAllHolds, cancelHold };
