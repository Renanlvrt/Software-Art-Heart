// Temporary script to inspect demoTable.db schema
const path = require('path');
const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'));

const dbPath = path.join(__dirname, 'demoTable.db');
console.log('Opening:', dbPath);

const db = new Database(dbPath);

// List all tables
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
console.log('=== TABLES ===');
tables.forEach(t => {
    console.log('\nTABLE:', t.name);
    console.log(t.sql);
    const rows = db.prepare('SELECT COUNT(*) as cnt FROM [' + t.name + ']').get();
    console.log('Rows:', rows.cnt);
});

// Show sample rows from each table
console.log('\n=== SAMPLE DATA ===');
tables.forEach(t => {
    console.log('\nTABLE:', t.name, '- First 3 rows:');
    const rows = db.prepare('SELECT * FROM [' + t.name + '] LIMIT 3').all();
    rows.forEach(r => console.log(JSON.stringify(r)));
});

// Also show column info
console.log('\n=== COLUMN INFO ===');
tables.forEach(t => {
    console.log('\nTABLE:', t.name);
    const info = db.prepare('PRAGMA table_info([' + t.name + '])').all();
    info.forEach(c => console.log('  ', c.name, c.type, c.notnull ? 'NOT NULL' : '', c.pk ? 'PK' : ''));
});

db.close();
console.log('\nDone.');
