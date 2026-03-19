const http = require('http');
const PORT = 3000;
const db = require('./db');
const auth = require('./routes/auth');
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
