import jwt from 'jsonwebtoken';

export function authenticateUser(req, res, next) {
  const token = req.cookies.accessToken || req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  const bearerToken = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
  jwt.verify(bearerToken, process.env.KEY, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ error: 'Token expired' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Malformed token' });
      } else {
        return res.status(403).json({ error: 'Invalid token' });
      }
    }
    if (!user) {
      return res.status(403).json({ error: 'Failed to authenticate token' });
    }
    req.user = user;
    next();
  });
}

export const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};

export default { authenticateUser, authorizeAdmin };
