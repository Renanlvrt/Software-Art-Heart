/**
 * Hardware Simulator
 * 
 * Generates realistic fake sensor data for testing and development.
 * Simulates physiological patterns like pulsatile blood flow.
 * 
 * @module hardware/simulator
 */

const { v4: uuidv4 } = require('uuid');
const config = require('./config.json');

/**
 * Simulator state
 */
let isRunning = false;
let intervalId = null;
let tickCount = 0;

/**
 * Simulated motor state
 */
let motorState = {
    running: false,
    speed: 0,
    targetSpeed: 0
};

/**
 * Start the simulator
 * @param {Function} onReading - Callback for each reading (receives reading object)
 */
function start(onReading) {
    if (isRunning) {
        console.log('[Simulator] Already running');
        return;
    }

    isRunning = true;
    tickCount = 0;

    const intervalMs = parseInt(process.env.SIMULATOR_INTERVAL_MS, 10) || config.interval_ms || 1000;

    console.log(`[Simulator] Starting with ${intervalMs}ms interval`);

    intervalId = setInterval(() => {
        tickCount++;

        // Generate readings for all sensor types
        const readings = generateAllReadings();

        // Call callback for each reading
        for (const reading of readings) {
            if (onReading) {
                onReading(reading);
            }
        }

    }, intervalMs);
}

/**
 * Stop the simulator
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

    console.log('[Simulator] Stopped');
}

/**
 * Check if simulator is running
 * @returns {boolean} True if running
 */
function isActive() {
    return isRunning;
}

/**
 * Generate readings for all sensor types
 * @returns {Array} Array of reading objects
 */
function generateAllReadings() {
    const timestamp = new Date().toISOString();
    const db = require('../database/db');

    // Get motor state from database
    const dbMotorState = db.getState('motor_state') || 'stopped';
    const dbMotorSpeed = parseInt(db.getState('motor_speed') || '0', 10);

    motorState.running = dbMotorState === 'running';
    motorState.speed = dbMotorSpeed;

    const readings = [];

    // Temperature reading
    readings.push({
        id: uuidv4(),
        timestamp,
        sensor_type: 'temperature',
        value: generateTemperature(),
        unit: '°C',
        motor_state: dbMotorState,
        source: 'simulator'
    });

    // Pressure reading (pulsatile)
    readings.push({
        id: uuidv4(),
        timestamp,
        sensor_type: 'pressure',
        value: generatePressure(),
        unit: 'mmHg',
        motor_state: dbMotorState,
        source: 'simulator'
    });

    // Flow rate reading
    readings.push({
        id: uuidv4(),
        timestamp,
        sensor_type: 'flow_rate',
        value: generateFlowRate(),
        unit: 'L/min',
        motor_state: dbMotorState,
        source: 'simulator'
    });

    // Motor speed reading
    readings.push({
        id: uuidv4(),
        timestamp,
        sensor_type: 'motor_speed',
        value: generateMotorSpeed(),
        unit: 'RPM',
        motor_state: dbMotorState,
        source: 'simulator'
    });

    // Power reading
    readings.push({
        id: uuidv4(),
        timestamp,
        sensor_type: 'power',
        value: generatePower(),
        unit: 'W',
        motor_state: dbMotorState,
        source: 'simulator'
    });

    return readings;
}

// ============================================================
// Sensor Value Generators
// ============================================================

/**
 * Generate temperature reading
 * Slow drift with small variations
 * @returns {number} Temperature in °C
 */
function generateTemperature() {
    const cfg = config.sensors.temperature;
    const baseTemp = cfg.baseline;

    // Slow drift over time (sine wave with long period)
    const drift = Math.sin(tickCount / 100) * 0.5;

    // Random noise
    const noise = (Math.random() - 0.5) * cfg.noise;

    // Motor running adds heat
    const motorHeat = motorState.running ? (motorState.speed / 100) * 2 : 0;

    const value = baseTemp + drift + noise + motorHeat;

    // Clamp to range
    return Math.round(Math.max(cfg.min, Math.min(cfg.max, value)) * 10) / 10;
}

/**
 * Generate pressure reading
 * Pulsatile pattern simulating cardiac cycle
 * @returns {number} Pressure in mmHg
 */
function generatePressure() {
    const cfg = config.sensors.pressure;

    if (!motorState.running) {
        // Static pressure when motor off
        return cfg.diastolic + (Math.random() - 0.5) * 5;
    }

    // Simulate cardiac cycle (pulsatile)
    // Heart rate based on motor speed (60-120 BPM mapped to 0-100% speed)
    const heartRate = 60 + (motorState.speed / 100) * 60;
    const cyclePosition = (tickCount * (heartRate / 60)) % 1;

    // Pressure waveform: systolic peak followed by diastolic baseline
    let pressure;
    if (cyclePosition < 0.3) {
        // Systolic phase (30% of cycle)
        const systolicProgress = cyclePosition / 0.3;
        const systolicShape = Math.sin(systolicProgress * Math.PI);
        pressure = cfg.diastolic + (cfg.systolic - cfg.diastolic) * systolicShape;
    } else {
        // Diastolic phase (70% of cycle)
        const diastolicProgress = (cyclePosition - 0.3) / 0.7;
        pressure = cfg.diastolic + (cfg.systolic - cfg.diastolic) * 0.2 * Math.exp(-diastolicProgress * 3);
    }

    // Add noise
    pressure += (Math.random() - 0.5) * cfg.noise;

    // Clamp to range
    return Math.round(Math.max(cfg.min, Math.min(cfg.max, pressure)));
}

/**
 * Generate flow rate reading
 * Proportional to motor speed with variations
 * @returns {number} Flow rate in L/min
 */
function generateFlowRate() {
    const cfg = config.sensors.flow_rate;

    if (!motorState.running) {
        return 0;
    }

    // Base flow proportional to motor speed
    const baseFlow = (motorState.speed / 100) * cfg.max_flow;

    // Pulsatile variation (synced with pressure)
    const heartRate = 60 + (motorState.speed / 100) * 60;
    const cyclePosition = (tickCount * (heartRate / 60)) % 1;
    const pulsatile = Math.sin(cyclePosition * Math.PI * 2) * 0.5;

    // Add noise
    const noise = (Math.random() - 0.5) * cfg.noise;

    const value = baseFlow * (1 + pulsatile * 0.2) + noise;

    // Clamp to range
    return Math.round(Math.max(cfg.min, Math.min(cfg.max, value)) * 10) / 10;
}

/**
 * Generate motor speed reading
 * Shows actual RPM with startup/shutdown curves
 * @returns {number} Speed in RPM
 */
function generateMotorSpeed() {
    const cfg = config.sensors.motor_speed;

    if (!motorState.running) {
        return 0;
    }

    // Target RPM based on speed percentage
    const targetRPM = (motorState.speed / 100) * cfg.max_rpm;

    // Add small fluctuations
    const noise = (Math.random() - 0.5) * cfg.noise;

    const value = targetRPM + noise;

    // Clamp to range
    return Math.round(Math.max(cfg.min, Math.min(cfg.max, value)));
}

/**
 * Generate power consumption reading
 * Based on motor speed with efficiency curve
 * @returns {number} Power in Watts
 */
function generatePower() {
    const cfg = config.sensors.power;

    if (!motorState.running) {
        // Standby power
        return cfg.standby || 2;
    }

    // Power roughly proportional to speed^2 (motor characteristic)
    const speedFactor = motorState.speed / 100;
    const basePower = cfg.min_running + (cfg.max - cfg.min_running) * Math.pow(speedFactor, 2);

    // Add efficiency variations
    const efficiency = 0.85 + Math.sin(tickCount / 50) * 0.05;

    // Add noise
    const noise = (Math.random() - 0.5) * cfg.noise;

    const value = basePower / efficiency + noise;

    // Clamp to range
    return Math.round(Math.max(cfg.min, Math.min(cfg.max, value)) * 10) / 10;
}

// ============================================================
// Test/Debug Functions
// ============================================================

/**
 * Set motor state for testing
 * @param {boolean} running - Motor running state
 * @param {number} speed - Motor speed percentage
 */
function setMotorState(running, speed) {
    motorState.running = running;
    motorState.speed = speed;
}

/**
 * Get current simulator state
 * @returns {Object} Simulator state
 */
function getState() {
    return {
        isRunning,
        tickCount,
        motorState: { ...motorState }
    };
}

module.exports = {
    start,
    stop,
    isActive,
    generateAllReadings,
    setMotorState,
    getState
};
