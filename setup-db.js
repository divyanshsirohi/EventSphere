const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function setupDatabase() {
  try {
    // Create tables
    await pool.query(`
      -- Person Table
      CREATE TABLE IF NOT EXISTS person (
          person_id SERIAL PRIMARY KEY,
          person_name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          mobile VARCHAR(20),
          role VARCHAR(20) CHECK (role IN ('admin', 'host', 'member')) NOT NULL
      );

      -- Category Table
      CREATE TABLE IF NOT EXISTS category (
          category_id SERIAL PRIMARY KEY,
          category_name VARCHAR(50) UNIQUE NOT NULL
      );

      -- Location Table
      CREATE TABLE IF NOT EXISTS location (
          location_id SERIAL PRIMARY KEY,
          location_name VARCHAR(100) NOT NULL,
          capacity INTEGER NOT NULL
      );

      -- Events Table
      CREATE TABLE IF NOT EXISTS events (
          event_id SERIAL PRIMARY KEY,
          event_name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          capacity INTEGER NOT NULL,
          organizer_id INTEGER REFERENCES person(person_id),
          category_id INTEGER REFERENCES category(category_id),
          image_url VARCHAR(255)
      );

      -- Location_Hosting Table
      CREATE TABLE IF NOT EXISTS location_hosting (
          id SERIAL PRIMARY KEY,
          location_id INTEGER REFERENCES location(location_id),
          event_id INTEGER REFERENCES events(event_id)
      );

      -- Registration Table
      CREATE TABLE IF NOT EXISTS registration (
          reg_id SERIAL PRIMARY KEY,
          person_id INTEGER REFERENCES person(person_id),
          event_id INTEGER REFERENCES events(event_id),
          status VARCHAR(20) CHECK (status IN ('confirmed', 'pending', 'cancelled')) NOT NULL,
          registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Waitlist Table
      CREATE TABLE IF NOT EXISTS waitlist (
          waitlist_id SERIAL PRIMARY KEY,
          person_id INTEGER REFERENCES person(person_id),
          event_id INTEGER REFERENCES events(event_id),
          status VARCHAR(20) CHECK (status IN ('waiting', 'approved', 'expired')) NOT NULL,
          request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Payment Table
      CREATE TABLE IF NOT EXISTS payment (
          payment_id SERIAL PRIMARY KEY,
          reg_id INTEGER REFERENCES registration(reg_id),
          amount DECIMAL(10, 2) NOT NULL,
          status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) NOT NULL,
          payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ParticipatedIn Table
      CREATE TABLE IF NOT EXISTS participated_in (
          id SERIAL PRIMARY KEY,
          person_id INTEGER REFERENCES person(person_id),
          event_id INTEGER REFERENCES events(event_id),
          attendance_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Notification Table
      CREATE TABLE IF NOT EXISTS notification (
          notification_id SERIAL PRIMARY KEY,
          person_id INTEGER REFERENCES person(person_id),
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          notification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if admin user exists
    const adminCheck = await pool.query('SELECT * FROM person WHERE email = $1', ['admin@eventsphere.com']);
    
    if (adminCheck.rows.length === 0) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO person (person_name, email, password, mobile, role) VALUES ($1, $2, $3, $4, $5)',
        ['Admin User', 'admin@eventsphere.com', hashedPassword, '1234567890', 'admin']
      );
      console.log('Admin user created');
    }

    // Insert default categories if they don't exist
    const categoryCheck = await pool.query('SELECT * FROM category');
    if (categoryCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO category (category_name) VALUES 
        ('Conference'), 
        ('Workshop'), 
        ('Seminar'), 
        ('Networking'), 
        ('Party')
      `);
      console.log('Default categories created');
    }

    // Insert default locations if they don't exist
    const locationCheck = await pool.query('SELECT * FROM location');
    if (locationCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO location (location_name, capacity) VALUES 
        ('Main Hall', 500), 
        ('Conference Room A', 100), 
        ('Workshop Space', 50), 
        ('Outdoor Area', 1000), 
        ('Meeting Room B', 30)
      `);
      console.log('Default locations created');
    }

    console.log('Database setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
