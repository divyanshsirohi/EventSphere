const db = require('../config/database');

const Payment = {
  create: async (paymentData) => {
    const { reg_id, amount, status } = paymentData;
    
    const result = await db.query(
      'INSERT INTO payment (reg_id, amount, status) VALUES ($1, $2, $3) RETURNING *',
      [reg_id, amount, status || 'pending']
    );
    
    return result.rows[0];
  },
  
  update: async (paymentId, status) => {
    const result = await db.query(
      'UPDATE payment SET status = $1 WHERE payment_id = $2 RETURNING *',
      [status, paymentId]
    );
    
    return result.rows[0];
  },
  
  findById: async (paymentId) => {
    const result = await db.query(
      `SELECT p.*, r.event_id, e.event_name, r.person_id, pe.person_name, pe.email
       FROM payment p
       JOIN registration r ON p.reg_id = r.reg_id
       JOIN events e ON r.event_id = e.event_id
       JOIN person pe ON r.person_id = pe.person_id
       WHERE p.payment_id = $1`,
      [paymentId]
    );
    
    return result.rows[0];
  },
  
  findByRegistration: async (regId) => {
    const result = await db.query('SELECT * FROM payment WHERE reg_id = $1', [regId]);
    return result.rows[0];
  },

  // Add this method to the Payment model
deleteByEventId: async (eventId) => {
  await db.query(
    `DELETE FROM payment 
     WHERE reg_id IN (SELECT reg_id FROM registration WHERE event_id = $1)`,
    [eventId]
  );
  return true;
},
  
  getByPerson: async (personId) => {
    const result = await db.query(
      `SELECT p.*, r.event_id, e.event_name
       FROM payment p
       JOIN registration r ON p.reg_id = r.reg_id
       JOIN events e ON r.event_id = e.event_id
       WHERE r.person_id = $1
       ORDER BY p.payment_date DESC`,
      [personId]
    );
    
    return result.rows;
  },
  
  getByEvent: async (eventId) => {
    const result = await db.query(
      `SELECT p.*, pe.person_name, pe.email
       FROM payment p
       JOIN registration r ON p.reg_id = r.reg_id
       JOIN person pe ON r.person_id = pe.person_id
       WHERE r.event_id = $1
       ORDER BY p.payment_date DESC`,
      [eventId]
    );
    
    return result.rows;
  },
  
  getTotalByEvent: async (eventId) => {
    const result = await db.query(
      `SELECT SUM(p.amount) as total
       FROM payment p
       JOIN registration r ON p.reg_id = r.reg_id
       WHERE r.event_id = $1 AND p.status = 'completed'`,
      [eventId]
    );
    
    return parseFloat(result.rows[0].total || 0);
  }
};

module.exports = Payment;
