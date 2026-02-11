/**
 * Strict Playback Engine — Live Wait Mode
 * 
 * Polls demoTable.db for new rows on each tick. When all rows are consumed,
 * enters "live wait" mode — keeps polling for new data appended by an
 * external writer (e.g., Arduino/C++).
 * 
 * No looping. No interpolation. Exact values only.
 * 
 * @module hardware/playback
 */

const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config.json');

/**
 * Playback state
 */
let isRunning = false;
let intervalId = null;
let tickCount = 0;
let lastRowId = 0;       // Track last processed rowid
let demoDb = null;
let pollStmt = null;     // Prepared statement for polling
let waiting = false;     // True when we've exhausted all rows

/**
 * Start the playback engine
 * @param {Function} onReading - Callback for each reading (receives reading object)
 */
function start(onReading) {
    if (isRunning) {
        console.log('[Playback] Already running');
        return;
    }

    // Resolve path to demoTable.db
    const dbPath = path.resolve(
        __dirname,
        config.playback?.db_path || '../database/demoTable.db'
    );

    console.log(`[Playback] Opening database: ${dbPath}`);

    // Open database with WAL mode for concurrent read/write
    demoDb = new Database(dbPath);
    demoDb.pragma('journal_mode = WAL');
    console.log('[Playback] WAL mode enabled');

    // Count total rows for logging
    const totalRows = demoDb.prepare('SELECT COUNT(*) as cnt FROM sensor_data').get().cnt;
    console.log(`[Playback] Database contains ${totalRows} rows`);

    // Prepare the polling statement — fetch next row after last processed rowid
    pollStmt = demoDb.prepare('SELECT rowid, * FROM sensor_data WHERE rowid > ? ORDER BY rowid ASC LIMIT 1');

    isRunning = true;
    tickCount = 0;
    lastRowId = 0;
    waiting = false;

    const tickMs = config.playback?.tick_ms || 500;
    console.log(`[Playback] Starting with ${tickMs}ms tick interval (poll mode, no loop)`);

    intervalId = setInterval(() => {
        tickCount++;

        // Poll for next row
        const row = pollStmt.get(lastRowId);

        if (!row) {
            // No new data — enter/stay in live wait mode
            if (!waiting) {
                waiting = true;
                console.log(`[Playback] All rows consumed (last rowid: ${lastRowId}). Waiting for new data...`);
            }
            return; // Skip this tick, graph pauses
        }

        // Got a new row — exit wait mode if we were waiting
        if (waiting) {
            waiting = false;
            console.log(`[Playback] New data detected at rowid ${row.rowid}. Resuming playback.`);
        }

        // Update cursor
        lastRowId = row.rowid;

        // Generate real-time timestamp (ignore DB Time column)
        const timestamp = new Date().toISOString();

        // Emit 4 readings — one per sensor column, exact values from DB
        const readings = [
            {
                id: uuidv4(),
                timestamp,
                sensor_type: 'pressure',
                value: row.Pressure1,
                unit: 'mmHg',
                source: 'playback'
            },
            {
                id: uuidv4(),
                timestamp,
                sensor_type: 'pressure2',
                value: row.Pressure2,
                unit: 'mmHg',
                source: 'playback'
            },
            {
                id: uuidv4(),
                timestamp,
                sensor_type: 'temperature',
                value: row.Temp,
                unit: '°C',
                source: 'playback'
            },
            {
                id: uuidv4(),
                timestamp,
                sensor_type: 'flow_rate',
                value: row.FlowRate,
                unit: 'L/min',
                source: 'playback'
            }
        ];

        // Emit each reading via callback
        for (const reading of readings) {
            if (onReading) {
                onReading(reading);
            }
        }

    }, tickMs);
}

/**
 * Stop the playback engine
 */
function stop() {
    if (!isRunning) {
        return;
    }

    isRunning = false;

    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    pollStmt = null;

    if (demoDb) {
        demoDb.close();
        demoDb = null;
    }

    console.log('[Playback] Stopped');
}

/**
 * Check if playback is running
 * @returns {boolean} True if running
 */
function isActive() {
    return isRunning;
}

/**
 * Get current playback state
 * @returns {Object} Playback state
 */
function getState() {
    return {
        isRunning,
        tickCount,
        lastRowId,
        waiting,
        mode: waiting ? 'live_wait' : 'streaming'
    };
}

module.exports = {
    start,
    stop,
    isActive,
    getState
};
