const db = require('../db');

const SEARCH_RESULT_FIELDS = `
    Person_ID,
    First_name,
    Last_name,
    email,
    username,
    phone_number,
    birthday,
    street_address,
    zip_code,
    account_status,
    borrow_status,
    role
`;

const DETAIL_FIELDS = SEARCH_RESULT_FIELDS;

function writeJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', () => {
            if (!body.trim()) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (err) {
                const parseError = new Error('Invalid JSON body');
                parseError.statusCode = 400;
                reject(parseError);
            }
        });

        req.on('error', reject);
    });
}

function normalizeOptionalText(value) {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
}

function normalizeRequiredText(value, fieldLabel) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        const err = new Error(`${fieldLabel} is required`);
        err.statusCode = 400;
        throw err;
    }
    return trimmed;
}

function normalizeDateValue(value) {
    if (!value) return null;
    return String(value).split('T')[0];
}

function normalizeBinaryStatus(value, fieldName) {
    const parsed = Number(value);
    if (parsed !== 0 && parsed !== 1) {
        const err = new Error(`${fieldName} must be 0 or 1`);
        err.statusCode = 400;
        throw err;
    }
    return parsed;
}

async function ensureUsernameAvailable(username, personId) {
    const [existingRows] = await db.query(
        `SELECT Person_ID
         FROM Person
         WHERE username = ? AND Person_ID != ?`,
        [username, personId]
    );

    if (existingRows.length > 0) {
        const err = new Error('Username is already taken');
        err.statusCode = 409;
        throw err;
    }
}

async function getPersonById(personId) {
    const [personRows] = await db.query(
        `SELECT ${DETAIL_FIELDS}
         FROM Person
         WHERE Person_ID = ?`,
        [personId]
    );

    return personRows[0] || null;
}

async function buildUserSummary(personId) {
    const [borrowRows] = await db.query(
        `SELECT COUNT(DISTINCT bi.Copy_ID) AS activeBorrows
         FROM BorrowedItem bi
         JOIN Copy cp ON bi.Copy_ID = cp.Copy_ID
         WHERE bi.Person_ID = ? AND cp.Copy_status = 2`,
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
        `SELECT COUNT(*) AS activeHolds
         FROM HoldItem
         WHERE Person_ID = ? AND hold_status IN (1, 2)`,
        [personId]
    );

    const [reservationRows] = await db.query(
        `SELECT
            COUNT(*) AS activeReservations,
            MIN(start_time) AS nextReservationStart
         FROM RoomReservation
         WHERE Person_ID = ?
           AND reservation_status = 1
           AND DATE_ADD(start_time, INTERVAL TIME_TO_SEC(length) SECOND) > NOW()`,
        [personId]
    );

    return {
        activeBorrows: borrowRows[0]?.activeBorrows || 0,
        unpaidFeeCount: feeRows[0]?.unpaidFeeCount || 0,
        unpaidFeeTotal: feeRows[0]?.unpaidFeeTotal || 0,
        activeHolds: holdRows[0]?.activeHolds || 0,
        activeReservations: reservationRows[0]?.activeReservations || 0,
        nextReservationStart: reservationRows[0]?.nextReservationStart || null,
    };
}

function buildSearchFilter(searchBy, rawValue) {
    const value = String(rawValue || '').trim();
    const like = `%${value}%`;

    switch (searchBy) {
        case 'all':
            return {
                clause: `
                    (
                        First_name LIKE ?
                        OR Last_name LIKE ?
                        OR CONCAT(First_name, ' ', Last_name) LIKE ?
                        OR username LIKE ?
                        OR email LIKE ?
                        OR phone_number LIKE ?
                        OR CAST(Person_ID AS CHAR) LIKE ?
                    )
                `,
                params: [like, like, like, like, like, like, like],
            };
        case 'name':
            return {
                clause: `
                    (
                        First_name LIKE ?
                        OR Last_name LIKE ?
                        OR CONCAT(First_name, ' ', Last_name) LIKE ?
                    )
                `,
                params: [like, like, like],
            };
        case 'firstName':
            return { clause: `First_name LIKE ?`, params: [like] };
        case 'lastName':
            return { clause: `Last_name LIKE ?`, params: [like] };
        case 'username':
            return { clause: `username LIKE ?`, params: [like] };
        case 'email':
            return { clause: `email LIKE ?`, params: [like] };
        case 'phone':
            return { clause: `phone_number LIKE ?`, params: [like] };
        case 'accountStatus': {
            if (value === '1' || /^active$/i.test(value)) {
                return { clause: `account_status = 1`, params: [] };
            }
            if (value === '0' || /^(inactive|disabled)$/i.test(value)) {
                return { clause: `account_status = 0`, params: [] };
            }
            const err = new Error('Invalid account status filter');
            err.statusCode = 400;
            throw err;
        }
        case 'borrowStatus': {
            if (value === '1' || /^(good|good standing|allowed)$/i.test(value)) {
                return { clause: `borrow_status = 1`, params: [] };
            }
            if (value === '0' || /^(restricted|blocked)$/i.test(value)) {
                return { clause: `borrow_status = 0`, params: [] };
            }
            const err = new Error('Invalid borrow status filter');
            err.statusCode = 400;
            throw err;
        }
        default:
            const err = new Error('Invalid search type');
            err.statusCode = 400;
            throw err;
    }
}

async function lookupUser(req, res) {
    try {
        const url = new URL(req.url, 'http://localhost:3000');
        const searchBy = url.searchParams.get('searchBy');
        const value = url.searchParams.get('value');

        if (!searchBy || value == null || !String(value).trim()) {
            return writeJson(res, 400, { error: 'searchBy and value are required' });
        }

        if (req.user.role === 2) {
            if (searchBy !== 'personId' || parseInt(value, 10) !== req.user.person_id) {
                return writeJson(res, 403, { error: 'Access denied' });
            }
        }

        if (searchBy === 'personId') {
            const personId = parseInt(value, 10);

            if (!Number.isInteger(personId)) {
                return writeJson(res, 400, { error: 'personId must be a number' });
            }

            const person = await getPersonById(personId);

            if (!person) {
                return writeJson(res, 404, { error: 'User not found' });
            }

            const summary = await buildUserSummary(person.Person_ID);

            return writeJson(res, 200, { person, summary });
        }

        const { clause, params } = buildSearchFilter(searchBy, value);
        const [rows] = await db.query(
            `SELECT ${SEARCH_RESULT_FIELDS}
             FROM Person
             WHERE ${clause}
             ORDER BY Last_name ASC, First_name ASC, Person_ID ASC
             LIMIT 100`,
            params
        );

        if (rows.length === 0) {
            return writeJson(res, 404, { error: 'No users found' });
        }

        return writeJson(res, 200, { results: rows });
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return writeJson(res, statusCode, {
            error: statusCode === 500 ? 'Failed to look up user' : err.message,
            details: statusCode === 500 ? err.message : undefined,
        });
    }
}

async function updateOwnUserProfile(req, res) {
    try {
        const data = await readJsonBody(req);
        const personId = req.user.person_id;

        const firstName = normalizeRequiredText(data.firstName, 'First name');
        const lastName = normalizeRequiredText(data.lastName, 'Last name');
        const username = normalizeRequiredText(data.username, 'Username');
        const email = normalizeRequiredText(data.email, 'Email');
        const phoneNumber = normalizeOptionalText(data.phoneNumber);
        const birthday = normalizeDateValue(data.birthday);
        const streetAddress = normalizeOptionalText(data.streetAddress);
        const zipCode = normalizeOptionalText(data.zipCode);

        await ensureUsernameAvailable(username, personId);

        await db.query(
            `UPDATE Person
             SET First_name = ?,
                 Last_name = ?,
                 username = ?,
                 email = ?,
                 phone_number = ?,
                 birthday = ?,
                 street_address = ?,
                 zip_code = ?
             WHERE Person_ID = ?`,
            [
                firstName,
                lastName,
                username,
                email,
                phoneNumber,
                birthday,
                streetAddress,
                zipCode,
                personId,
            ]
        );

        return writeJson(res, 200, { message: 'Profile updated successfully' });
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return writeJson(res, statusCode, {
            error: statusCode === 500 ? 'Failed to update profile' : err.message,
            details: statusCode === 500 ? err.message : undefined,
        });
    }
}

async function updatePatronProfile(req, res) {
    try {
        const personId = parseInt(req.url.split('/')[3], 10);

        if (!Number.isInteger(personId)) {
            return writeJson(res, 400, { error: 'Invalid user id' });
        }

        const [personRows] = await db.query(
            `SELECT Person_ID, role
             FROM Person
             WHERE Person_ID = ?`,
            [personId]
        );

        if (personRows.length === 0) {
            return writeJson(res, 404, { error: 'User not found' });
        }

        if (Number(personRows[0].role) !== 2) {
            return writeJson(res, 400, { error: 'Only patron accounts can be updated from this page' });
        }

        const data = await readJsonBody(req);
        const firstName = normalizeRequiredText(data.firstName, 'First name');
        const lastName = normalizeRequiredText(data.lastName, 'Last name');
        const username = normalizeRequiredText(data.username, 'Username');
        const email = normalizeRequiredText(data.email, 'Email');
        const phoneNumber = normalizeOptionalText(data.phoneNumber);
        const birthday = normalizeDateValue(data.birthday);
        const streetAddress = normalizeOptionalText(data.streetAddress);
        const zipCode = normalizeOptionalText(data.zipCode);
        const accountStatus = normalizeBinaryStatus(data.accountStatus, 'account_status');
        const borrowStatus = normalizeBinaryStatus(data.borrowStatus, 'borrow_status');

        await ensureUsernameAvailable(username, personId);

        await db.query(
            `UPDATE Person
             SET First_name = ?,
                 Last_name = ?,
                 username = ?,
                 email = ?,
                 phone_number = ?,
                 birthday = ?,
                 street_address = ?,
                 zip_code = ?,
                 account_status = ?,
                 borrow_status = ?
             WHERE Person_ID = ?`,
            [
                firstName,
                lastName,
                username,
                email,
                phoneNumber,
                birthday,
                streetAddress,
                zipCode,
                accountStatus,
                borrowStatus,
                personId,
            ]
        );

        const person = await getPersonById(personId);
        const summary = await buildUserSummary(personId);

        return writeJson(res, 200, {
            message: 'User updated successfully',
            person,
            summary,
        });
    } catch (err) {
        const statusCode = err.statusCode || 500;
        return writeJson(res, statusCode, {
            error: statusCode === 500 ? 'Failed to update user' : err.message,
            details: statusCode === 500 ? err.message : undefined,
        });
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
            return writeJson(res, 404, { error: 'User not found' });
        }

        return writeJson(res, 200, { message: 'Account deactivated successfully' });
    } catch (err) {
        return writeJson(res, 500, {
            error: 'Failed to deactivate account',
            details: err.message,
        });
    }
}

async function listUsers(req, res) {
    try {
        const [rows] = await db.query(
            `SELECT ${SEARCH_RESULT_FIELDS}
             FROM Person
             ORDER BY Last_name ASC, First_name ASC, Person_ID ASC`
        );

        return writeJson(res, 200, rows);
    } catch (err) {
        return writeJson(res, 500, {
            error: 'Failed to fetch users',
            details: err.message,
        });
    }
}

module.exports = {
    lookupUser,
    updateOwnUserProfile,
    updatePatronProfile,
    deactivateOwnAccount,
    listUsers,
};
