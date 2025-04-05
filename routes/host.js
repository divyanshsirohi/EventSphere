const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');
const Event = require('../models/event');
const Category = require('../models/category');
const Location = require('../models/location');
const Registration = require('../models/registration');
const Payment = require('../models/payment');
const Notification = require('../models/notification');
const auth = require('../middleware/auth');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/images/events');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Dashboard
router.get('/dashboard', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get user information
    const user = await User.findById(userId);
    
    // Get recent events
    const hostedEvents = await Event.getByOrganizer(userId);
    
    // Calculate stats
    let totalParticipants = 0;
    let totalRevenue = 0;
    
    // Get participant count and revenue for each event
    for (const event of hostedEvents) {
      const participants = await Registration.countByStatus(event.event_id, 'confirmed');
      event.participant_count = participants;
      totalParticipants += participants;
      
      const revenue = await Payment.getTotalByEvent(event.event_id);
      totalRevenue += revenue;
    }
    
    const stats = {
      totalEvents: hostedEvents.length,
      totalParticipants,
      totalRevenue
    };
    
    res.render('host/dashboard', {
      user,
      recentEvents: hostedEvents.slice(0, 5), // Show only the most recent 5 events
      stats,
      title: 'Host Dashboard - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

// Create Event Form
router.get('/host-events', auth.isHost, async (req, res) => {
  try {
    // Get categories
    const categories = await Category.getAll();
    
    // Get locations
    const locations = await Location.getAll();
    
    res.render('host/host-events', {
      categories,
      locations,
      title: 'Create Event - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load event creation form');
    res.redirect('/host/dashboard');
  }
});

// Create Event Process
router.post('/create-event', auth.isHost, upload.single('image'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { 
      event_name, 
      description, 
      category_id, 
      price, 
      start_date, 
      end_date, 
      capacity, 
      location_id 
    } = req.body;
    
    // Get image path if uploaded
    let image_url = null;
    if (req.file) {
      image_url = `/images/events/${req.file.filename}`;
    }
    
    // Create event
    const event = await Event.create({
      event_name,
      description,
      price,
      start_date,
      end_date,
      capacity,
      organizer_id: userId,
      category_id,
      image_url
    });
    
    // Assign location to event
    await Location.assignEventToLocation(location_id, event.event_id);
    
    req.flash('success', 'Event created successfully');
    res.redirect('/host/hosted-events');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to create event');
    res.redirect('/host/host-events');
  }
});

// Hosted Events
router.get('/hosted-events', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get all events by this host
    const events = await Event.getByOrganizer(userId);
    
    // Get participant count for each event
    for (const event of events) {
      event.participant_count = await Registration.countByStatus(event.event_id, 'confirmed');
      event.revenue = await Payment.getTotalByEvent(event.event_id);
    }
    
    res.render('host/hosted-events', {
      events,
      title: 'My Events - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load your events');
    res.redirect('/host/dashboard');
  }
});

// Event Details
router.get('/event-details/:eventId', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const eventId = req.params.eventId;
    
    // Get event details
    const event = await Event.findById(eventId);
    
    if (!event || event.organizer_id !== userId) {
      req.flash('error', 'Event not found or unauthorized');
      return res.redirect('/host/hosted-events');
    }
    
    // Get registrations
    const registrations = await Registration.getByEvent(eventId);
    
    // Get location
    const location = await Location.getLocationForEvent(eventId);
    
    // Calculate stats
    const confirmedCount = registrations.filter(reg => reg.status === 'confirmed').length;
    const pendingCount = registrations.filter(reg => reg.status === 'pending').length;
    const cancelledCount = registrations.filter(reg => reg.status === 'cancelled').length;
    
    const revenue = await Payment.getTotalByEvent(eventId);
    
    const stats = {
      confirmedCount,
      pendingCount,
      cancelledCount,
      revenue
    };
    
    res.render('host/event-details', {
      event,
      registrations,
      location,
      stats,
      title: `${event.event_name} - EventSphere`
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load event details');
    res.redirect('/host/hosted-events');
  }
});

// Edit Event Form
router.get('/edit-event/:eventId', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const eventId = req.params.eventId;
    
    // Get event details
    const event = await Event.findById(eventId);
    
    if (!event || event.organizer_id !== userId) {
      req.flash('error', 'Event not found or unauthorized');
      return res.redirect('/host/hosted-events');
    }
    
    // Get categories
    const categories = await Category.getAll();
    
    // Get current location
    const currentLocation = await Location.getLocationForEvent(eventId);
    
    // Get all locations
    const locations = await Location.getAll();
    
    res.render('host/edit-event', {
      event,
      categories,
      locations,
      currentLocation,
      title: `Edit ${event.event_name} - EventSphere`
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load edit form');
    res.redirect('/host/hosted-events');
  }
});

// Update Event Process
router.post('/update-event/:eventId', auth.isHost, upload.single('image'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const eventId = req.params.eventId;
    
    // Get existing event
    const existingEvent = await Event.findById(eventId);
    
    if (!existingEvent || existingEvent.organizer_id !== userId) {
      req.flash('error', 'Event not found or unauthorized');
      return res.redirect('/host/hosted-events');
    }
    
    const { 
      event_name, 
      description, 
      category_id, 
      price, 
      start_date, 
      end_date, 
      capacity, 
      location_id 
    } = req.body;
    
    // Get image path if uploaded
    let image_url = existingEvent.image_url;
    if (req.file) {
      // If there's an existing image, delete it
      if (existingEvent.image_url) {
        const oldImagePath = path.join(__dirname, '../public', existingEvent.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      image_url = `/images/events/${req.file.filename}`;
    }
    
    // Update event
    await Event.update(eventId, {
      event_name,
      description,
      price,
      start_date,
      end_date,
      capacity,
      category_id,
      image_url
    });
    
    // Update location if changed
    const currentLocation = await Location.getLocationForEvent(eventId);
    if (currentLocation && currentLocation.location_id !== location_id) {
      // Remove current location assignment
      await db.query('DELETE FROM location_hosting WHERE event_id = $1', [eventId]);
      
      // Assign new location
      await Location.assignEventToLocation(location_id, eventId);
    }
    
    // Notify registered participants about the event update
    await Notification.sendToAllEventParticipants(
      eventId,
      `Event update: "${event_name}" details have been updated. Please check the event page for the latest information.`
    );
    
    req.flash('success', 'Event updated successfully');
    res.redirect(`/host/event-details/${eventId}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to update event');
    res.redirect(`/host/edit-event/${req.params.eventId}`);
  }
});

// Delete Event
router.post('/delete-event/:eventId', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const eventId = req.params.eventId;
    
    // Get event details
    const event = await Event.findById(eventId);
    
    if (!event || event.organizer_id !== userId) {
      req.flash('error', 'Event not found or unauthorized');
      return res.redirect('/host/hosted-events');
    }
    
    // Get registrations to notify users
    const registrations = await Registration.getByEvent(eventId);
    
    // Notify registered participants about the event cancellation
    for (const reg of registrations) {
      await Notification.create({
        person_id: reg.person_id,
        message: `Event cancelled: "${event.event_name}" has been cancelled by the organizer.`
      });
    }
    
    // Delete the event
    await Event.delete(eventId);
    
    req.flash('success', 'Event deleted successfully');
    res.redirect('/host/hosted-events');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to delete event');
    res.redirect('/host/hosted-events');
  }
});

// Manage Registrations - Approve/Reject
router.post('/update-registration/:regId', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const regId = req.params.regId;
    const { status } = req.body;
    
    // Get registration details
    const registration = await Registration.findById(regId);
    
    if (!registration) {
      req.flash('error', 'Registration not found');
      return res.redirect('/host/hosted-events');
    }
    
    // Check if this host owns the event
    const event = await Event.findById(registration.event_id);
    
    if (!event || event.organizer_id !== userId) {
      req.flash('error', 'Unauthorized');
      return res.redirect('/host/hosted-events');
    }
    
    // Update registration status
    await Registration.update(regId, status);
    
    // Create notification for the participant
    let message = '';
    if (status === 'confirmed') {
      message = `Your registration for "${event.event_name}" has been confirmed. Please proceed to payment.`;
      
      // Create payment entry if confirmed
      await Payment.create({
        reg_id: regId,
        amount: event.price,
        status: 'pending'
      });
    } else if (status === 'cancelled') {
      message = `Your registration for "${event.event_name}" has been cancelled by the organizer.`;
    }
    
    await Notification.create({
      person_id: registration.person_id,
      message
    });
    
    req.flash('success', `Registration ${status} successfully`);
    res.redirect(`/host/event-details/${registration.event_id}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to update registration');
    res.redirect('/host/hosted-events');
  }
});

// Send Notification to All Participants
router.post('/send-notification/:eventId', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const eventId = req.params.eventId;
    const { message } = req.body;
    
    // Check if this host owns the event
    const event = await Event.findById(eventId);
    
    if (!event || event.organizer_id !== userId) {
      req.flash('error', 'Unauthorized');
      return res.redirect('/host/hosted-events');
    }
    
    // Send notification to all confirmed participants
    await Notification.sendToAllEventParticipants(eventId, message);
    
    req.flash('success', 'Notification sent to all participants');
    res.redirect(`/host/event-details/${eventId}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to send notification');
    res.redirect(`/host/event-details/${req.params.eventId}`);
  }
});

// Profile
router.get('/profile', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    
    res.render('host/profile', {
      user,
      title: 'My Profile - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load profile');
    res.redirect('/host/dashboard');
  }
});

// Update Profile
router.post('/update-profile', auth.isHost, async (req, res) => {
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
    res.redirect('/host/profile');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to update profile');
    res.redirect('/host/profile');
  }
});

// Change Password
router.post('/change-password', auth.isHost, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { current_password, new_password, confirm_password } = req.body;
    
    // Validate password confirmation
    if (new_password !== confirm_password) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/host/profile');
    }
    
    // Get user to check current password
    const user = await User.findById(userId);
    
    // Verify current password
    const isMatch = await User.comparePassword(current_password, user.password);
    
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/host/profile');
    }
    
    // Update password
    await User.updatePassword(userId, new_password);
    
    req.flash('success', 'Password changed successfully');
    res.redirect('/host/profile');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to change password');
    res.redirect('/host/profile');
  }
});

module.exports = router;
