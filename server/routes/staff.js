const db = require('../db');

async function getAllStaff(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT p.Person_ID, p.First_name, p.Last_name, p.username, p.email,
                    p.phone_number, p.account_status, s.Staff_permissions
             FROM Person p
             JOIN Staff s ON p.Person_ID = s.Person_ID
             ORDER BY s.Staff_permissions ASC, p.Last_name ASC`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch staff', details: err.message }));
    }
}

async function updateStaffPermissions(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const personId = req.url.split('/')[3];
            const { staff_permissions } = JSON.parse(body);

            if (staff_permissions !== 1 && staff_permissions !== 2) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'staff_permissions must be 1 (admin) or 2 (staff)' }));
            }

            // prevent admin from demoting themselves
            if (req.user.person_id === parseInt(personId)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You cannot change your own permissions' }));
            }

            const [staffRows] = await db.query(
                `SELECT Person_ID FROM Staff WHERE Person_ID = ?`, [personId]
            );
            if (staffRows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Staff member not found' }));
            }

            await db.query(
                `UPDATE Staff SET Staff_permissions = ? WHERE Person_ID = ?`,
                [staff_permissions, personId]
            );

            res.writeHead(200);
            res.end(JSON.stringify({ message: 'Permissions updated successfully' }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to update permissions', details: err.message }));
        }
    });
}

module.exports = { getAllStaff, updateStaffPermissions };
