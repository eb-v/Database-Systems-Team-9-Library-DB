const http = require('http');
const PORT = 3000;
const db = require('./db');
const auth = require('./routes/auth');
const items = require('./routes/items');
const borrow = require('./routes/borrow');
const fees = require('./routes/fees');
const holds = require('./routes/holds');
const rooms = require('./routes/rooms');
const users = require('./routes/users');
const staff = require('./routes/staff');
const reports = require('./routes/reports');

const { verifyToken, requireRole, requireAdmin } = require('./middleware/auth');

const server = http.createServer((req, res) => {
    // allow requests from any origin (needed for React frontend on a different port)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // handle CORS preflight requests — browser sends OPTIONS before every real request to check if it's allowed to talk to this server
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // test route — checks if server and database are connected
    if (req.method === 'GET' && req.url === '/api/test') {
        db.query('SELECT 1')
            .then(() => {
                res.writeHead(200);
                res.end(JSON.stringify({ message: 'Server and database are running' }));
            })
            .catch((err) => {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Database connection failed', details: err.message }));
            });

    // auth routes — public, no token needed
    } else if (req.method === 'POST' && req.url === '/api/auth/register') {
        auth.register(req, res);
    } else if (req.method === 'POST' && req.url === '/api/auth/login') {
        auth.login(req, res);

    // example protected route — any logged in user can access
    } else if (req.method === 'GET' && req.url === '/api/protected') {
        verifyToken(req, res, () => {
            res.writeHead(200);
            res.end(JSON.stringify({ message: `Hello person ${req.user.person_id}, your role is ${req.user.role}` }));
        });

    // example staff-only route
    } else if (req.method === 'GET' && req.url === '/api/staff-only') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                res.writeHead(200);
                res.end(JSON.stringify({ message: 'Welcome, staff member' }));
            });
        });

    // any logged-in user can browse the item catalog
    } else if (req.method === 'GET' && req.url.startsWith('/api/items') && !req.url.startsWith('/api/items/')) {
        verifyToken(req, res, () => {
            items.getItems(req, res);
        });

    // staff-only route — soft delete a specific copy
    } else if (req.method === 'DELETE' && req.url.startsWith('/api/items/')) {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                items.deleteCopy(req, res);
            });
        });
    
    // staff-only — list all patrons (most recent first)
    } else if (req.method === 'GET' && req.url === '/api/users') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                users.listUsers(req, res);
            });
        });

    // staff-only — look up a user and view summary info
    // any logged-in user can look up a person — patrons restricted to their own record
    } else if (req.method === 'GET' && req.url.startsWith('/api/users/lookup')) {
        verifyToken(req, res, () => {
            users.lookupUser(req, res);
        });

    // staff-only route — edit an existing item
    } else if (req.method === 'PUT' && req.url.startsWith('/api/items/')) {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                items.updateItem(req, res);
            });
        });

    // any logged-in user can get a single item's full details
    } else if (req.method === 'GET' && req.url.startsWith('/api/items/')) {
        verifyToken(req, res, () => {
            items.getItemById(req, res);
        });

    // staff-only route — add a new item to the library
    } else if (req.method === 'POST' && req.url === '/api/items') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                items.addItem(req, res);
            });
        });

    // staff-only — view full borrow history across all patrons
    } else if (req.method === 'GET' && req.url === '/api/borrow') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                borrow.getAllBorrows(req, res);
            });
        });

    // any logged-in user can view borrow history for a specific person (patrons restricted to own records)
    } else if (req.method === 'GET' && req.url.startsWith('/api/borrow/')) {
        verifyToken(req, res, () => {
            borrow.getBorrowedItems(req, res);
        });

    // any logged-in user can borrow an item on their own behalf
    } else if (req.method === 'POST' && req.url === '/api/borrow') {
        verifyToken(req, res, () => {
            borrow.borrowItem(req, res);
        });

    // any logged-in user can return their own borrowed item
    } else if (req.method === 'POST' && req.url === '/api/borrow/return') {
        verifyToken(req, res, () => {
            borrow.returnItem(req, res);
        });

    // staff-only — view all payment records
    } else if (req.method === 'GET' && req.url === '/api/fees/payments') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                fees.getAllPayments(req, res);
            });
        });

    // staff-only — view all fees across all patrons
    } else if (req.method === 'GET' && req.url === '/api/fees') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                fees.getAllFees(req, res);
            });
        });

    // any logged-in user can view their own fees, staff can view anyone's
    } else if (req.method === 'GET' && req.url.startsWith('/api/fees/')) {
        verifyToken(req, res, () => {
            fees.getFees(req, res);
        });

    // any logged-in user can pay their own fees
    } else if (req.method === 'POST' && req.url === '/api/fees/pay') {
        verifyToken(req, res, () => {
            fees.payFee(req, res);
        });

    // staff-only — view all reservations
    } else if (req.method === 'GET' && req.url === '/api/reservations') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                rooms.getAllReservations(req, res);
            });
        });

    // any logged-in user can query available time slots for a date + duration
    } else if (req.method === 'GET' && req.url.startsWith('/api/reservations/available')) {
        verifyToken(req, res, () => {
            rooms.getAvailableSlots(req, res);
        });

    // any logged-in user can cancel their own reservation
    } else if (req.method === 'DELETE' && req.url.startsWith('/api/reservations/')) {
        verifyToken(req, res, () => {
            rooms.cancelReservation(req, res);
        });

    // any logged-in user can view reservations for a specific person (patrons restricted to own)
    } else if (req.method === 'GET' && req.url.startsWith('/api/reservations/')) {
        verifyToken(req, res, () => {
            rooms.getReservationsForPerson(req, res);
        });

    // any logged-in user can make a reservation
    } else if (req.method === 'POST' && req.url === '/api/reservations') {
        verifyToken(req, res, () => {
            rooms.makeReservation(req, res);
        });

    // staff-only — add a new room
    } else if (req.method === 'POST' && req.url === '/api/rooms') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                rooms.addRoom(req, res);
            });
        });

    // staff-only — view all holds
    } else if (req.method === 'GET' && req.url === '/api/holds') {
        verifyToken(req, res, () => {
            requireRole(1)(req, res, () => {
                holds.getAllHolds(req, res);
            });
        });

    // any logged-in user can place a hold on their own behalf
    } else if (req.method === 'POST' && req.url === '/api/holds') {
        verifyToken(req, res, () => {
            holds.placeHold(req, res);
        });

    // any logged-in user can cancel a hold (patrons restricted to own, staff can cancel any)
    } else if (req.method === 'DELETE' && req.url.startsWith('/api/holds/')) {
        verifyToken(req, res, () => {
            holds.cancelHold(req, res);
        });

    // any logged-in user can view holds for a specific person (patrons restricted to own)
    } else if (req.method === 'GET' && req.url.startsWith('/api/holds/')) {
        verifyToken(req, res, () => {
            holds.getHoldsForPerson(req, res);
        });

    // admin-only route — register a new staff member
    } else if (req.method === 'POST' && req.url === '/api/auth/register-staff') {
        verifyToken(req, res, () => {
            requireAdmin(req, res, () => {
                auth.registerStaff(req, res);
            });
        });

    // admin-only — view all staff members
    } else if (req.method === 'GET' && req.url === '/api/staff') {
        verifyToken(req, res, () => {
            requireAdmin(req, res, () => {
                staff.getAllStaff(req, res);
            });
        });

    // admin-only — update a staff member's permissions
    } else if (req.method === 'PUT' && req.url.startsWith('/api/staff/')) {
        verifyToken(req, res, () => {
            requireAdmin(req, res, () => {
                staff.updateStaffPermissions(req, res);
            });
        });

    // admin-only — edit a staff member's personal info
    } else if (req.method === 'PATCH' && req.url.startsWith('/api/staff/')) {
        verifyToken(req, res, () => {
            requireAdmin(req, res, () => {
                staff.updateStaffInfo(req, res);
            });
        });
    // admin-only — reports on popularity
    } else if (req.method === 'GET' && req.url.startsWith('/api/reports/popularity')) {
        verifyToken(req, res, () => {
            requireAdmin(req, res, () => {
                reports.getPopularityReport(req, res);
            });
        });
    // admin-only — reports on fees
    } else if (req.method === 'GET' && req.url.startsWith('/api/reports/fees')) {
        verifyToken(req, res, () => {
            requireAdmin(req, res, () => {
                reports.getFinesReport(req, res);
            });
        }); 
    // admin-only — reports on popularity
    } else if (req.method === 'GET' && req.url.startsWith('/api/reports/patrons')) {
        verifyToken(req, res, () => {
            requireAdmin(req, res, () => {
                reports.getPatronsActivityReport(req, res);
            });
        }); 
        
    }
    else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Route not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});
