const db = require('../config/database');

const Location = {
  create: async (locationData) => {
    const { location_name, capacity } = locationData;
    
    const result = await db.query(
      'INSERT INTO location (location_name, capacity) VALUES ($1, $2) RETURNING *',
      [location_name, capacity]
    );
    
    return result.rows[0];
  },
  
  update: async (locationId, locationData) => {
    const { location_name, capacity } = locationData;
    
    const result = await db.query(
      'UPDATE location SET location_name = $1, capacity = $2 WHERE location_id = $3 RETURNING *',
      [location_name, capacity, locationId]
    );
    
    return result.rows[0];
  },
  
  delete: async (locationId) => {
    await db.query('DELETE FROM location WHERE location_id = $1', [locationId]);
    return true;
  },
  
  findById: async (locationId) => {
    const result = await db.query('SELECT * FROM location WHERE location_id = $1', [locationId]);
    return result.rows[0];
  },
  
  getAll: async () => {
    const result = await db.query('SELECT * FROM location ORDER BY location_name');
    return result.rows;
  },
  
  getAvailable: async (startDate, endDate, capacity) => {
    const result = await db.query(
      `SELECT l.* FROM location l
       WHERE l.capacity >= $1
       AND l.location_id NOT IN (
         SELECT lh.location_id FROM location_hosting lh
         JOIN events e ON lh.event_id = e.event_id
         WHERE 
           (e.start_date <= $3 AND e.end_date >= $2)
       )
       ORDER BY l.location_name`,
      [capacity, startDate, endDate]
    );
    
    return result.rows;
  },
  
  assignEventToLocation: async (locationId, eventId) => {
    const result = await db.query(
      'INSERT INTO location_hosting (location_id, event_id) VALUES ($1, $2) RETURNING *',
      [locationId, eventId]
    );
    
    return result.rows[0];
  },
  
  getLocationForEvent: async (eventId) => {
    const result = await db.query(
      `SELECT l.* FROM location l
       JOIN location_hosting lh ON l.location_id = lh.location_id
       WHERE lh.event_id = $1`,
      [eventId]
    );
    
    return result.rows[0];
  }
};

module.exports = Location;
