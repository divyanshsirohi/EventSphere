const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Event = require('../models/event');
const Category = require('../models/category');
const Location = require('../models/location');
const Registration = require('../models/registration');
const Payment = require('../models/payment');
const auth = require('../middleware/auth');

// Dashboard
router.get('/dashboard', auth.isAdmin, async (req, res) => {
  try {
    // Get counts
    const usersCount = (await User.getAllUsers()).length;
    const membersCount = (await User.getByRole('member')).length;
    const hostsCount = (await User.getByRole('host')).length;
    
    const events = await Event.getAll();
    const eventsCount = events.length;
    
    const locations = await Location.getAll();
    const locationsCount = locations.length;
    
    const categories = await Category.getAll();
    const categoriesCount = categories.length;
    
    // Calculate total users registered for events
    let registrationsCount = 0;
    for (const event of events) {
      const registrations = await Registration.getByEvent(event.event_id);
      registrationsCount += registrations.length;
    }
    
    // Get recent events
    const recentEvents = events.slice(0, 5);
    
    const stats = {
      usersCount,
      membersCount,
      hostsCount,
      eventsCount,
      locationsCount,
      categoriesCount,
      registrationsCount
    };
    
    res.render('admin/dashboard', {
      stats,
      recentEvents,
      title: 'Admin Dashboard - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load dashboard');
    res.redirect('/');
  }
});

// Users Management
router.get('/users', auth.isAdmin, async (req, res) => {
  try {
    const users = await User.getAllUsers();
    
    res.render('admin/users', {
      users,
      title: 'User Management - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load users');
    res.redirect('/admin/dashboard');
  }
});

// Create New User
router.post('/users', auth.isAdmin, async (req, res) => {
  try {
    const { name, email, password, mobile, role } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      req.flash('error', 'Email already in use');
      return res.redirect('/admin/users');
    }
    
    // Create new user
    await User.create({
      name,
      email,
      password,
      mobile,
      role
    });
    
    req.flash('success', 'User created successfully');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to create user');
    res.redirect('/admin/users');
  }
});

// Delete User
router.post('/users/delete/:userId', auth.isAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Prevent deleting own account
    if (userId == req.session.user.id) {
      req.flash('error', 'You cannot delete your own account');
      return res.redirect('/admin/users');
    }
    
    await User.delete(userId);
    
    req.flash('success', 'User deleted successfully');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to delete user');
    res.redirect('/admin/users');
  }
});

// Events Management
router.get('/events', auth.isAdmin, async (req, res) => {
  try {
    const events = await Event.getAll();
    
    // Get participant count for each event
    for (const event of events) {
      event.participant_count = await Registration.countByStatus(event.event_id, 'confirmed');
    }
    
    res.render('admin/events', {
      events,
      title: 'Event Management - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load events');
    res.redirect('/admin/dashboard');
  }
});

// Delete Event
router.post('/events/delete/:eventId', auth.isAdmin, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    await Event.delete(eventId);
    
    req.flash('success', 'Event deleted successfully');
    res.redirect('/admin/events');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to delete event');
    res.redirect('/admin/events');
  }
});

// Locations Management
router.get('/locations', auth.isAdmin, async (req, res) => {
  try {
    const locations = await Location.getAll();
    
    res.render('admin/locations', {
      locations,
      title: 'Location Management - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load locations');
    res.redirect('/admin/dashboard');
  }
});

// Create New Location
router.post('/locations', auth.isAdmin, async (req, res) => {
  try {
    const { location_name, capacity } = req.body;
    
    await Location.create({
      location_name,
      capacity
    });
    
    req.flash('success', 'Location created successfully');
    res.redirect('/admin/locations');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to create location');
    res.redirect('/admin/locations');
  }
});

// Update Location
router.post('/locations/update/:locationId', auth.isAdmin, async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const { location_name, capacity } = req.body;
    
    await Location.update(locationId, {
      location_name,
      capacity
    });
    
    req.flash('success', 'Location updated successfully');
    res.redirect('/admin/locations');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to update location');
    res.redirect('/admin/locations');
  }
});

// Delete Location
router.post('/locations/delete/:locationId', auth.isAdmin, async (req, res) => {
  try {
    const locationId = req.params.locationId;
    
    await Location.delete(locationId);
    
    req.flash('success', 'Location deleted successfully');
    res.redirect('/admin/locations');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to delete location');
    res.redirect('/admin/locations');
  }
});

// Categories Management
router.get('/categories', auth.isAdmin, async (req, res) => {
  try {
    const categories = await Category.getAll();
    
    res.render('admin/categories', {
      categories,
      title: 'Category Management - EventSphere'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to load categories');
    res.redirect('/admin/dashboard');
  }
});

// Create New Category
router.post('/categories', auth.isAdmin, async (req, res) => {
  try {
    const { category_name } = req.body;
    
    await Category.create({
      category_name
    });
    
    req.flash('success', 'Category created successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to create category');
    res.redirect('/admin/categories');
  }
});

// Update Category
router.post('/categories/update/:categoryId', auth.isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { category_name } = req.body;
    
    await Category.update(categoryId, {
      category_name
    });
    
    req.flash('success', 'Category updated successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to update category');
    res.redirect('/admin/categories');
  }
});

// Delete Category
router.post('/categories/delete/:categoryId', auth.isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    
    await Category.delete(categoryId);
    
    req.flash('success', 'Category deleted successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to delete category');
    res.redirect('/admin/categories');
  }
});

module.exports = router;
