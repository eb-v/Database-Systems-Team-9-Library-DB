const db = require('../db');

async function getFees(req, res) {
    try {
        // extract person ID from URL — e.g. /api/fees/3
        const personId = req.url.split('/')[3];

        // patrons can only view their own fees, staff can view anyone's
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

        // get all fees for this person — join BorrowedItem and Item so we can show what item the fee is for
        const [rows] = await db.query(
            `SELECT
                f.Fine_ID, f.date_owed, f.status, f.fee_amount, f.fee_type,
                f.BorrowedItem_ID, bi.borrow_date, bi.returnBy_date,
                i.Item_name, i.Item_type
             FROM FeeOwed f
             JOIN BorrowedItem bi ON f.BorrowedItem_ID = bi.BorrowedItem_ID
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             JOIN Item i ON cp.Item_ID = i.Item_ID
             WHERE f.Person_ID = ?
             ORDER BY f.date_owed DESC`,
            [personId]
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch fees', details: err.message }));
    }
}

async function payFee(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { fine_id, method } = JSON.parse(body);

            if (!method) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Payment method is required' }));
            }

            // step 1 — check the fee exists and get its details
            const [feeRows] = await db.query(
                `SELECT Fine_ID, status, Person_ID FROM FeeOwed WHERE Fine_ID = ?`,
                [fine_id]
            );
            if (feeRows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Fee not found' }));
            }

            // step 2 — check the fee is actually unpaid (status 1 = unpaid)
            if (feeRows[0].status !== 1) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Fee has already been paid' }));
            }

            // anyone can only pay their own fees
            if (req.user.person_id !== parseInt(feeRows[0].Person_ID)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only pay your own fees' }));
            }

            const today = new Date();
            const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            // step 4 — insert a FeePayment record. method 1 = cash, 2 = card
            const [result] = await db.query(
                `INSERT INTO FeePayment (Payment_Date, method, Person_ID, Fine_ID)
                 VALUES (?, ?, ?, ?)`,
                [formatDate(today), method, feeRows[0].Person_ID, fine_id]
            );

            // step 5 — mark the fee as paid (status 2 = paid)
            await db.query(`UPDATE FeeOwed SET status = 2 WHERE Fine_ID = ?`, [fine_id]);

            res.writeHead(201);
            res.end(JSON.stringify({ message: 'Fee paid successfully', payment_id: result.insertId }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to process payment', details: err.message }));
        }
    });
}

async function getAllFees(req, res) {
    try {
        // get all fees across all patrons — frontend can filter by status for paid/unpaid
        const [rows] = await db.query(
            `SELECT
                f.Fine_ID, f.date_owed, f.status, f.fee_amount, f.fee_type,
                f.Person_ID, p.First_name, p.Last_name,
                f.BorrowedItem_ID, bi.borrow_date, bi.returnBy_date,
                i.Item_name, i.Item_type
             FROM FeeOwed f
             JOIN Person p ON f.Person_ID = p.Person_ID
             JOIN BorrowedItem bi ON f.BorrowedItem_ID = bi.BorrowedItem_ID
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             JOIN Item i ON cp.Item_ID = i.Item_ID
             ORDER BY f.date_owed DESC`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch fees', details: err.message }));
    }
}

async function getAllPayments(req, res) {
    try {
        // get all payment records — join FeeOwed and Person so we can show who paid and for what
        const [rows] = await db.query(
            `SELECT
                fp.Payment_ID, fp.Payment_Date, fp.method,
                fp.Person_ID, p.First_name, p.Last_name,
                fp.Fine_ID, f.fee_amount, f.fee_type, f.date_owed,
                i.Item_name, i.Item_type
             FROM FeePayment fp
             JOIN Person p ON fp.Person_ID = p.Person_ID
             JOIN FeeOwed f ON fp.Fine_ID = f.Fine_ID
             JOIN BorrowedItem bi ON f.BorrowedItem_ID = bi.BorrowedItem_ID
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             JOIN Item i ON cp.Item_ID = i.Item_ID
             ORDER BY fp.Payment_Date DESC`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch payments', details: err.message }));
    }
}

module.exports = { getFees, payFee, getAllFees, getAllPayments };
