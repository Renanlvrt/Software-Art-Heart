/**
 * Controller Service
 * 
 * Handles motor/pump command processing, validation, and execution.
 * All commands are logged for audit trail.
 * 
 * @module services/controller
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

/**
 * Valid targets for control commands
 */
const VALID_TARGETS = ['motor', 'pump_left', 'pump_right', 'system'];

/**
 * Valid actions for control commands
 */
const VALID_ACTIONS = ['start', 'stop', 'set_speed', 'emergency_stop'];

/**
 * Validate a control command
 * @param {Object} command - The command to validate
 * @param {string} command.target - Target device
 * @param {string} command.action - Action to perform
 * @param {Object} [command.params] - Additional parameters
 * @returns {string|null} Error message or null if valid
 */
function validateCommand(command) {
    if (!command) {
        return 'Command is required';
    }

    if (!command.target) {
        return 'Target is required';
    }

    if (!VALID_TARGETS.includes(command.target)) {
        return `Invalid target. Must be one of: ${VALID_TARGETS.join(', ')}`;
    }

    if (!command.action) {
        return 'Action is required';
    }

    if (!VALID_ACTIONS.includes(command.action)) {
        return `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`;
    }

    // Validate speed parameter if set_speed action
    if (command.action === 'set_speed') {
        if (!command.params || typeof command.params.speed !== 'number') {
            return 'Speed parameter is required for set_speed action';
        }

        if (command.params.speed < 0 || command.params.speed > 100) {
            return 'Speed must be between 0 and 100';
        }
    }

    return null;
}

/**
 * Process a control command
 * @param {Object} command - The command to process
 * @returns {Object} The processed command with result
 */
function processCommand(command) {
    // Create command record
    const commandRecord = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        target: command.target,
        action: command.action,
        params: command.params || {},
        status: 'pending'
    };

    try {
        // Execute command based on action
        switch (command.action) {
            case 'start':
                executeStart(command.target, command.params);
                break;

            case 'stop':
                executeStop(command.target);
                break;

            case 'set_speed':
                executeSetSpeed(command.target, command.params.speed);
                break;

            case 'emergency_stop':
                executeEmergencyStop();
                break;

            default:
                throw new Error(`Unknown action: ${command.action}`);
        }

        // Mark as executed
        commandRecord.status = 'executed';

    } catch (error) {
        // Mark as failed
        commandRecord.status = 'failed';
        commandRecord.error_message = error.message;

        // Log and re-throw
        console.error(`[Controller] Command failed:`, error.message);
    }

    // Save to database for audit trail
    db.insertCommand(commandRecord);

    // Return result
    return {
        ...commandRecord,
        motor_state: db.getState('motor_state'),
        motor_speed: parseInt(db.getState('motor_speed') || '0', 10)
    };
}

/**
 * Execute start command
 * @param {string} target - Target device
 * @param {Object} [params] - Optional parameters
 */
function executeStart(target, params = {}) {
    console.log(`[Controller] Starting ${target}`, params);

    // Update state
    db.setState('motor_state', 'running');

    // Set initial speed if provided, otherwise use last target speed or default
    const speed = params.speed ?? parseInt(db.getState('motor_target_speed') || '50', 10);
    db.setState('motor_speed', String(speed));
    db.setState('motor_target_speed', String(speed));

    // TODO: In Phase 2, send actual commands to ESP32 via serial
    console.log(`[Controller] Motor started at ${speed}% speed`);
}

/**
 * Execute stop command
 * @param {string} target - Target device
 */
function executeStop(target) {
    console.log(`[Controller] Stopping ${target}`);

    // Update state
    db.setState('motor_state', 'stopped');
    db.setState('motor_speed', '0');
    // Keep target speed for resume

    // TODO: In Phase 2, send actual commands to ESP32 via serial
    console.log(`[Controller] Motor stopped`);
}

/**
 * Execute set_speed command
 * @param {string} target - Target device
 * @param {number} speed - Speed percentage (0-100)
 */
function executeSetSpeed(target, speed) {
    console.log(`[Controller] Setting ${target} speed to ${speed}%`);

    // Update state
    db.setState('motor_target_speed', String(speed));

    // If motor is running, update actual speed
    if (db.getState('motor_state') === 'running') {
        db.setState('motor_speed', String(speed));
    }

    // TODO: In Phase 2, send actual commands to ESP32 via serial
    console.log(`[Controller] Speed set to ${speed}%`);
}

/**
 * Execute emergency stop
 * Immediately stops all motors regardless of state
 */
function executeEmergencyStop() {
    console.log(`[Controller] EMERGENCY STOP ACTIVATED`);

    // Update all states immediately
    db.setState('motor_state', 'stopped');
    db.setState('motor_speed', '0');
    db.setState('motor_target_speed', '0');

    // TODO: In Phase 2, send emergency stop to ESP32 via serial
    // This should be a high-priority command that bypasses normal queuing

    console.log(`[Controller] All motors stopped`);
}

/**
 * Get current motor state
 * @returns {Object} Current motor state
 */
function getMotorState() {
    return {
        state: db.getState('motor_state') || 'stopped',
        speed: parseInt(db.getState('motor_speed') || '0', 10),
        target_speed: parseInt(db.getState('motor_target_speed') || '0', 10)
    };
}

module.exports = {
    validateCommand,
    processCommand,
    getMotorState,
    VALID_TARGETS,
    VALID_ACTIONS
};
