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
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Access denied' }));
            }
        }

        // multi-field search — returns a list to pick from
        if (searchBy === 'firstName' || searchBy === 'lastName' || searchBy === 'all') {
            let query, queryParams;

            if (searchBy === 'all') {
                query = `
                    SELECT Person_ID, First_name, Last_name, email, username
                    FROM Person
                    WHERE First_name   LIKE ?
                       OR Last_name    LIKE ?
                       OR username     LIKE ?
                       OR email        LIKE ?
                       OR phone_number LIKE ?
                       OR CAST(Person_ID AS CHAR) LIKE ?
                    ORDER BY Last_name, First_name
                    LIMIT 50
                `;
                const like = `%${value}%`;
                queryParams = [like, like, like, like, like, like];
            } else {
                const column = searchBy === 'firstName' ? 'First_name' : 'Last_name';
                query = `
                    SELECT Person_ID, First_name, Last_name, email, username
                    FROM Person
                    WHERE ${column} LIKE ?
                    ORDER BY Last_name, First_name
                    LIMIT 50
                `;
                queryParams = [`%${value}%`];
            }

            const [rows] = await db.query(query, queryParams);

            if (rows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'No users found' }));
            }

            res.writeHead(200);
            return res.end(JSON.stringify({ results: rows }));
        }

        let query = '';
        let params = [value];

        if (searchBy === 'personId') {
            query = `
                SELECT Person_ID, First_name, Last_name, email, username,
                       phone_number, birthday, street_address, zip_code,
                       account_status, borrow_status, role
                FROM Person
                WHERE Person_ID = ?
            `;
        } else if (searchBy === 'username') {
            query = `
                SELECT Person_ID, First_name, Last_name, email, username,
                       phone_number, birthday, street_address, zip_code,
                       account_status, borrow_status, role
                FROM Person
                WHERE username = ?
            `;
        } else if (searchBy === 'email') {
            query = `
                SELECT Person_ID, First_name, Last_name, email, username,
                       phone_number, birthday, street_address, zip_code,
                       account_status, borrow_status, role
                FROM Person
                WHERE email = ?
            `;
        } else if (searchBy === 'phone') {
            query = `
                SELECT Person_ID, First_name, Last_name, email, username,
                       phone_number, account_status, borrow_status, role
                FROM Person
                WHERE phone_number = ?
            `;
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Invalid search type' }));
        }

        const [personRows] = await db.query(query, params);

        if (personRows.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'User not found' }));
        }

        const person = personRows[0];

        const [borrowRows] = await db.query(
            `SELECT COUNT(DISTINCT bi.Copy_ID) AS activeBorrows
             FROM BorrowedItem bi
             JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
             WHERE bi.Person_ID = ? AND cp.Copy_status = 2`,
            [person.Person_ID]
        );

        const [feeRows] = await db.query(
            `SELECT COUNT(*) AS unpaidFeeCount,
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

        res.writeHead(200, { 'Content-Type': 'application/json' });
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
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to look up user', details: err.message }));
    }
}

async function updateUserProfile(req, res) {
    try {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);

                const {
                    firstName,
                    lastName,
                    username,
                    email,
                    phoneNumber,
                    birthday,
                    streetAddress,
                    zipCode
                } = data;

                const personId = req.user.person_id;
                const formattedBirthday = birthday
                    ? String(birthday).split("T")[0]
                    : null;

                const query = `
                    UPDATE Person
                    SET First_name = ?,
                        Last_name = ?,
                        username = ?,
                        email = ?,
                        phone_number = ?,
                        birthday = ?,
                        street_address = ?,
                        zip_code = ?
                    WHERE Person_ID = ?
                `;

                await db.query(query, [
                    firstName,
                    lastName,
                    username,
                    email,
                    phoneNumber || null,
                    formattedBirthday,
                    streetAddress || null,
                    zipCode || null,
                    personId
                ]);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    message: 'Profile updated successfully'
                }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Failed to update profile',
                    details: err.message
                }));
            }
        });
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Failed to update profile',
            details: err.message
        }));
    }
}

async function deactivateOwnAccount(req, res) {
    try {
        const personId = req.user.person_id;

        const [result] = await db.query(
            `UPDATE Person
             SET account_status = 0
             WHERE Person_ID = ?`,
            [personId]
        );

        if (result.affectedRows === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                error: 'User not found'
            }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'Account deactivated successfully'
        }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Failed to deactivate account',
            details: err.message
        }));
    }
}

async function listUsers(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT Person_ID, First_name, Last_name, email, username
             FROM Person
             WHERE role = 2
             ORDER BY Person_ID DESC
             LIMIT 50`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch users', details: err.message }));
    }
}

module.exports = {
    lookupUser,
    updateUserProfile,
    deactivateOwnAccount,
    listUsers
};