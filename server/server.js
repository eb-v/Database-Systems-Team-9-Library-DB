const http = require('http');
const PORT = 3000;
const db = require('./db');
const auth = require('./routes/auth');
const items = require('./routes/items');
const borrow = require('./routes/borrow');
const fees = require('./routes/fees');
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

    // admin-only route — register a new staff member
    } else if (req.method === 'POST' && req.url === '/api/auth/register-staff') {
        verifyToken(req, res, () => {
            requireAdmin(req, res, () => {
                auth.registerStaff(req, res);
            });
        });

    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Route not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});
