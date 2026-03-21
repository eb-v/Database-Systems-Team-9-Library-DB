const db = require('../db');

async function borrowItem(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { person_id, copy_id } = JSON.parse(body);

            // anyone can only borrow on their own behalf
            if (req.user.person_id !== person_id) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only borrow on your own behalf' }));
            }

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

async function returnItem(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { borrowedItem_id } = JSON.parse(body);

            // step 1 — look up the borrowed item record, join Copy and Item to get copy_id and item_type
            const [borrowRows] = await db.query(
                `SELECT bi.BorrowedItem_ID, bi.returnBy_date, bi.Copy_ID, bi.Person_ID, i.Item_type
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
            const today = new Date();
            const returnByDate = new Date(record.returnBy_date);
            const formatDate = (d) => d.toISOString().split('T')[0];

            // step 2 — check if return is late
            const isLate = today > returnByDate;

            if (isLate) {
                // step 3 — determine flat fee based on item type. 1 = book $5, 2 = CD $10, 3 = device $20
                const feeMap = { 1: 5.00, 2: 10.00, 3: 20.00 };
                const lateFee = feeMap[record.Item_type] || 5.00;

                // step 4 — insert a FeeOwed record. status 1 = unpaid
                await db.query(
                    `INSERT INTO FeeOwed (date_owed, status, late_fee, Person_ID, BorrowedItem_ID)
                     VALUES (?, 1, ?, ?, ?)`,
                    [formatDate(today), lateFee, record.Person_ID, borrowedItem_id]
                );
            }

            // step 5 — set copy status back to 1 (available)
            await db.query(`UPDATE Copy SET Copy_status = 1 WHERE Copy_ID = ?`, [record.Copy_ID]);

            res.writeHead(200);
            res.end(JSON.stringify({
                message: 'Item returned successfully',
                late: isLate,
                fee_charged: isLate ? (({ 1: 5.00, 2: 10.00, 3: 20.00 })[record.Item_type] || 5.00) : 0
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

        // get all borrowed items for this person — join Item so we can return the item name and type
        const [rows] = await db.query(
            `SELECT
                bi.BorrowedItem_ID, bi.borrow_date, bi.returnBy_date,
                bi.Copy_ID, cp.Copy_status,
                i.Item_ID, i.Item_name, i.Item_type
             FROM BorrowedItem bi
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             JOIN Item i ON cp.Item_ID = i.Item_ID
             WHERE bi.Person_ID = ?
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

async function getAllActiveBorrows(req, res) {
    try {
        // get all currently checked out copies (Copy_status 2 = checked out) across all patrons. use MAX(BorrowedItem_ID) per copy to ensure we only get the most recent borrow record, not old history
        const [rows] = await db.query(
            `SELECT
                bi.BorrowedItem_ID, bi.borrow_date, bi.returnBy_date,
                bi.Person_ID, p.First_name, p.Last_name,
                bi.Copy_ID, i.Item_ID, i.Item_name, i.Item_type
             FROM BorrowedItem bi
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             JOIN Item i ON cp.Item_ID = i.Item_ID
             JOIN Person p ON bi.Person_ID = p.Person_ID
             WHERE cp.Copy_status = 2
               AND bi.BorrowedItem_ID = (
                   SELECT MAX(b2.BorrowedItem_ID) FROM BorrowedItem b2 WHERE b2.Copy_ID = bi.Copy_ID
               )
             ORDER BY bi.returnBy_date ASC`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch active borrows', details: err.message }));
    }
}

module.exports = { borrowItem, returnItem, getBorrowedItems, getAllActiveBorrows };
