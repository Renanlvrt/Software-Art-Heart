/**
 * Historical Replay Service
 * 
 * Stateful replay engine for the Analysis page. Reads demoTable.db
 * and provides VCR-style controls (play, pause, seek, speed).
 * 
 * Operates on a separate Socket.io namespace ('/replay') so it
 * doesn't interfere with the live dashboard feed.
 * 
 * @module services/replay
 */

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const hardwareConfig = require('../hardware/config.json');

// === State ===
let demoDb = null;
let totalRows = 0;
let cursor = 0;           // Current rowid position
let isPlaying = false;
let intervalId = null;
let tickMs = 1000;         // Default 1x speed (1 sec/row)
let onEmit = null;         // Callback to emit data to client

// Prepared statements
let stmtNext = null;
let stmtSeekContext = null;
let stmtCount = null;

/**
 * Initialize the replay service — open DB and prepare statements
 */
function initialize() {
    if (demoDb) return; // Already initialized

    const dbPath = path.resolve(
        __dirname,
        '../hardware',
        hardwareConfig.playback?.db_path || '../database/demoTable.db'
    );

    console.log(`[Replay] Opening database: ${dbPath}`);
    demoDb = new Database(dbPath);
    demoDb.pragma('journal_mode = WAL');

    totalRows = demoDb.prepare('SELECT COUNT(*) as cnt FROM sensor_data').get().cnt;
    console.log(`[Replay] Database contains ${totalRows} rows`);

    // Fetch next row after cursor
    stmtNext = demoDb.prepare('SELECT rowid, * FROM sensor_data WHERE rowid > ? ORDER BY rowid ASC LIMIT 1');

    // Fetch context rows around a position (for seek — previous N rows)
    stmtSeekContext = demoDb.prepare('SELECT rowid, * FROM sensor_data WHERE rowid <= ? ORDER BY rowid DESC LIMIT ?');

    // Count total
    stmtCount = demoDb.prepare('SELECT COUNT(*) as cnt FROM sensor_data');
}

/**
 * Convert a DB row to 4 readings (one per sensor)
 */
function rowToReadings(row) {
    const timestamp = new Date().toISOString();
    return [
        { id: uuidv4(), timestamp, sensor_type: 'pressure', value: row.Pressure1, unit: 'mmHg', source: 'replay', rowid: row.rowid },
        { id: uuidv4(), timestamp, sensor_type: 'pressure2', value: row.Pressure2, unit: 'mmHg', source: 'replay', rowid: row.rowid },
        { id: uuidv4(), timestamp, sensor_type: 'temperature', value: row.Temp, unit: '°C', source: 'replay', rowid: row.rowid },
        { id: uuidv4(), timestamp, sensor_type: 'flow_rate', value: row.FlowRate, unit: 'L/min', source: 'replay', rowid: row.rowid }
    ];
}

/**
 * Start/resume playback
 */
function play(emitCallback) {
    if (isPlaying) return;
    onEmit = emitCallback || onEmit;
    isPlaying = true;

    intervalId = setInterval(() => {
        const row = stmtNext.get(cursor);
        if (!row) {
            // Reached end of data
            pause();
            if (onEmit) onEmit('replay_end', { cursor, totalRows });
            return;
        }

        cursor = row.rowid;
        const readings = rowToReadings(row);
        if (onEmit) onEmit('replay_data', { readings, cursor, totalRows });
    }, tickMs);

    console.log(`[Replay] Playing from rowid ${cursor} at ${tickMs}ms/row`);
}

/**
 * Pause playback
 */
function pause() {
    isPlaying = false;
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    console.log(`[Replay] Paused at rowid ${cursor}`);
}

/**
 * Restart from beginning
 */
function restart(emitCallback) {
    pause();
    cursor = 0;
    if (emitCallback) onEmit = emitCallback;
    play(onEmit);
}

/**
 * Seek to a specific position and return context data
 * @param {number} targetRowid - Row to jump to (1-based)
 * @param {number} contextSize - Number of preceding rows to return for graph fill
 */
function seek(targetRowid, contextSize = 50) {
    const wasPlaying = isPlaying;
    pause();

    // Clamp to valid range
    targetRowid = Math.max(1, Math.min(targetRowid, totalRows));
    cursor = targetRowid;

    // Get context rows (previous N including current position)
    const contextRows = stmtSeekContext.all(targetRowid, contextSize);
    contextRows.reverse(); // chronological order

    // Convert to readings
    const contextReadings = contextRows.map(row => rowToReadings(row));

    console.log(`[Replay] Seeked to rowid ${targetRowid}, returning ${contextRows.length} context rows`);

    // If was playing, resume
    if (wasPlaying) {
        play(onEmit);
    }

    return { contextReadings, cursor, totalRows };
}

/**
 * Change playback speed
 * @param {number} speedMultiplier - 1=normal, 2=2x, 5=5x, 10=10x
 */
function setSpeed(speedMultiplier) {
    const baseMs = 1000; // 1x = 1 second per row
    tickMs = Math.max(50, Math.round(baseMs / speedMultiplier));

    console.log(`[Replay] Speed set to ${speedMultiplier}x (${tickMs}ms/row)`);

    // If playing, restart the interval with new speed
    if (isPlaying) {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
            const row = stmtNext.get(cursor);
            if (!row) {
                pause();
                if (onEmit) onEmit('replay_end', { cursor, totalRows });
                return;
            }
            cursor = row.rowid;
            const readings = rowToReadings(row);
            if (onEmit) onEmit('replay_data', { readings, cursor, totalRows });
        }, tickMs);
    }

    return { speedMultiplier, tickMs };
}

/**
 * Get current state
 */
function getState() {
    return {
        isPlaying,
        cursor,
        totalRows,
        tickMs,
        progress: totalRows > 0 ? Math.round((cursor / totalRows) * 100) : 0
    };
}

/**
 * Clean up
 */
function close() {
    pause();
    if (demoDb) {
        demoDb.close();
        demoDb = null;
    }
    stmtNext = null;
    stmtSeekContext = null;
    stmtCount = null;
    console.log('[Replay] Closed');
}

module.exports = {
    initialize,
    play,
    pause,
    restart,
    seek,
    setSpeed,
    getState,
    close
};
