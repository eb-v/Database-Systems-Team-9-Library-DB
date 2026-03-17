const http = require('http');
const PORT = 3000;
const db = require('./db')

const server = http.createServer((req, res) => {                                                                     
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

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
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Route not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});

