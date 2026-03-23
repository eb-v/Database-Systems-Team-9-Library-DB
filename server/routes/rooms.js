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

async function makeReservation(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { person_id, room_id, start_time, length } = JSON.parse(body);

            // can only make a reservation on own behalf
            if (req.user.person_id !== parseInt(person_id)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only make reservations on your own behalf' }));
            }

            // validate length is between 1 and 8 hours
            if (!Number.isInteger(length) || length < 1 || length > 8) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Reservation length must be between 1 and 8 hours' }));
            }

            // check room exists and is available
            const [roomRows] = await db.query(
                `SELECT Room_ID, Room_status FROM Room WHERE Room_ID = ?`,
                [room_id]
            );
            if (roomRows.length === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Room not found' }));
            }
            if (roomRows[0].Room_status !== 1) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Room is not available' }));
            }

            // check patron doesn't already have an active reservation
            const [existingReservation] = await db.query(
                `SELECT Reservation_ID FROM RoomReservation
                 WHERE Person_ID = ? AND reservation_status = 1`,
                [person_id]
            );
            if (existingReservation.length > 0) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'You already have an active reservation' }));
            }

            // calculate end time based on start_time + length in hours
            const startDate = new Date(start_time);
            const endDate = new Date(startDate.getTime() + length * 60 * 60 * 1000);

            // check for overlapping reservations on this room
            const [overlaps] = await db.query(
                `SELECT Reservation_ID FROM RoomReservation
                 WHERE Room_ID = ? AND reservation_status = 1
                 AND start_time < ? AND DATE_ADD(start_time, INTERVAL TIME_TO_SEC(length) SECOND) > ?`,
                [room_id, endDate, startDate]
            );
            if (overlaps.length > 0) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Room is already booked during that time' }));
            }

            // format length as TIME string for MySQL (e.g. 2 hours -> '02:00:00')
            const lengthStr = `${String(length).padStart(2, '0')}:00:00`;

            const [result] = await db.query(
                `INSERT INTO RoomReservation (start_time, length, reservation_status, Person_ID, Room_ID)
                 VALUES (?, ?, 1, ?, ?)`,
                [startDate, lengthStr, person_id, room_id]
            );

            res.writeHead(201);
            res.end(JSON.stringify({
                message: 'Reservation made successfully',
                reservation_id: result.insertId,
                start_time: startDate,
                end_time: endDate,
                length_hours: length
            }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to make reservation', details: err.message }));
        }
    });
}

async function getReservationsForPerson(req, res) {
    try {
        const personId = req.url.split('/')[3];

        // patrons can only view their own reservations
        if (req.user.role === 2 && req.user.person_id !== parseInt(personId)) {
            res.writeHead(403);
            return res.end(JSON.stringify({ error: 'Access denied' }));
        }

        const [personRows] = await db.query(`SELECT Person_ID FROM Person WHERE Person_ID = ?`, [personId]);
        if (personRows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'Person not found' }));
        }

        // get all reservations for this person
        const [rows] = await db.query(
            `SELECT
                r.Reservation_ID, r.start_time, r.length, r.reservation_status,
                r.Room_ID, r.Person_ID
             FROM RoomReservation r
             WHERE r.Person_ID = ?
             ORDER BY r.start_time DESC`,
            [personId]
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch reservations', details: err.message }));
    }
}

async function getAllReservations(req, res) {
    try {
        // get all reservations across all patrons
        const [rows] = await db.query(
            `SELECT
                r.Reservation_ID, r.start_time, r.length, r.reservation_status,
                r.Room_ID, r.Person_ID, p.First_name, p.Last_name
             FROM RoomReservation r
             JOIN Person p ON r.Person_ID = p.Person_ID
             ORDER BY r.start_time DESC`
        );

        res.writeHead(200);
        res.end(JSON.stringify(rows));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch all reservations', details: err.message }));
    }
}

module.exports = { addRoom, makeReservation, getReservationsForPerson, getAllReservations };
