/**
 * Database Connection and Query Module
 * 
 * Provides SQLite database connection, initialization, and query methods.
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 * 
 * @module database/db
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { getTableStatements, getIndexStatements, getInitialState } = require('./schema');

let db = null;

/**
 * Initialize the database connection and run migrations
 * @param {string} [dbPath] - Optional path to database file
 * @returns {Database} The database instance
 */
function initialize(dbPath) {
    const resolvedPath = dbPath || process.env.DATABASE_PATH || './data/artheart.db';

    // Ensure data directory exists
    const dataDir = path.dirname(resolvedPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create database connection
    db = new Database(resolvedPath);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Run migrations
    runMigrations();

    console.log(`[DB] Database initialized at ${resolvedPath}`);
    return db;
}

/**
 * Run database migrations (create tables and indexes)
 */
function runMigrations() {
    if (!db) {
        throw new Error('Database not initialized. Call initialize() first.');
    }

    // Create tables
    const tableStatements = getTableStatements();
    for (const sql of tableStatements) {
        db.exec(sql);
    }

    // Create indexes
    const indexStatements = getIndexStatements();
    for (const sql of indexStatements) {
        db.exec(sql);
    }

    // Insert initial state if not exists
    const initialState = getInitialState();
    const insertState = db.prepare(`
    INSERT OR IGNORE INTO system_state (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
  `);

    for (const { key, value } of initialState) {
        insertState.run(key, value);
    }

    console.log('[DB] Migrations completed');
}

/**
 * Get the database instance
 * @returns {Database} The database instance
 * @throws {Error} If database is not initialized
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initialize() first.');
    }
    return db;
}

/**
 * Close the database connection
 */
function close() {
    if (db) {
        db.close();
        db = null;
        console.log('[DB] Database connection closed');
    }
}

// ============================================================
// Sensor Readings Methods
// ============================================================

/**
 * Insert a sensor reading
 * @param {Object} reading - The sensor reading data
 * @param {string} reading.id - UUID for the reading
 * @param {string} reading.timestamp - ISO timestamp
 * @param {string} reading.sensor_type - Type of sensor
 * @param {number} reading.value - Sensor value
 * @param {string} reading.unit - Unit of measurement
 * @param {string} [reading.motor_state] - Current motor state
 * @param {string} [reading.source] - Data source (simulator/esp32)
 * @returns {Object} The inserted reading with rowid
 */
function insertReading(reading) {
    const stmt = getDb().prepare(`
    INSERT INTO sensor_readings (id, timestamp, sensor_type, value, unit, motor_state, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    const result = stmt.run(
        reading.id,
        reading.timestamp,
        reading.sensor_type,
        reading.value,
        reading.unit,
        reading.motor_state || 'stopped',
        reading.source || 'simulator'
    );

    return { ...reading, rowid: result.lastInsertRowid };
}

/**
 * Get sensor readings with optional filters
 * @param {Object} [filters] - Query filters
 * @param {string} [filters.sensor_type] - Filter by sensor type
 * @param {string} [filters.start_time] - Start of time range (ISO)
 * @param {string} [filters.end_time] - End of time range (ISO)
 * @param {number} [filters.limit=1000] - Maximum number of results
 * @param {number} [filters.offset=0] - Offset for pagination
 * @returns {Array} Array of sensor readings
 */
function getReadings(filters = {}) {
    let sql = 'SELECT * FROM sensor_readings WHERE 1=1';
    const params = [];

    if (filters.sensor_type) {
        sql += ' AND sensor_type = ?';
        params.push(filters.sensor_type);
    }

    if (filters.start_time) {
        sql += ' AND timestamp >= ?';
        params.push(filters.start_time);
    }

    if (filters.end_time) {
        sql += ' AND timestamp <= ?';
        params.push(filters.end_time);
    }

    sql += ' ORDER BY timestamp DESC';
    sql += ` LIMIT ? OFFSET ?`;
    params.push(filters.limit || 1000);
    params.push(filters.offset || 0);

    const stmt = getDb().prepare(sql);
    return stmt.all(...params);
}

/**
 * Get the latest reading for each sensor type
 * @returns {Object} Map of sensor_type to latest reading
 */
function getLatestReadings() {
    const sql = `
    SELECT * FROM sensor_readings
    WHERE id IN (
      SELECT id FROM sensor_readings
      GROUP BY sensor_type
      HAVING timestamp = MAX(timestamp)
    )
  `;

    const readings = getDb().prepare(sql).all();

    // Convert to object keyed by sensor_type
    const result = {};
    for (const reading of readings) {
        result[reading.sensor_type] = reading;
    }

    return result;
}

/**
 * Get readings count (for pagination)
 * @param {Object} [filters] - Same filters as getReadings
 * @returns {number} Total count of matching readings
 */
function getReadingsCount(filters = {}) {
    let sql = 'SELECT COUNT(*) as count FROM sensor_readings WHERE 1=1';
    const params = [];

    if (filters.sensor_type) {
        sql += ' AND sensor_type = ?';
        params.push(filters.sensor_type);
    }

    if (filters.start_time) {
        sql += ' AND timestamp >= ?';
        params.push(filters.start_time);
    }

    if (filters.end_time) {
        sql += ' AND timestamp <= ?';
        params.push(filters.end_time);
    }

    const stmt = getDb().prepare(sql);
    return stmt.get(...params).count;
}

// ============================================================
// Control Commands Methods
// ============================================================

/**
 * Insert a control command
 * @param {Object} command - The command data
 * @returns {Object} The inserted command with rowid
 */
function insertCommand(command) {
    const stmt = getDb().prepare(`
    INSERT INTO control_commands (id, timestamp, target, action, params, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    const result = stmt.run(
        command.id,
        command.timestamp,
        command.target,
        command.action,
        JSON.stringify(command.params || {}),
        command.status || 'pending'
    );

    return { ...command, rowid: result.lastInsertRowid };
}

/**
 * Update command status
 * @param {string} id - Command ID
 * @param {string} status - New status
 * @param {string} [errorMessage] - Error message if failed
 * @returns {boolean} True if updated
 */
function updateCommandStatus(id, status, errorMessage = null) {
    const stmt = getDb().prepare(`
    UPDATE control_commands 
    SET status = ?, error_message = ?
    WHERE id = ?
  `);

    const result = stmt.run(status, errorMessage, id);
    return result.changes > 0;
}

/**
 * Get control commands with optional filters
 * @param {Object} [filters] - Query filters
 * @returns {Array} Array of commands
 */
function getCommands(filters = {}) {
    let sql = 'SELECT * FROM control_commands WHERE 1=1';
    const params = [];

    if (filters.target) {
        sql += ' AND target = ?';
        params.push(filters.target);
    }

    if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
    }

    if (filters.start_time) {
        sql += ' AND timestamp >= ?';
        params.push(filters.start_time);
    }

    if (filters.end_time) {
        sql += ' AND timestamp <= ?';
        params.push(filters.end_time);
    }

    sql += ' ORDER BY timestamp DESC';
    sql += ` LIMIT ? OFFSET ?`;
    params.push(filters.limit || 100);
    params.push(filters.offset || 0);

    const stmt = getDb().prepare(sql);
    return stmt.all(...params);
}

// ============================================================
// System State Methods
// ============================================================

/**
 * Get a system state value
 * @param {string} key - State key
 * @returns {string|null} State value or null
 */
function getState(key) {
    const stmt = getDb().prepare('SELECT value FROM system_state WHERE key = ?');
    const row = stmt.get(key);
    return row ? row.value : null;
}

/**
 * Set a system state value
 * @param {string} key - State key
 * @param {string} value - State value
 * @returns {boolean} True if updated
 */
function setState(key, value) {
    const stmt = getDb().prepare(`
    INSERT INTO system_state (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET 
      value = excluded.value,
      updated_at = datetime('now')
  `);

    const result = stmt.run(key, value);
    return result.changes > 0;
}

/**
 * Get all system state as object
 * @returns {Object} All state key-value pairs
 */
function getAllState() {
    const stmt = getDb().prepare('SELECT key, value FROM system_state');
    const rows = stmt.all();

    const result = {};
    for (const { key, value } of rows) {
        result[key] = value;
    }

    return result;
}

module.exports = {
    initialize,
    getDb,
    close,
    // Readings
    insertReading,
    getReadings,
    getLatestReadings,
    getReadingsCount,
    // Commands
    insertCommand,
    updateCommandStatus,
    getCommands,
    // State
    getState,
    setState,
    getAllState
};
