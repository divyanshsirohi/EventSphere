module.exports = {
    isAuthenticated: (req, res, next) => {
      if (req.session.user) {
        return next();
      }
      req.flash('error', 'Please log in to access this page');
      res.redirect('/auth/login');
    },
    
    isAdmin: (req, res, next) => {
      if (req.session.user && req.session.user.role === 'admin') {
        return next();
      }
      req.flash('error', 'Access denied. Admin privileges required');
      res.redirect('/');
    },
    
    isHost: (req, res, next) => {
      if (req.session.user && req.session.user.role === 'host') {
        return next();
      }
      req.flash('error', 'Access denied. Host privileges required');
      res.redirect('/');
    },
    
    isMember: (req, res, next) => {
      if (req.session.user && req.session.user.role === 'member') {
        return next();
      }
      req.flash('error', 'Access denied. Member privileges required');
      res.redirect('/');
    }
  };
  