const db = require('../config/database');

const Category = {
  create: async (categoryData) => {
    const { category_name } = categoryData;
    
    const result = await db.query(
      'INSERT INTO category (category_name) VALUES ($1) RETURNING *',
      [category_name]
    );
    
    return result.rows[0];
  },
  
  update: async (categoryId, categoryData) => {
    const { category_name } = categoryData;
    
    const result = await db.query(
      'UPDATE category SET category_name = $1 WHERE category_id = $2 RETURNING *',
      [category_name, categoryId]
    );
    
    return result.rows[0];
  },
  
  delete: async (categoryId) => {
    await db.query('DELETE FROM category WHERE category_id = $1', [categoryId]);
    return true;
  },
  
  findById: async (categoryId) => {
    const result = await db.query('SELECT * FROM category WHERE category_id = $1', [categoryId]);
    return result.rows[0];
  },
  
  getAll: async () => {
    const result = await db.query('SELECT * FROM category ORDER BY category_name');
    return result.rows;
  }
};

module.exports = Category;
