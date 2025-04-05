const db = require('../config/database');

const Event = {
  create: async (eventData) => {
    const { 
      event_name, 
      description, 
      price, 
      start_date, 
      end_date, 
      capacity, 
      organizer_id, 
      category_id, 
      image_url 
    } = eventData;
    
    const result = await db.query(
      `INSERT INTO events 
       (event_name, description, price, start_date, end_date, capacity, organizer_id, category_id, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [event_name, description, price, start_date, end_date, capacity, organizer_id, category_id, image_url]
    );
    
    return result.rows[0];
  },
  
  update: async (eventId, eventData) => {
    const { 
      event_name, 
      description, 
      price, 
      start_date, 
      end_date, 
      capacity, 
      category_id, 
      image_url 
    } = eventData;
    
    const result = await db.query(
      `UPDATE events SET 
       event_name = $1, description = $2, price = $3, start_date = $4, end_date = $5, 
       capacity = $6, category_id = $7, image_url = $8
       WHERE event_id = $9 RETURNING *`,
      [event_name, description, price, start_date, end_date, capacity, category_id, image_url, eventId]
    );
    
    return result.rows[0];
  },
  
  delete: async (eventId) => {
    await db.query('DELETE FROM events WHERE event_id = $1', [eventId]);
    return true;
  },
  
  findById: async (eventId) => {
    const result = await db.query(
      `SELECT e.*, c.category_name, p.person_name as organizer_name
       FROM events e
       JOIN category c ON e.category_id = c.category_id
       JOIN person p ON e.organizer_id = p.person_id
       WHERE e.event_id = $1`,
      [eventId]
    );
    
    return result.rows[0];
  },
  
  getAll: async () => {
    const result = await db.query(
      `SELECT e.*, c.category_name, p.person_name as organizer_name
       FROM events e
       JOIN category c ON e.category_id = c.category_id
       JOIN person p ON e.organizer_id = p.person_id
       ORDER BY e.start_date`
    );
    
    return result.rows;
  },
  
  getByOrganizer: async (organizerId) => {
    const result = await db.query(
      `SELECT e.*, c.category_name
       FROM events e
       JOIN category c ON e.category_id = c.category_id
       WHERE e.organizer_id = $1
       ORDER BY e.start_date`,
      [organizerId]
    );
    
    return result.rows;
  },
  
  getParticipantCount: async (eventId) => {
    const result = await db.query(
      'SELECT COUNT(*) FROM registration WHERE event_id = $1 AND status = $2',
      [eventId, 'confirmed']
    );
    
    return parseInt(result.rows[0].count);
  },
  
  getUpcomingEvents: async () => {
    const result = await db.query(
      `SELECT e.*, c.category_name, p.person_name as organizer_name
       FROM events e
       JOIN category c ON e.category_id = c.category_id
       JOIN person p ON e.organizer_id = p.person_id
       WHERE e.start_date > NOW()
       ORDER BY e.start_date
       LIMIT 10`
    );
    
    return result.rows;
  },
  
  searchEvents: async (query) => {
    const searchTerm = `%${query}%`;
    const result = await db.query(
      `SELECT e.*, c.category_name, p.person_name as organizer_name
       FROM events e
       JOIN category c ON e.category_id = c.category_id
       JOIN person p ON e.organizer_id = p.person_id
       WHERE e.event_name ILIKE $1 OR e.description ILIKE $1 OR c.category_name ILIKE $1
       ORDER BY e.start_date`,
      [searchTerm]
    );
    
    return result.rows;
  }
};

module.exports = Event;
