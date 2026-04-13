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

async function getNotificationSummary(req, res) {
    try {
        const personId = req.user.person_id;

        const [notificationRows] = await db.query(
            `SELECT Notification_ID, type, message, is_read, created_at
             FROM notification
             WHERE Person_ID = ? AND is_read = 0
             ORDER BY created_at DESC
             LIMIT 5`,
            [personId]
        );

        const [feeRows] = await db.query(
            `SELECT COUNT(*) AS unpaidFeeCount,
                    COALESCE(SUM(fee_amount), 0) AS unpaidFeeTotal
             FROM FeeOwed
             WHERE Person_ID = ? AND status = 1`,
            [personId]
        );

        const [holdRows] = await db.query(
            `SELECT COUNT(*) AS readyHoldCount
             FROM HoldItem
             WHERE Person_ID = ? AND hold_status = 2`,
            [personId]
        );

        const unpaidFeeCount = Number(feeRows[0].unpaidFeeCount || 0);
        const unpaidFeeTotal = Number(feeRows[0].unpaidFeeTotal || 0);
        const readyHoldCount = Number(holdRows[0].readyHoldCount || 0);

        const messages = [];

        if (unpaidFeeCount > 0) {
            messages.push(`You have ${unpaidFeeCount} unpaid fee(s) totaling $${unpaidFeeTotal.toFixed(2)}.`);
        }

        if (readyHoldCount > 0) {
            messages.push(`You have ${readyHoldCount} hold(s) ready for pickup.`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            hasNotifications: notificationRows.length > 0 || messages.length > 0,
            summaryMessages: messages,
            recentNotifications: notificationRows
        }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Failed to fetch notification summary',
            details: err.message
        }));
    }
}

async function markNotificationAsRead(req, res) {
    try {
        const url = new URL(req.url, 'http://localhost:3000');
        const parts = url.pathname.split('/');
        const notificationId = parts[3];
        const personId = req.user.person_id;

        if (!notificationId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                error: 'Notification ID is required'
            }));
        }

        const [result] = await db.query(
            `UPDATE notification
             SET is_read = 1
             WHERE Notification_ID = ? AND Person_ID = ?`,
            [notificationId, personId]
        );

        if (result.affectedRows === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                error: 'Notification not found'
            }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'Notification marked as read'
        }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Failed to mark notification as read',
            details: err.message
        }));
    }
}

async function markNotificationAsUnread(req, res) {
    try {
        const url = new URL(req.url, 'http://localhost:3000');
        const parts = url.pathname.split('/');
        // URL is /api/notifications/:id/unread — id is at index 3
        const notificationId = parts[3];
        const personId = req.user.person_id;

        if (!notificationId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Notification ID is required' }));
        }

        const [result] = await db.query(
            `UPDATE notification
             SET is_read = 0
             WHERE Notification_ID = ? AND Person_ID = ?`,
            [notificationId, personId]
        );

        if (result.affectedRows === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Notification not found' }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Notification marked as unread' }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to mark notification as unread', details: err.message }));
    }
}

async function markAllNotificationsAsRead(req, res) {
    try {
        const personId = req.user.person_id;

        await db.query(
            `UPDATE notification
             SET is_read = 1
             WHERE Person_ID = ? AND is_read = 0`,
            [personId]
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'All notifications marked as read'
        }));
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Failed to mark all notifications as read',
            details: err.message
        }));
    }
}

module.exports = {
    getMyNotifications,
    getNotificationSummary,
    markNotificationAsRead,
    markNotificationAsUnread,
    markAllNotificationsAsRead
};