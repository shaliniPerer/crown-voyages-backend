// Authorize specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Check if user is sales agent or admin
export const isSalesOrAdmin = (req, res, next) => {
  if (!req.user || !['Admin', 'Sales Agent'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Sales Agent or Admin privileges required.'
    });
  }
  next();
};

// Check if user is finance or admin
export const isFinanceOrAdmin = (req, res, next) => {
  if (!req.user || !['Admin', 'Finance'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Finance or Admin privileges required.'
    });
  }
  next();
};