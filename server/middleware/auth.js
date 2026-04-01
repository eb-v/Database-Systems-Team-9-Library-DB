const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    // get the authorization header from the request (looks like "Bearer eyJ...")
    const authHeader = req.headers['authorization'];

    // if no authorization header was sent, reject the request
    if (!authHeader) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'No token provided' }));
    }

    // the header looks like "Bearer eyJ...", so we split on the space and grab the token part
    const token = authHeader.split(' ')[1];

    if (!token) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Invalid token format' }));
    }

    try {
        // verify the token using our secret key — if it was tampered with or expired this will throw an error
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // attach the decoded user info (person_id, role) to req so any route handler can access it
        req.user = decoded;

        // call next() to pass the request along to the actual route handler
        next();
    } catch (err) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Invalid or expired token' }));
    }
}

// only allows access if the user has a specific role. role 1 = staff, role 2 = user/patron
function requireRole(role) {
    return function(req, res, next) {
        if (req.user.role !== role) {
            res.writeHead(403);
            return res.end(JSON.stringify({ error: 'Access denied' }));
        }
        next();
    }
}

// only allows access if the user is staff (role 1) AND has admin permissions (staff_permissions 1)
function requireAdmin(req, res, next) {
    if (req.user.role !== 1 || req.user.staff_permissions !== 1) {
        res.writeHead(403);
        return res.end(JSON.stringify({ error: 'Admin access required' }));
    }
    next();
}

module.exports = { verifyToken, requireRole, requireAdmin };
