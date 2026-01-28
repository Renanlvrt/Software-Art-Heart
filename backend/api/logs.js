/**
 * Sensor Logs API Routes
 * 
 * Provides endpoints for storing, retrieving, and exporting sensor data.
 * 
 * @module api/logs
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { validateReading, validateFilters } = require('../utils/validators');

/**
 * GET /api/logs
 * Retrieve sensor readings with optional filters
 * 
 * Query params:
 * - sensor_type: Filter by sensor type
 * - start_time: ISO timestamp for range start
 * - end_time: ISO timestamp for range end
 * - limit: Max number of results (default 1000)
 * - offset: Pagination offset (default 0)
 */
router.get('/logs', (req, res, next) => {
    try {
        const filters = {
            sensor_type: req.query.sensor_type,
            start_time: req.query.start_time,
            end_time: req.query.end_time,
            limit: parseInt(req.query.limit, 10) || 1000,
            offset: parseInt(req.query.offset, 10) || 0
        };

        // Validate filters
        const validationError = validateFilters(filters);
        if (validationError) {
            return res.status(400).json({
                error: 'Validation Error',
                message: validationError
            });
        }

        // Get readings
        const readings = db.getReadings(filters);
        const totalCount = db.getReadingsCount(filters);

        res.json({
            success: true,
            data: readings,
            pagination: {
                total: totalCount,
                limit: filters.limit,
                offset: filters.offset,
                hasMore: filters.offset + readings.length < totalCount
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/logs/latest
 * Get the most recent reading for each sensor type
 */
router.get('/logs/latest', (req, res, next) => {
    try {
        const latestReadings = db.getLatestReadings();

        res.json({
            success: true,
            data: latestReadings,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/logs
 * Add a new sensor reading
 * 
 * Body:
 * - sensor_type: Required - type of sensor
 * - value: Required - sensor value (number)
 * - unit: Required - unit of measurement
 * - motor_state: Optional - current motor state
 * - source: Optional - data source (simulator/esp32/manual)
 */
router.post('/logs', (req, res, next) => {
    try {
        const { sensor_type, value, unit, motor_state, source } = req.body;

        // Validate input
        const validationError = validateReading({ sensor_type, value, unit });
        if (validationError) {
            return res.status(400).json({
                error: 'Validation Error',
                message: validationError
            });
        }

        // Create reading object
        const reading = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            sensor_type,
            value: parseFloat(value),
            unit,
            motor_state: motor_state || db.getState('motor_state') || 'stopped',
            source: source || 'manual'
        };

        // Insert into database
        const result = db.insertReading(reading);

        // Emit to connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('reading', reading);
        }

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/export
 * Export sensor readings as CSV
 * 
 * Query params: Same as GET /api/logs
 */
router.get('/export', (req, res, next) => {
    try {
        const filters = {
            sensor_type: req.query.sensor_type,
            start_time: req.query.start_time,
            end_time: req.query.end_time,
            limit: parseInt(req.query.limit, 10) || 100000, // Higher limit for export
            offset: 0
        };

        // Get all readings matching filters
        const readings = db.getReadings(filters);

        // Generate CSV
        const csv = generateCSV(readings);

        // Set headers for download
        const filename = `sensor_logs_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(csv);
    } catch (error) {
        next(error);
    }
});

/**
 * Generate CSV from readings array
 * @param {Array} readings - Array of reading objects
 * @returns {string} CSV content
 */
function generateCSV(readings) {
    if (readings.length === 0) {
        return 'id,timestamp,sensor_type,value,unit,motor_state,source\n';
    }

    const headers = ['id', 'timestamp', 'sensor_type', 'value', 'unit', 'motor_state', 'source'];
    const rows = readings.map(reading =>
        headers.map(h => escapeCSV(reading[h])).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Escape a value for CSV
 * @param {any} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSV(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

module.exports = router;
