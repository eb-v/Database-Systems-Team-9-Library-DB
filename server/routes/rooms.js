const db = require('../db');

async function addRoom(req, res) {
    try {
        // insert a new room with status 1 (available)
        const [result] = await db.query(
            `INSERT INTO Room (Room_status) VALUES (1)`
        );

        res.writeHead(201);
        res.end(JSON.stringify({
            message: 'Room added successfully',
            room_id: result.insertId
        }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to add room', details: err.message }));
    }
}

module.exports = { addRoom };
