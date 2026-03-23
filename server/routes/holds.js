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

module.exports = { placeHold };
