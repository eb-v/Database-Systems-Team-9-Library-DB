const db = require('../db');

async function getMyNotifications(req, res) {
    try {
        const personId = req.user.person_id;

        const [rows] = await db.query(
            `SELECT Notification_ID, Person_ID, type, message, is_read, created_at, Fine_ID, Hold_ID
             FROM notification
             WHERE Person_ID = ?
             ORDER BY created_at DESC`,
            [personId]
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Failed to fetch notifications',
            details: err.message
        }));
    }
}

module.exports = { getMyNotifications };