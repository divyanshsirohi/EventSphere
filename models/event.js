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

  // Make sure your Event model has this update method
update: async (eventId, eventData) => {
  const { event_name, description, price, start_date, end_date, capacity, category_id } = eventData;
  
  const result = await db.query(
    `UPDATE events 
     SET event_name = $1, description = $2, price = $3, start_date = $4, 
         end_date = $5, capacity = $6, category_id = $7
     WHERE event_id = $8
     RETURNING *`,
    [event_name, description, price, start_date, end_date, capacity, category_id, eventId]
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
      `SELECT *
        FROM (
            SELECT e.*, c.category_name
            FROM events e
            JOIN category c ON e.category_id = c.category_id
        ) AS event_with_category
        WHERE event_with_category.organizer_id = $1
        ORDER BY event_with_category.start_date`,
      [organizerId]
    );
    
    return result.rows;
  },

  // Search events
 async search(query) {
  try {
    const result = await pool.query(`
      SELECT *
      FROM event
      WHERE 
        LOWER(event_name) LIKE LOWER($1) OR
        LOWER(description) LIKE LOWER($1) OR
        LOWER(location) LIKE LOWER($1) OR
        LOWER(category) LIKE LOWER($1)
      ORDER BY start_date ASC
    `, [`%${query}%`]);
    
    return result.rows;
  } catch (error) {
    console.error('Error searching events:', error);
    throw error;
  }
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
       ORDER BY e.start_date`
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
