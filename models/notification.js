const db = require('../config/database');

const Notification = {
  create: async (notificationData) => {
    const { person_id, message } = notificationData;
    
    const result = await db.query(
      'INSERT INTO notification (person_id, message) VALUES ($1, $2) RETURNING *',
      [person_id, message]
    );
    
    return result.rows[0];
  },
  
  markAsRead: async (notificationId) => {
    const result = await db.query(
      'UPDATE notification SET is_read = TRUE WHERE notification_id = $1 RETURNING *',
      [notificationId]
    );
    
    return result.rows[0];
  },
  
  findById: async (notificationId) => {
    const result = await db.query('SELECT * FROM notification WHERE notification_id = $1', [notificationId]);
    return result.rows[0];
  },
  
  getByPerson: async (personId) => {
    const result = await db.query(
      'SELECT * FROM notification WHERE person_id = $1 ORDER BY notification_date DESC',
      [personId]
    );
    
    return result.rows;
  },
  
  getUnreadByPerson: async (personId) => {
    const result = await db.query(
      'SELECT * FROM notification WHERE person_id = $1 AND is_read = FALSE ORDER BY notification_date DESC',
      [personId]
    );
    
    return result.rows;
  },
  
  deleteById: async (notificationId) => {
    await db.query('DELETE FROM notification WHERE notification_id = $1', [notificationId]);
    return true;
  },
  
  deleteAllByPerson: async (personId) => {
    await db.query('DELETE FROM notification WHERE person_id = $1', [personId]);
    return true;
  },
  
  sendToAllEventParticipants: async (eventId, message) => {
    await db.query(
      `INSERT INTO notification (person_id, message)
       SELECT person_id, $2 FROM registration WHERE event_id = $1`,
      [eventId, message]
    );
    
    return true;
  }
};

module.exports = Notification;
