export const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const adminRoles = ['SUPPORT_AGENT', 'CONTENT_MANAGER', 'ORDER_MANAGER', 'SUPER_ADMIN'];
  
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied. Admin privileges required." });
  }

  next();
};
