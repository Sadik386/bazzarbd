import AuditLog from "../models/AuditLog.js";

/**
 * Logs an administrative action to the database.
 * @param {Object} req - Express request object
 * @param {string} action - Action name (e.g., 'DELETE_PRODUCT')
 * @param {string} targetId - ID of the object being modified
 * @param {Object} details - Additional details about the action
 */
export const logAdminAction = async (req, action, targetId = null, details = {}) => {
  try {
    if (!req.user) return;

    await AuditLog.create({
      admin_id: req.user.id,
      admin_email: req.user.email,
      action,
      target_id: targetId,
      details,
      ip_address: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      user_agent: req.headers['user-agent']
    });
  } catch (err) {
    console.error("[AuditLog] Failed to create log:", err.message);
  }
};
