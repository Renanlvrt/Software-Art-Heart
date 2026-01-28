/**
 * Dashboard Module
 * 
 * Manages the sensor gauges and real-time value displays.
 * 
 * @module dashboard
 */

const Dashboard = (function () {
    // Sensor state
    const sensorValues = {
        temperature: null,
        pressure: null,
        flow_rate: null,
        motor_speed: null,
        power: null
    };

    let motorState = 'stopped';

    /**
     * Initialize dashboard
     */
    function init() {
        console.log('[Dashboard] Initializing...');

        // Register for socket events
        SocketClient.on('reading', handleReading);
        SocketClient.on('state', handleStateUpdate);

        // Initial UI setup
        updateAllGauges();

        console.log('[Dashboard] Ready');
    }

    /**
     * Handle incoming sensor reading
     * @param {Object} reading - Sensor reading data
     */
    function handleReading(reading) {
        if (!reading || !reading.sensor_type) return;

        const { sensor_type, value, unit, motor_state } = reading;

        // Store value
        sensorValues[sensor_type] = { value, unit, timestamp: reading.timestamp };

        // Update motor state if provided
        if (motor_state) {
            motorState = motor_state;
            updateMotorStateUI();
        }

        // Update gauge
        updateGauge(sensor_type, value);
    }

    /**
     * Handle state update
     * @param {Object} state - System state data
     */
    function handleStateUpdate(state) {
        if (state.motor) {
            motorState = state.motor.state;
            updateMotorStateUI();

            // Update motor speed if running
            if (motorState === 'running' && state.motor.speed !== undefined) {
                sensorValues.motor_speed = {
                    value: state.motor.speed * 30, // Convert % to approx RPM
                    unit: 'RPM'
                };
                updateGauge('motor_speed', sensorValues.motor_speed.value);
            }
        }

        if (state.hardware_mode) {
            const modeEl = document.querySelector('.mode-value');
            if (modeEl) {
                modeEl.textContent = state.hardware_mode.charAt(0).toUpperCase() +
                    state.hardware_mode.slice(1);
                modeEl.dataset.mode = state.hardware_mode;
            }
        }
    }

    /**
     * Update a single gauge
     * @param {string} sensorType - Type of sensor
     * @param {number} value - Current value
     */
    function updateGauge(sensorType, value) {
        const card = document.querySelector(`.gauge-card[data-sensor="${sensorType}"]`);
        if (!card) return;

        const valueEl = card.querySelector('.value');
        const fillEl = card.querySelector('.gauge-fill');
        const statusEl = card.querySelector('.gauge-status');

        // Update value display
        if (valueEl) {
            valueEl.textContent = formatValue(sensorType, value);
        }

        // Update fill bar
        if (fillEl) {
            const range = CONFIG.SENSOR_RANGES[sensorType];
            if (range) {
                const percent = ((value - range.min) / (range.max - range.min)) * 100;
                const clampedPercent = Math.max(0, Math.min(100, percent));
                fillEl.style.setProperty('--fill', `${clampedPercent}%`);
            }
        }

        // Update status (TODO: Add threshold checking in Phase 2)
        if (statusEl) {
            statusEl.dataset.status = 'ok';
            statusEl.textContent = 'OK';
        }
    }

    /**
     * Update all gauges with current values
     */
    function updateAllGauges() {
        for (const [type, data] of Object.entries(sensorValues)) {
            if (data !== null) {
                updateGauge(type, data.value);
            }
        }
        updateMotorStateUI();
    }

    /**
     * Update motor state UI
     */
    function updateMotorStateUI() {
        const stateCard = document.querySelector('.motor-state');
        const stateText = stateCard?.querySelector('.state-text');

        if (stateCard) {
            stateCard.dataset.state = motorState;
        }

        if (stateText) {
            stateText.textContent = motorState.toUpperCase();
        }
    }

    /**
     * Format sensor value for display
     * @param {string} sensorType - Type of sensor
     * @param {number} value - Raw value
     * @returns {string} Formatted value
     */
    function formatValue(sensorType, value) {
        if (value === null || value === undefined) {
            return '--';
        }

        switch (sensorType) {
            case 'temperature':
                return value.toFixed(1);
            case 'pressure':
                return Math.round(value);
            case 'flow_rate':
                return value.toFixed(1);
            case 'motor_speed':
                return Math.round(value);
            case 'power':
                return value.toFixed(1);
            default:
                return value.toString();
        }
    }

    /**
     * Get current sensor values
     * @returns {Object} Current sensor values
     */
    function getSensorValues() {
        return { ...sensorValues };
    }

    /**
     * Get current motor state
     * @returns {string} Motor state
     */
    function getMotorState() {
        return motorState;
    }

    // Public API
    return {
        init,
        getSensorValues,
        getMotorState,
        updateGauge
    };
})();
