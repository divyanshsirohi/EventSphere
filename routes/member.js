const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Event = require('../models/event');
const Registration = require('../models/registration');
const Payment = require('../models/payment');
const Notification = require('../models/notification');
const auth = require('../middleware/auth');

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
      registrations: registrations.slice(0, 3), // Show only the first 3
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
    
    // Check if already registered
    const existingReg = await Registration.findByPersonAndEvent(userId, eventId);
    
    if (existingReg) {
      req.flash('error', 'You are already registered for this event');
      return res.redirect('/');
    }
    
    // Get event details
    const event = await Event.findById(eventId);
    
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/');
    }
    
    // Check if event has capacity
    const participantCount = await Event.getParticipantCount(eventId);
    
    // Create registration
    let registrationStatus = 'pending';
    if (participantCount < event.capacity) {
      registrationStatus = 'confirmed';
    }
    
    const registration = await Registration.create({
      person_id: userId,
      event_id: eventId,
      status: registrationStatus
    });
    
    if (registrationStatus === 'confirmed') {
      // Create payment entry
      await Payment.create({
        reg_id: registration.reg_id,
        amount: event.price,
        status: 'pending'
      });
      
      // Create notification
      await Notification.create({
        person_id: userId,
        message: `You have successfully registered for ${event.event_name}. Please complete your payment.`
      });
      
      req.flash('success', 'Registration successful! Please proceed to payment.');
    } else {
      // Add to waitlist
      await Notification.create({
        person_id: userId,
        message: `You have been added to the waitlist for ${event.event_name}. We'll notify you if a spot becomes available.`
      });
      
      req.flash('success', 'The event is at full capacity. You have been added to the waitlist.');
    }
    
    res.redirect('/member/joined-events');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to register for the event');
    res.redirect('/');
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

module.exports = router;
