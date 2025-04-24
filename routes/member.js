const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Event = require('../models/event');
const Registration = require('../models/registration');
const Payment = require('../models/payment');
const Notification = require('../models/notification');
const auth = require('../middleware/auth');
const pool = require('../models/db');


// Dashboard
router.get('/dashboard', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get user information
    const user = await User.findById(userId);
    
    // Get registered events
    const registrations = await Registration.getByPerson(userId);
    
    // Get unread notifications
    const notifications = await Notification.getUnreadByPerson(userId);
    
    // Get stats
    const stats = {
      registeredCount: registrations.length,
      upcomingCount: registrations.filter(reg => 
        new Date(reg.start_date) > new Date() && reg.status === 'confirmed'
      ).length,
      pastCount: registrations.filter(reg => 
        new Date(reg.end_date) < new Date() && reg.status === 'confirmed'
      ).length
    };
    
    res.render('member/dashboard', {
      user,
      registrations: registrations.slice(0, 10), // Show only the first 3
      notifications,
      stats,
      title: 'Member Dashboard - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

// Joined Events
router.get('/joined-events', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get all registrations
    const registrations = await Registration.getByPerson(userId);
    
    res.render('member/joined-events', {
      registrations,
      title: 'My Events - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load your events');
    res.redirect('/member/dashboard');
  }
});

// Profile
router.get('/profile', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    
    res.render('member/profile', {
      user,
      title: 'My Profile - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load profile');
    res.redirect('/member/dashboard');
  }
});

// Update Profile
router.post('/update-profile', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email, mobile } = req.body;
    
    // Update user information
    const updatedUser = await User.update(userId, {
      name,
      email,
      mobile
    });
    
    // Update session info
    req.session.user.person_name = updatedUser.person_name;
    req.session.user.email = updatedUser.email;
    
    req.flash('success', 'Profile updated successfully');
    res.redirect('/member/profile');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to update profile');
    res.redirect('/member/profile');
  }
});

// Change Password
router.post('/change-password', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { current_password, new_password, confirm_password } = req.body;
    
    // Validate password confirmation
    if (new_password !== confirm_password) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/member/profile');
    }
    
    // Get user to check current password
    const user = await User.findById(userId);
    
    // Verify current password
    const isMatch = await User.comparePassword(current_password, user.password);
    
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/member/profile');
    }
    
    // Update password
    await User.updatePassword(userId, new_password);
    
    req.flash('success', 'Password changed successfully');
    res.redirect('/member/profile');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to change password');
    res.redirect('/member/profile');
  }
});

// Register for an event
router.get('/register-event/:eventId', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const eventId = req.params.eventId;

    // Call the stored procedure
    await pool.query('CALL register_for_event($1, $2)', [userId, eventId]);

    // Check if a new payment exists
    const paymentResult = await pool.query(`
      SELECT p.payment_id
      FROM payment p
      JOIN registration r ON r.reg_id = p.reg_id
      WHERE r.person_id = $1 AND r.event_id = $2 AND p.status = 'pending'
      ORDER BY p.payment_date DESC
      LIMIT 1
    `, [userId, eventId]);

    if (paymentResult.rows.length > 0) {
      // Redirect to payment page
      return res.redirect(`/payment/form/${paymentResult.rows[0].payment_id}`);
    }

    // Otherwise, registration was free or on waitlist
    req.flash('success', 'Registration submitted. Check your notifications for updates.');
    return res.redirect('/member/joined-events');
  } catch (error) {
    console.error('Registration error:', error.message);
    if (error.message.includes('already registered')) {
      req.flash('info', 'You are already registered for this event');
      return res.redirect('/member/joined-events');
    }

    req.flash('error', 'Failed to register for event');
    return res.redirect('/');
  }
});

// Cancel registration
router.post('/cancel-registration/:regId', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const regId = req.params.regId;
    
    // Get registration details
    const registration = await Registration.findById(regId);
    
    if (!registration || registration.person_id !== userId) {
      req.flash('error', 'Registration not found or unauthorized');
      return res.redirect('/member/joined-events');
    }
    
    // Update registration status
    await Registration.update(regId, 'cancelled');
    
    // Get event details
    const event = await Event.findById(registration.event_id);
    
    // Create notification
    await Notification.create({
      person_id: userId,
      message: `Your registration for ${event.event_name} has been cancelled.`
    });
    
    req.flash('success', 'Registration cancelled successfully');
    res.redirect('/member/joined-events');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to cancel registration');
    res.redirect('/member/joined-events');
  }
});

// Mark notification as read
router.post('/read-notification/:notificationId', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const notificationId = req.params.notificationId;
    
    // Get notification
    const notification = await Notification.findById(notificationId);
    
    if (!notification || notification.person_id !== userId) {
      return res.status(403).json({ success: false });
    }
    
    // Mark as read
    await Notification.markAsRead(notificationId);
    
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false });
  }
});

// Search events
router.get('/search-events', auth.isMember, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const searchQuery = req.query.query;
    
    // Get user information
    const user = await User.findById(userId);
    
    // If no search query, redirect to dashboard
    if (!searchQuery) {
      return res.redirect('/member/dashboard');
    }
    
    // Search for events
    const events = await Event.search(searchQuery);
    
    // Get user's registrations to check which events they're already registered for
    const registrations = await Registration.getByPerson(userId);
    const registeredEventIds = registrations.map(reg => reg.event_id);
    
    // Add a property to each event to indicate if user is registered
    events.forEach(event => {
      event.isRegistered = registeredEventIds.includes(event.event_id);
    });
    
    res.render('member/search-results', {
      user,
      events,
      searchQuery,
      title: 'Search Results - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to search events');
    res.redirect('/member/dashboard');
  }
});


module.exports = router;
