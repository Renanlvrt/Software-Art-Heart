/**
 * Control API Routes
 * 
 * Provides endpoints for sending control commands to the motor/pump system.
 * All commands are validated and logged for audit trail.
 * 
 * @module api/control
 */

const express = require('express');
const router = express.Router();
const controller = require('../services/controller');
const db = require('../database/db');

/**
 * Rate limiting state
 * Prevents command spam (max 10 commands per second)
 */
const rateLimiter = {
    commands: [],
    maxPerSecond: 10,

    /**
     * Check if rate limit exceeded
     * @returns {boolean} True if allowed, false if rate limited
     */
    check() {
        const now = Date.now();
        // Remove commands older than 1 second
        this.commands = this.commands.filter(t => now - t < 1000);

        if (this.commands.length >= this.maxPerSecond) {
            return false;
        }

        this.commands.push(now);
        return true;
    }
};

/**
 * POST /api/control
 * Send a control command to the motor/pump system
 * 
 * Body:
 * - target: Required - 'motor', 'pump_left', 'pump_right', or 'system'
 * - action: Required - 'start', 'stop', 'set_speed', or 'emergency_stop'
 * - params: Optional - Additional parameters (e.g., { speed: 50 })
 */
router.post('/control', (req, res, next) => {
    try {
        // Rate limiting
        if (!rateLimiter.check()) {
            return res.status(429).json({
                error: 'Rate Limit Exceeded',
                message: 'Too many commands. Please wait before sending more.',
                retryAfter: 1
            });
        }

        const { target, action, params } = req.body;

        // Validate input
        const validationError = controller.validateCommand({ target, action, params });
        if (validationError) {
            return res.status(400).json({
                error: 'Validation Error',
                message: validationError
            });
        }

        // Process command
        const result = controller.processCommand({ target, action, params });

        // Emit state update to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('state', {
                motor: {
                    state: db.getState('motor_state') || 'stopped',
                    speed: parseInt(db.getState('motor_speed') || '0', 10),
                    target_speed: parseInt(db.getState('motor_target_speed') || '0', 10)
                }
            });

            // Emit command confirmation
            io.emit('control_executed', result);
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/control/emergency-stop
 * Emergency stop - immediately halts all motors
 * No rate limiting for emergency stop
 */
router.post('/control/emergency-stop', (req, res, next) => {
    try {
        console.log('[EMERGENCY] Emergency stop triggered!');

        // Process emergency stop
        const result = controller.processCommand({
            target: 'system',
            action: 'emergency_stop',
            params: {}
        });

        // Emit state update to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('emergency_stop', {
                timestamp: new Date().toISOString(),
                message: 'Emergency stop activated'
            });

            io.emit('state', {
                motor: {
                    state: 'stopped',
                    speed: 0,
                    target_speed: 0
                }
            });
        }

        res.json({
            success: true,
            message: 'Emergency stop executed',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/control/state
 * Get current motor/system state
 */
router.get('/control/state', (req, res, next) => {
    try {
        const state = db.getAllState();

        res.json({
            success: true,
            data: {
                motor: {
                    state: state.motor_state || 'stopped',
                    speed: parseInt(state.motor_speed || '0', 10),
                    target_speed: parseInt(state.motor_target_speed || '0', 10)
                },
                hardware: {
                    mode: state.hardware_mode || 'simulator',
                    connection: state.connection_status || 'disconnected'
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/control/history
 * Get command history
 * 
 * Query params:
 * - limit: Max number of results (default 100)
 * - offset: Pagination offset (default 0)
 */
router.get('/control/history', (req, res, next) => {
    try {
        const filters = {
            limit: parseInt(req.query.limit, 10) || 100,
            offset: parseInt(req.query.offset, 10) || 0
        };

        const commands = db.getCommands(filters);

        // Parse params JSON
        const formattedCommands = commands.map(cmd => ({
            ...cmd,
            params: cmd.params ? JSON.parse(cmd.params) : {}
        }));

        res.json({
            success: true,
            data: formattedCommands
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
