const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function setupProcedures() {
  try {
    console.log('Setting up PL/pgSQL procedures and functions...');
    
    const sqlFile = path.join(__dirname, 'database', 'procedures.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await db.query(sql);
    
    console.log('PL/pgSQL procedures and functions created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up PL/pgSQL:', error);
    process.exit(1);
  }
}

setupProcedures();
