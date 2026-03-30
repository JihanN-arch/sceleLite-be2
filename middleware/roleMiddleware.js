export const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user didapat dari authenticateToken
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Akses ditolak! Role ${req.user?.role || 'Guest'} tidak diizinkan.`,
      });
    }
    next();
  };
};
