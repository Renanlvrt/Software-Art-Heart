/**
 * Database Schema and Migrations
 * 
 * Defines SQLite tables for the Artificial Heart Testing Platform:
 * - sensor_readings: Stores all sensor data (temp, pressure, flow, etc.)
 * - control_commands: Audit log of all motor/pump commands
 * - system_state: Current state snapshot (latest values)
 * 
 * @module database/schema
 */

/**
 * SQL statements for creating tables
 */
const SCHEMA = {
  /**
   * Sensor readings table
   * Stores all sensor data with timestamps
   */
  sensor_readings: `
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      sensor_type TEXT NOT NULL CHECK(sensor_type IN ('temperature', 'pressure', 'pressure2', 'flow_rate', 'motor_speed', 'power')),
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      motor_state TEXT DEFAULT 'stopped' CHECK(motor_state IN ('stopped', 'running', 'error')),
      source TEXT DEFAULT 'simulator' CHECK(source IN ('simulator', 'playback', 'esp32', 'manual')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `,

  /**
   * Control commands table
   * Audit log of all commands sent to hardware
   */
  control_commands: `
    CREATE TABLE IF NOT EXISTS control_commands (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      target TEXT NOT NULL CHECK(target IN ('motor', 'pump_left', 'pump_right', 'system')),
      action TEXT NOT NULL CHECK(action IN ('start', 'stop', 'set_speed', 'emergency_stop')),
      params TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'executed', 'failed')),
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `,

  /**
   * System state table
   * Stores latest state for quick retrieval
   */
  system_state: `
    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `,

  /**
   * Indexes for performance
   */
  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON sensor_readings(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_readings_sensor_type ON sensor_readings(sensor_type)',
    'CREATE INDEX IF NOT EXISTS idx_readings_composite ON sensor_readings(sensor_type, timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON control_commands(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_commands_status ON control_commands(status)'
  ]
};

/**
 * Initial system state values
 */
const INITIAL_STATE = [
  { key: 'motor_state', value: 'stopped' },
  { key: 'motor_speed', value: '0' },
  { key: 'motor_target_speed', value: '0' },
  { key: 'hardware_mode', value: 'simulator' },
  { key: 'connection_status', value: 'disconnected' }
];

/**
 * Get all table creation SQL statements
 * @returns {string[]} Array of SQL CREATE TABLE statements
 */
function getTableStatements() {
  return [
    SCHEMA.sensor_readings,
    SCHEMA.control_commands,
    SCHEMA.system_state
  ];
}

/**
 * Get all index creation SQL statements
 * @returns {string[]} Array of SQL CREATE INDEX statements
 */
function getIndexStatements() {
  return SCHEMA.indexes;
}

/**
 * Get initial state data
 * @returns {Array<{key: string, value: string}>} Initial state key-value pairs
 */
function getInitialState() {
  return INITIAL_STATE;
}

module.exports = {
  SCHEMA,
  INITIAL_STATE,
  getTableStatements,
  getIndexStatements,
  getInitialState
};
