const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function register(req, res) {
    let body = '';

    // collect incoming request data in chunks, then process once fully received
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { first_name, last_name, email, username, password, phone_number, birthday } = JSON.parse(body);

            // hash the password before storing — bcrypt is one-way so the plain text password is never saved. The 10 is "salt rounds" — how many times it hashes. 10 is standard.
            const hashedPassword = await bcrypt.hash(password, 10);

            // insert into Person table role 1 = staff, role 2 = user/patron. account_status 1 = active. borrow_status 1 = allowed to borrow
            const [result] = await db.query(
                `INSERT INTO Person (First_name, Last_name, email, username, password, role, phone_number, birthday, account_status, borrow_status)
                 VALUES (?, ?, ?, ?, ?, 2, ?, ?, 1, 1)`,
                [first_name, last_name, email, username, hashedPassword, phone_number, birthday]
            );

            const personId = result.insertId;

            // also insert into User subtable — User_permissions 1 = standard user for now. this may expand later if specific permission levels are added
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

    // collect incoming request data in chunks, then process once fully received
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { username, password } = JSON.parse(body);

            // look up the person by username
            const [rows] = await db.query(
                `SELECT * FROM Person WHERE username = ?`,
                [username]
            );

            // if no user found, reject — we say "invalid credentials" instead of "user not found" so we don't hint to attackers whether a username exists
            if (rows.length === 0) {
                res.writeHead(401);
                return res.end(JSON.stringify({ error: 'Invalid credentials' }));
            }

            const person = rows[0];

            // check if account is active (account_status 1 = active, 0 = disabled)
            if (person.account_status !== 1) {
                res.writeHead(403);
                return res.end(JSON.stringify({ error: 'Account is disabled' }));
            }

            // compare submitted password against the stored bcrypt hash
            const passwordMatch = await bcrypt.compare(password, person.password);
            if (!passwordMatch) {
                res.writeHead(401);
                return res.end(JSON.stringify({ error: 'Invalid credentials' }));
            }

            // if the person is staff, get their Staff_permissions to determine if they are admin or regular staff. staff_permissions 1 = regular staff, 2 = admin
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

            // create a JWT containing the person's id, role, and staff_permissions (null for patrons). role 1 = staff, role 2 = user/patron. the token expires in 8 hours
            const token = jwt.sign(
                { person_id: person.Person_ID, role: person.role, staff_permissions },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.writeHead(200);
            res.end(JSON.stringify({ token, role: person.role, staff_permissions }));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Login failed', details: err.message }));
        }
    });
}

async function registerStaff(req, res) {
    let body = '';

    // collect incoming request data in chunks, then process once fully received
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { first_name, last_name, email, username, password, phone_number, birthday, staff_permissions } = JSON.parse(body);

            // hash the password before storing
            const hashedPassword = await bcrypt.hash(password, 10);

            // insert into Person table with role 1 (staff)
            const [result] = await db.query(
                `INSERT INTO Person (First_name, Last_name, email, username, password, role, phone_number, birthday, account_status, borrow_status)
                 VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1, 1)`,
                [first_name, last_name, email, username, hashedPassword, phone_number, birthday]
            );

            const personId = result.insertId;

            // insert into Staff subtable with the provided staff_permissions. staff_permissions 1 = regular staff, 2 = admin
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
