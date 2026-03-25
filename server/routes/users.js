const db = require('../db');

async function lookupUser(req, res) {
    try {
        const url = new URL(req.url, 'http://localhost:3000');
        const searchBy = url.searchParams.get('searchBy');
        const value = url.searchParams.get('value');

        if (!searchBy || !value) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'searchBy and value are required' }));
        }

        // patrons can only look up by personId and only their own
        if (req.user.role === 2) {
            if (searchBy !== 'personId' || parseInt(value) !== req.user.person_id) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'Access denied' }));
            }
        }

        let query = '';
        let params = [value];

        if (searchBy === 'personId') {
            query = `
                SELECT Person_ID, First_name, Last_name, email, username,
                       account_status, borrow_status, role
                FROM Person
                WHERE Person_ID = ?
            `;
        } else if (searchBy === 'username') {
            query = `
                SELECT Person_ID, First_name, Last_name, email, username,
                       account_status, borrow_status, role
                FROM Person
                WHERE username = ?
            `;
        } else if (searchBy === 'email') {
            query = `
                SELECT Person_ID, First_name, Last_name, email, username,
                       account_status, borrow_status, role
                FROM Person
                WHERE email = ?
            `;
        } else {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Invalid search type' }));
        }

        const [personRows] = await db.query(query, params);

        if (personRows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'User not found' }));
        }

        const person = personRows[0];

        const [borrowRows] = await db.query(
            `SELECT COUNT(*) AS activeBorrows
             FROM BorrowedItem bi
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             WHERE bi.Person_ID = ? AND cp.Copy_status = 2`,
            [person.Person_ID]
        );

        const [feeRows] = await db.query(
            `SELECT 
                COUNT(*) AS unpaidFeeCount,
                COALESCE(SUM(fee_amount), 0) AS unpaidFeeTotal
             FROM FeeOwed
             WHERE Person_ID = ? AND status = 1`,
            [person.Person_ID]
        );

        const [holdRows] = await db.query(
            `SELECT COUNT(*) AS activeHolds
             FROM HoldItem
             WHERE Person_ID = ? AND hold_status IN (1, 2)`,
            [person.Person_ID]
        );

        res.writeHead(200);
        res.end(JSON.stringify({
            person,
            summary: {
                activeBorrows: borrowRows[0].activeBorrows,
                unpaidFeeCount: feeRows[0].unpaidFeeCount,
                unpaidFeeTotal: feeRows[0].unpaidFeeTotal,
                activeHolds: holdRows[0].activeHolds,
            }
        }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to look up user', details: err.message }));
    }
}

module.exports = { lookupUser };