const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function register(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);

    req.on('end', async () => {
        try {
            const { first_name, last_name, email, username, password, phone_number, birthday } = JSON.parse(body);

            const hashedPassword = await bcrypt.hash(password, 10);

            const [result] = await db.query(
                `INSERT INTO Person (
                    First_name,
                    Last_name,
                    email,
                    username,
                    password,
                    role,
                    phone_number,
                    birthday,
                    account_status,
                    borrow_status
                )
                 VALUES (?, ?, ?, ?, ?, 2, ?, ?, 1, 1)`,
                [first_name, last_name, email, username, hashedPassword, phone_number, birthday]
            );

            const personId = result.insertId;

            await db.query(
                `INSERT INTO User (Person_ID, User_permissions) VALUES (?, 1)`,
                [personId]
            );

            res.writeHead(201);
            res.end(JSON.stringify({ message: 'User registered successfully' }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Registration failed', details: err.message }));
        }
    });
}

async function login(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);

    req.on('end', async () => {
        try {
            const { username, password } = JSON.parse(body);

            const [rows] = await db.query(
                `SELECT * FROM Person WHERE username = ?`,
                [username]
            );

            if (rows.length === 0) {
                res.writeHead(401);
                return res.end(JSON.stringify({ error: 'Invalid credentials' }));
            }

            const person = rows[0];

            if (person.account_status !== 1) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'Account is disabled' }));
            }

            const passwordMatch = await bcrypt.compare(password, person.password);

            if (!passwordMatch) {
                res.writeHead(401);
                return res.end(JSON.stringify({ error: 'Invalid credentials' }));
            }

            let staff_permissions = null;

            if (person.role === 1) {
                const [staffRows] = await db.query(
                    `SELECT Staff_permissions FROM Staff WHERE Person_ID = ?`,
                    [person.Person_ID]
                );

                if (staffRows.length > 0) {
                    staff_permissions = staffRows[0].Staff_permissions;
                }
            }

            const token = jwt.sign(
                {
                    person_id: person.Person_ID,
                    role: person.role,
                    staff_permissions
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.writeHead(200);
            res.end(JSON.stringify({
                token,
                role: person.role,
                staff_permissions,
                person_id: person.Person_ID
            }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Login failed', details: err.message }));
        }
    });
}

async function registerStaff(req, res) {
    let body = '';

    req.on('data', chunk => body += chunk);

    req.on('end', async () => {
        try {
            const {
                first_name,
                last_name,
                email,
                username,
                password,
                phone_number,
                birthday,
                staff_permissions
            } = JSON.parse(body);

            const hashedPassword = await bcrypt.hash(password, 10);

            const [result] = await db.query(
                `INSERT INTO Person (
                    First_name,
                    Last_name,
                    email,
                    username,
                    password,
                    role,
                    phone_number,
                    birthday,
                    account_status,
                    borrow_status
                )
                 VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1, 1)`,
                [first_name, last_name, email, username, hashedPassword, phone_number, birthday]
            );

            const personId = result.insertId;

            await db.query(
                `INSERT INTO Staff (Person_ID, Staff_permissions) VALUES (?, ?)`,
                [personId, staff_permissions]
            );

            res.writeHead(201);
            res.end(JSON.stringify({ message: 'Staff registered successfully' }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Staff registration failed', details: err.message }));
        }
    });
}

module.exports = { register, login, registerStaff };