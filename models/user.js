const db = require('../config/database');
const bcrypt = require('bcrypt');

const User = {
  findByEmail: async (email) => {
    const result = await db.query('SELECT * FROM person WHERE email = $1', [email]);
    return result.rows[0];
  },
  
  findById: async (id) => {
    const result = await db.query('SELECT * FROM person WHERE person_id = $1', [id]);
    return result.rows[0];
  },
  
  create: async (userData) => {
    const { name, email, password, mobile, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      'INSERT INTO person (person_name, email, password, mobile, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, hashedPassword, mobile, role]
    );
    
    return result.rows[0];
  },
  
  update: async (id, userData) => {
    const { name, email, mobile } = userData;
    
    const result = await db.query(
      'UPDATE person SET person_name = $1, email = $2, mobile = $3 WHERE person_id = $4 RETURNING *',
      [name, email, mobile, id]
    );
    
    return result.rows[0];
  },
  
  updatePassword: async (id, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.query(
      'UPDATE person SET password = $1 WHERE person_id = $2',
      [hashedPassword, id]
    );
    
    return true;
  },
  
  comparePassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  },
  
  getAllUsers: async () => {
    const result = await db.query('SELECT * FROM person ORDER BY person_id');
    return result.rows;
  },
  
  getByRole: async (role) => {
    const result = await db.query('SELECT * FROM person WHERE role = $1 ORDER BY person_id', [role]);
    return result.rows;
  },
  
  delete: async (id) => {
    await db.query('DELETE FROM person WHERE person_id = $1', [id]);
    return true;
  }
};

module.exports = User;
