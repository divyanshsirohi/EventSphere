const express = require('express');
const router = express.Router();
const Event = require('../models/event');

router.get('/', async (req, res) => {
  try {
    // Get upcoming events
    const events = await Event.getUpcomingEvents();
    
    res.render('index', { 
      events,
      title: 'EventSphere - Discover Events'
    });
  } catch (error) {
    console.error(error);
    res.render('index', { 
      error: 'Failed to load events',
      events: []
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    let events = [];
    
    if (query.trim() !== '') {
      events = await Event.searchEvents(query);
    }
    
    res.render('search-results', { 
      events,
      query,
      title: 'Search Results - EventSphere'
    });
  } catch (error) {
    console.error(error);
    res.render('search-results', { 
      error: 'Failed to search events',
      events: [],
      query: req.query.q || ''
    });
  }
});

module.exports = router;
