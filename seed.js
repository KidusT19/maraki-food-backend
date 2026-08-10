const fs = require('fs');
const path = require('path');
const { dbInstance } = require('./db');

const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

dbInstance.exec(schema, (err) => {
  if (err) {
    console.error('Failed to execute schema:', err);
  } else {
    console.log('Database seeded successfully!');
  }
  dbInstance.close();
});
