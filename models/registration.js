const db = require('../config/database');

const Registration = {
  create: async (registrationData) => {
    const { person_id, event_id, status } = registrationData;
    
    const result = await db.query(
      'INSERT INTO registration (person_id, event_id, status) VALUES ($1, $2, $3) RETURNING *',
      [person_id, event_id, status || 'pending']
    );
    
    return result.rows[0];
  },
  
  update: async (regId, status) => {
    const result = await db.query(
      'UPDATE registration SET status = $1 WHERE reg_id = $2 RETURNING *',
      [status, regId]
    );
    
    return result.rows[0];
  },
  
  findById: async (regId) => {
    const result = await db.query(
      `SELECT r.*, e.event_name, e.start_date, e.end_date, e.price, p.person_name
       FROM registration r
       JOIN events e ON r.event_id = e.event_id
       JOIN person p ON r.person_id = p.person_id
       WHERE r.reg_id = $1`,
      [regId]
    );
    
    return result.rows[0];
  },
  
  findByPersonAndEvent: async (personId, eventId) => {
    const result = await db.query(
      'SELECT * FROM registration WHERE person_id = $1 AND event_id = $2',
      [personId, eventId]
    );
    
    return result.rows[0];
  },
  
  getByPerson: async (personId) => {
    const result = await db.query(
      `SELECT r.*, e.event_name, e.start_date, e.end_date, e.price
       FROM registration r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.person_id = $1
       ORDER BY e.start_date`,
      [personId]
    );
    
    return result.rows;
  },
  
  getByEvent: async (eventId) => {
    const result = await db.query(
      `SELECT r.*, p.person_name, p.email
       FROM registration r
       JOIN person p ON r.person_id = p.person_id
       WHERE r.event_id = $1
       ORDER BY r.registration_date`,
      [eventId]
    );
    
    return result.rows;
  },
  
  delete: async (regId) => {
    await db.query('DELETE FROM registration WHERE reg_id = $1', [regId]);
    return true;
  },
  
  countByStatus: async (eventId, status) => {
    const result = await db.query(
      'SELECT COUNT(*) FROM registration WHERE event_id = $1 AND status = $2',
      [eventId, status]
    );
    
    return parseInt(result.rows[0].count);
  },
  registerForEvent: async (personId, eventId) => {
    try {
      await db.query('CALL register_for_event($1, $2)', [personId, eventId]);
      return true;
    } catch (error) {
      console.error('Error in registerForEvent:', error);
      throw error;
    }
  },
  
  cancelRegistration: async (regId, personId) => {
    try {
      await db.query('CALL cancel_registration($1, $2)', [regId, personId]);
      return true;
    } catch (error) {
      console.error('Error in cancelRegistration:', error);
      throw error;
    }
  },

  // Add this method to the Registration model
deleteByEventId: async (eventId) => {
  await db.query('DELETE FROM registration WHERE event_id = $1', [eventId]);
  return true;
},
  
  getEventStats: async (eventId) => {
    try {
      const result = await db.query('SELECT * FROM get_event_stats($1)', [eventId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getEventStats:', error);
      throw error;
    }
  }
};

module.exports = Registration;
