/**
 * Health Check API Routes
 * 
 * Provides system health and status endpoints for monitoring.
 * 
 * @module api/health
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * GET /api/health
 * Returns system health status and current state
 */
router.get('/health', (req, res) => {
    try {
        // Check database connectivity
        const dbStatus = db.getDb() ? 'connected' : 'disconnected';

        // Get system state
        const systemState = db.getAllState();

        // Get latest readings
        const latestReadings = db.getLatestReadings();

        // Get counts
        const readingsCount = db.getReadingsCount();
        const commandsCount = db.getCommands({ limit: 1 }).length > 0
            ? db.getDb().prepare('SELECT COUNT(*) as count FROM control_commands').get().count
            : 0;

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0',
            database: {
                status: dbStatus,
                readings_count: readingsCount,
                commands_count: commandsCount
            },
            hardware: {
                mode: systemState.hardware_mode || 'simulator',
                connection: systemState.connection_status || 'disconnected'
            },
            motor: {
                state: systemState.motor_state || 'stopped',
                speed: parseInt(systemState.motor_speed || '0', 10),
                target_speed: parseInt(systemState.motor_target_speed || '0', 10)
            },
            sensors: formatLatestReadings(latestReadings),
            memory: {
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /api/status
 * Quick status check (lightweight)
 */
router.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

/**
 * Format latest readings for response
 * @param {Object} readings - Map of sensor_type to reading
 * @returns {Object} Formatted readings
 */
function formatLatestReadings(readings) {
    const result = {};

    for (const [type, reading] of Object.entries(readings)) {
        result[type] = {
            value: reading.value,
            unit: reading.unit,
            timestamp: reading.timestamp,
            status: 'ok' // TODO: Add threshold checking in Phase 2
        };
    }

    return result;
}

module.exports = router;
