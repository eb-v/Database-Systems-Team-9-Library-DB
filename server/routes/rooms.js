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

const OPEN_HOUR = 8;   // 8:00 AM
const CLOSE_HOUR = 21; // 9:00 PM

// mark any reservations whose end time has passed as expired (status 2)
async function expireReservations(personId) {
    await db.query(
        `UPDATE RoomReservation
         SET reservation_status = 2
         WHERE Person_ID = ? AND reservation_status = 1
         AND DATE_ADD(start_time, INTERVAL TIME_TO_SEC(length) SECOND) <= ?`,
        [personId, new Date()]
    );
}

async function makeReservation(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { person_id, start_time, length } = JSON.parse(body);

            // can only make a reservation on own behalf
            if (req.user.person_id !== parseInt(person_id)) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'You can only make reservations on your own behalf' }));
            }

            // patrons max 4 hours, staff can book up to the full operating day
            const isPatron = req.user.role === 2;
            const maxAllowed = isPatron ? 4 : (CLOSE_HOUR - OPEN_HOUR);
            if (!Number.isInteger(length) || length < 1 || length > maxAllowed) {
                res.writeHead(400);
                return res.end(JSON.stringify({
                    error: isPatron
                        ? 'Patrons can reserve a room for up to 4 hours'
                        : `Reservation length must be between 1 and ${maxAllowed} hours`
                }));
            }

            const startDate = new Date(start_time);

            // start time must be on the hour (no partial-hour slots)
            if (startDate.getMinutes() !== 0 || startDate.getSeconds() !== 0) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Reservations must start on the hour (e.g. 9:00, 10:00)' }));
            }

            // start time must be within operating hours
            const startHour = startDate.getHours();
            if (startHour < OPEN_HOUR || startHour >= CLOSE_HOUR) {
                res.writeHead(400);
                return res.end(JSON.stringify({
                    error: `Reservations can only start between ${OPEN_HOUR}:00 AM and ${CLOSE_HOUR - 1}:00 PM`
                }));
            }

            // end time must not exceed closing time
            if (startHour + length > CLOSE_HOUR) {
                res.writeHead(400);
                return res.end(JSON.stringify({
                    error: `Reservation would end after closing time (${CLOSE_HOUR}:00). Please choose a shorter duration or earlier start time.`
                }));
            }

            // start time must not be in the past
            if (startDate < new Date()) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Reservation start time cannot be in the past' }));
            }

            // expire any reservations whose end time has passed
            await expireReservations(person_id);

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

            const endDate = new Date(startDate.getTime() + length * 60 * 60 * 1000);

            // format datetime using local time to avoid UTC offset in responses
            const formatDatetime = (d) => {
                const pad = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            };

            // find the first available room for the requested time slot
            const [availableRooms] = await db.query(
                `SELECT Room_ID FROM Room
                 WHERE Room_status = 1
                 AND Room_ID NOT IN (
                     SELECT Room_ID FROM RoomReservation
                     WHERE reservation_status = 1
                     AND start_time < ? AND DATE_ADD(start_time, INTERVAL TIME_TO_SEC(length) SECOND) > ?
                 )
                 LIMIT 1`,
                [endDate, startDate]
            );

            if (availableRooms.length === 0) {
                // no rooms available — find the next available time slot
                const [endTimes] = await db.query(
                    `SELECT DISTINCT DATE_ADD(start_time, INTERVAL TIME_TO_SEC(length) SECOND) as end_time
                     FROM RoomReservation
                     WHERE reservation_status = 1
                     AND DATE_ADD(start_time, INTERVAL TIME_TO_SEC(length) SECOND) > ?
                     ORDER BY end_time ASC`,
                    [startDate]
                );

                let nextAvailable = null;
                for (const row of endTimes) {
                    const candidateStart = new Date(row.end_time);
                    const candidateEnd = new Date(candidateStart.getTime() + length * 60 * 60 * 1000);

                    const [freeRooms] = await db.query(
                        `SELECT Room_ID FROM Room
                         WHERE Room_status = 1
                         AND Room_ID NOT IN (
                             SELECT Room_ID FROM RoomReservation
                             WHERE reservation_status = 1
                             AND start_time < ? AND DATE_ADD(start_time, INTERVAL TIME_TO_SEC(length) SECOND) > ?
                         )
                         LIMIT 1`,
                        [candidateEnd, candidateStart]
                    );

                    if (freeRooms.length > 0) {
                        nextAvailable = candidateStart;
                        break;
                    }
                }

                res.writeHead(400);
                return res.end(JSON.stringify({
                    error: 'No rooms available for the requested time slot',
                    next_available: nextAvailable ? formatDatetime(nextAvailable) : null
                }));
            }

            const assignedRoomId = availableRooms[0].Room_ID;

            // format length as TIME string for MySQL (e.g. 2 hours -> '02:00:00')
            const lengthStr = `${String(length).padStart(2, '0')}:00:00`;

            const [result] = await db.query(
                `INSERT INTO RoomReservation (start_time, length, reservation_status, Person_ID, Room_ID)
                 VALUES (?, ?, 1, ?, ?)`,
                [startDate, lengthStr, person_id, assignedRoomId]
            );

            res.writeHead(201);
            res.end(JSON.stringify({
                message: 'Reservation made successfully',
                reservation_id: result.insertId,
                room_id: assignedRoomId,
                start_time: formatDatetime(startDate),
                end_time: formatDatetime(endDate),
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

        await expireReservations(personId);

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

async function cancelReservation(req, res) {
    try {
        const reservationId = req.url.split('/')[3];

        // look up the reservation
        const [reservationRows] = await db.query(
            `SELECT * FROM RoomReservation WHERE Reservation_ID = ?`,
            [reservationId]
        );
        if (reservationRows.length === 0) {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'Reservation not found' }));
        }

        const reservation = reservationRows[0];

        // anyone can only cancel their own reservation
        if (req.user.person_id !== parseInt(reservation.Person_ID)) {
            res.writeHead(403);
            return res.end(JSON.stringify({ error: 'You can only cancel your own reservations' }));
        }

        if (reservation.reservation_status === 0) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Reservation is already cancelled' }));
        }

        // soft delete
        await db.query(
            `UPDATE RoomReservation SET reservation_status = 0 WHERE Reservation_ID = ?`,
            [reservationId]
        );

        res.writeHead(200);
        res.end(JSON.stringify({ message: 'Reservation cancelled successfully' }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to cancel reservation', details: err.message }));
    }
}

async function getAvailableSlots(req, res) {
    try {
        const url = new URL(req.url, 'http://localhost');
        const date = url.searchParams.get('date');   // e.g. "2026-04-09"
        const length = parseInt(url.searchParams.get('length') || '1');

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'date parameter required (YYYY-MM-DD)' }));
        }
        if (!Number.isInteger(length) || length < 1 || length > 8) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'length must be between 1 and 8' }));
        }

        const now = new Date();
        const availableSlots = [];

        for (let hour = OPEN_HOUR; hour + length <= CLOSE_HOUR; hour++) {
            const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
            const slotEnd = new Date(slotStart.getTime() + length * 60 * 60 * 1000);

            // skip slots already in the past
            if (slotEnd <= now) continue;

            const [freeRooms] = await db.query(
                `SELECT Room_ID FROM Room
                 WHERE Room_status = 1
                 AND Room_ID NOT IN (
                     SELECT Room_ID FROM RoomReservation
                     WHERE reservation_status = 1
                     AND start_time < ? AND DATE_ADD(start_time, INTERVAL TIME_TO_SEC(length) SECOND) > ?
                 )
                 LIMIT 1`,
                [slotEnd, slotStart]
            );

            if (freeRooms.length > 0) {
                availableSlots.push(hour);
            }
        }

        res.writeHead(200);
        res.end(JSON.stringify({ available_slots: availableSlots }));
    } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to fetch available slots', details: err.message }));
    }
}

module.exports = { addRoom, makeReservation, getReservationsForPerson, getAllReservations, cancelReservation, getAvailableSlots };
