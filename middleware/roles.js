module.exports = {
    checkRole: (roles) => {
      return (req, res, next) => {
        if (!req.session.user) {
          req.flash('error', 'Please log in to access this page');
          return res.redirect('/auth/login');
        }
        
        if (roles.includes(req.session.user.role)) {
          return next();
        }
        
        req.flash('error', 'You do not have permission to access this page');
        return res.redirect('/');
      };
    }
  };
  