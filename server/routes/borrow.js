const db = require('../db');

async function borrowItem(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { person_id, copy_id } = JSON.parse(body);

            // step 1 — check the copy exists and is available (Copy_status 1 = available)
            const [copyRows] = await db.query(
                `SELECT Copy_status FROM Copy WHERE Copy_ID = ?`,
                [copy_id]
            );
            if (copyRows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Copy not found' }));
            }
            if (copyRows[0].Copy_status !== 1) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Copy is not available' }));
            }

            // step 2 — check the patron exists and is allowed to borrow (borrow_status 1 = allowed)
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
                return res.end(JSON.stringify({ error: 'Person is not allowed to borrow' }));
            }

            // step 3 — calculate borrow date (today) and return-by date (2 weeks from today)
            const borrowDate = new Date();
            const returnByDate = new Date();
            returnByDate.setDate(returnByDate.getDate() + 14);

            // format dates as YYYY-MM-DD for MySQL
            const formatDate = (d) => d.toISOString().split('T')[0];

            // step 4 — insert into BorrowedItem
            const [result] = await db.query(
                `INSERT INTO BorrowedItem (borrow_date, returnBy_date, Person_ID, Copy_ID)
                 VALUES (?, ?, ?, ?)`,
                [formatDate(borrowDate), formatDate(returnByDate), person_id, copy_id]
            );

            // step 5 — update the copy status to 2 (checked out)
            await db.query(`UPDATE Copy SET Copy_status = 2 WHERE Copy_ID = ?`, [copy_id]);

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

module.exports = { borrowItem };
