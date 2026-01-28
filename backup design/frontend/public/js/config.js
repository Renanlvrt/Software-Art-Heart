/**
 * Frontend Configuration
 * 
 * Centralized configuration for API endpoints, WebSocket, and UI settings.
 * 
 * @module config
 */

const CONFIG = {
    // API Settings
    API_BASE_URL: 'http://localhost:4000/api',
    WS_URL: 'http://localhost:4000',

    // Refresh rates (ms)
    REFRESH_INTERVAL: 1000,
    GRAPH_UPDATE_INTERVAL: 1000,
    LOGS_REFRESH_INTERVAL: 5000,

    // Graph settings
    MAX_GRAPH_POINTS: 300, // 5 minutes at 1s intervals
    GRAPH_ANIMATION_DURATION: 200,

    // Sensor ranges (for gauge display)
    SENSOR_RANGES: {
        temperature: { min: 30, max: 45, unit: '°C' },
        pressure: { min: 50, max: 150, unit: 'mmHg' },
        flow_rate: { min: 0, max: 10, unit: 'L/min' },
        motor_speed: { min: 0, max: 3000, unit: 'RPM' },
        power: { min: 0, max: 50, unit: 'W' }
    },

    // Sensor colors (for charts)
    SENSOR_COLORS: {
        temperature: '#f97316',
        pressure: '#ef4444',
        flow_rate: '#3b82f6',
        motor_speed: '#8b5cf6',
        power: '#eab308'
    },

    // UI Settings
    LOGS_PAGE_SIZE: 50,
    COMMAND_HISTORY_SIZE: 10,

    // Debug
    DEBUG: true
};

// Freeze to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.SENSOR_RANGES);
Object.freeze(CONFIG.SENSOR_COLORS);

// Log config in debug mode
if (CONFIG.DEBUG) {
    console.log('[Config] Loaded:', CONFIG);
}
