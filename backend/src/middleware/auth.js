const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_ACCESS_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
}

module.exports = { authenticate };
