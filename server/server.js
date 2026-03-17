const http = require('http');
const PORT = 3000;

const server = http.createServer((req, res) => {                                                                     
    res.setHeader('Content-Type', 'text/html');                                                                 
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET' && req.url === '/api/test') {
        res.writeHead(200);
        res.write("Hey There!");
        res.end(JSON.stringify({ message: 'Server is running' }));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Route not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});

