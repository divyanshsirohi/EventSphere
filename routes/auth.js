const express = require('express');
const router = express.Router();
const User = require('../models/user');


// Login page
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Process login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findByEmail(email);
    
    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }
    
    // Compare password
    const isMatch = await User.comparePassword(password, user.password);
    
    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/auth/login');
    }
    
    // Set user session
    req.session.user = {
      id: user.person_id,
      person_name: user.person_name,
      email: user.email,
      role: user.role
    };
    
    // Redirect based on role
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (user.role === 'host') {
      return res.redirect('/host/dashboard');
    } else {
      return res.redirect('/');
    }
    
  } catch (error) {
    console.error(error);
    req.flash('error', 'Server error occurred');
    res.redirect('/auth/login');
  }
});

// Register page
router.get('/register', (req, res) => {
  const role = req.query.role || null;
  res.render('auth/register', { role });
});

// Role selection page
router.get('/register-role', (req, res) => {
  res.render('auth/register-role');
});

// Process registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirm_password, mobile, role } = req.body;
    
    // Validate inputs
    if (password !== confirm_password) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/auth/register');
    }
    
    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      req.flash('error', 'Email already in use');
      return res.redirect('/auth/register');
    }
    
    if (mobile.length !== 10) {
      req.flash('error', 'Mobile number must be 10 digits long');
      return res.redirect('/auth/register');
    }
    if (!/^\d+$/.test(mobile)) {
      req.flash('error', 'Mobile number must contain digits only');
      return res.redirect('/auth/register');
    }    

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      mobile,
      role: role || 'member'
    });
    
    req.flash('success', 'Registration successful! Please log in.');
    res.redirect('/auth/login');
    
  } catch (error) {
    console.error(error);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/auth/register');
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
