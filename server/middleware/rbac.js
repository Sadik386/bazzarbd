/**
 * Middleware to restrict access based on user roles.
 * @param {...string} allowedRoles - List of roles that are allowed to access the route.
 */
export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[RBAC] Forbidden access attempt by ${req.user.email} (Role: ${req.user.role}) to ${req.originalUrl}`);
      return res.status(403).json({ 
        error: "Forbidden: You do not have permission to perform this action" 
      });
    }

    next();
  };
};
