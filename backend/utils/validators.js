/**
 * Input Validators
 * 
 * Validates input data for API endpoints.
 * Returns error message string or null if valid.
 * 
 * @module utils/validators
 */

/**
 * Valid sensor types
 */
const VALID_SENSOR_TYPES = ['temperature', 'pressure', 'flow_rate', 'motor_speed', 'power'];

/**
 * Valid units for each sensor type
 */
const VALID_UNITS = {
    temperature: ['°C', 'C', 'celsius', '°F', 'F', 'fahrenheit'],
    pressure: ['mmHg', 'kPa', 'psi', 'bar'],
    flow_rate: ['L/min', 'ml/min', 'L/s'],
    motor_speed: ['RPM', 'rpm', 'rad/s'],
    power: ['W', 'kW', 'mW']
};

/**
 * Validate a sensor reading
 * @param {Object} reading - The reading to validate
 * @param {string} reading.sensor_type - Type of sensor
 * @param {number} reading.value - Sensor value
 * @param {string} reading.unit - Unit of measurement
 * @returns {string|null} Error message or null if valid
 */
function validateReading(reading) {
    if (!reading) {
        return 'Reading data is required';
    }

    // Validate sensor_type
    if (!reading.sensor_type) {
        return 'sensor_type is required';
    }

    if (!VALID_SENSOR_TYPES.includes(reading.sensor_type)) {
        return `Invalid sensor_type. Must be one of: ${VALID_SENSOR_TYPES.join(', ')}`;
    }

    // Validate value
    if (reading.value === undefined || reading.value === null) {
        return 'value is required';
    }

    const numValue = parseFloat(reading.value);
    if (isNaN(numValue)) {
        return 'value must be a number';
    }

    // Validate unit
    if (!reading.unit) {
        return 'unit is required';
    }

    const validUnits = VALID_UNITS[reading.sensor_type] || [];
    if (!validUnits.includes(reading.unit)) {
        return `Invalid unit for ${reading.sensor_type}. Valid units: ${validUnits.join(', ')}`;
    }

    // Validate range (basic sanity checks)
    const rangeError = validateRange(reading.sensor_type, numValue);
    if (rangeError) {
        return rangeError;
    }

    return null;
}

/**
 * Validate sensor value range
 * @param {string} sensorType - Type of sensor
 * @param {number} value - Sensor value
 * @returns {string|null} Error message or null if valid
 */
function validateRange(sensorType, value) {
    const ranges = {
        temperature: { min: -50, max: 200, warning: 'Temperature out of reasonable range' },
        pressure: { min: 0, max: 500, warning: 'Pressure out of reasonable range' },
        flow_rate: { min: 0, max: 100, warning: 'Flow rate out of reasonable range' },
        motor_speed: { min: 0, max: 10000, warning: 'Motor speed out of reasonable range' },
        power: { min: 0, max: 10000, warning: 'Power out of reasonable range' }
    };

    const range = ranges[sensorType];
    if (range && (value < range.min || value > range.max)) {
        return range.warning;
    }

    return null;
}

/**
 * Validate query filters for logs
 * @param {Object} filters - Filter parameters
 * @returns {string|null} Error message or null if valid
 */
function validateFilters(filters) {
    if (!filters) {
        return null; // Empty filters are OK
    }

    // Validate sensor_type if provided
    if (filters.sensor_type && !VALID_SENSOR_TYPES.includes(filters.sensor_type)) {
        return `Invalid sensor_type. Must be one of: ${VALID_SENSOR_TYPES.join(', ')}`;
    }

    // Validate timestamps if provided
    if (filters.start_time) {
        const startDate = new Date(filters.start_time);
        if (isNaN(startDate.getTime())) {
            return 'Invalid start_time. Must be a valid ISO timestamp';
        }
    }

    if (filters.end_time) {
        const endDate = new Date(filters.end_time);
        if (isNaN(endDate.getTime())) {
            return 'Invalid end_time. Must be a valid ISO timestamp';
        }
    }

    // Validate limit
    if (filters.limit !== undefined) {
        if (typeof filters.limit !== 'number' || filters.limit < 1 || filters.limit > 100000) {
            return 'limit must be a number between 1 and 100000';
        }
    }

    // Validate offset
    if (filters.offset !== undefined) {
        if (typeof filters.offset !== 'number' || filters.offset < 0) {
            return 'offset must be a non-negative number';
        }
    }

    return null;
}

/**
 * Sanitize a string for safe use
 * Removes potential injection characters
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitize(str) {
    if (typeof str !== 'string') {
        return '';
    }

    // Remove characters that could be used for injection
    return str.replace(/[<>'";\\/]/g, '');
}

module.exports = {
    validateReading,
    validateFilters,
    validateRange,
    sanitize,
    VALID_SENSOR_TYPES,
    VALID_UNITS
};
