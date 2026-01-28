/**
 * Logger UI Module
 * 
 * Manages the sensor logs table and CSV export.
 * 
 * @module logger-ui
 */

const LoggerUI = (function () {
    let logs = [];
    let currentFilter = '';

    /**
     * Initialize logger UI
     */
    function init() {
        console.log('[LoggerUI] Initializing...');

        // Setup filter control
        setupFilter();

        // Setup export button
        setupExport();

        // Register for socket events
        SocketClient.on('reading', handleReading);

        // Load initial logs
        loadLogs();

        console.log('[LoggerUI] Ready');
    }

    /**
     * Setup filter select
     */
    function setupFilter() {
        const filterSelect = document.getElementById('logs-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                updateTable();
            });
        }
    }

    /**
     * Setup export button
     */
    function setupExport() {
        const exportBtn = document.getElementById('btn-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportCSV);
        }
    }

    /**
     * Handle incoming sensor reading
     * @param {Object} reading - Sensor reading data
     */
    function handleReading(reading) {
        if (!reading) return;

        // Add to logs (at beginning)
        logs.unshift({
            timestamp: reading.timestamp,
            sensor_type: reading.sensor_type,
            value: reading.value,
            unit: reading.unit,
            motor_state: reading.motor_state
        });

        // Limit logs in memory
        if (logs.length > 500) {
            logs.pop();
        }

        // Update table
        updateTable();
    }

    /**
     * Load initial logs from API
     */
    async function loadLogs() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/logs?limit=${CONFIG.LOGS_PAGE_SIZE}`);
            const data = await response.json();

            if (data.success && data.data) {
                logs = data.data;
                updateTable();
            }
        } catch (error) {
            console.error('[LoggerUI] Failed to load logs:', error);
        }
    }

    /**
     * Update logs table
     */
    function updateTable() {
        const tbody = document.getElementById('logs-tbody');
        if (!tbody) return;

        // Filter logs
        const filteredLogs = currentFilter
            ? logs.filter(l => l.sensor_type === currentFilter)
            : logs;

        // Limit displayed rows
        const displayedLogs = filteredLogs.slice(0, CONFIG.LOGS_PAGE_SIZE);

        // Render rows
        tbody.innerHTML = displayedLogs.map(log => `
      <tr>
        <td>${formatTimestamp(log.timestamp)}</td>
        <td><span class="sensor-badge sensor-${log.sensor_type}">${formatSensorType(log.sensor_type)}</span></td>
        <td>${formatValue(log.sensor_type, log.value)} ${log.unit || ''}</td>
        <td><span class="state-badge state-${log.motor_state}">${log.motor_state || '--'}</span></td>
      </tr>
    `).join('');

        if (displayedLogs.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: #606070;">No logs available</td>
        </tr>
      `;
        }
    }

    /**
     * Export logs as CSV
     */
    async function exportCSV() {
        try {
            // Build query params
            const params = new URLSearchParams();
            if (currentFilter) {
                params.append('sensor_type', currentFilter);
            }

            // Trigger download
            const url = `${CONFIG.API_BASE_URL}/export?${params.toString()}`;
            window.open(url, '_blank');

        } catch (error) {
            console.error('[LoggerUI] Export failed:', error);
        }
    }

    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted time
     */
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Format sensor type for display
     * @param {string} type - Sensor type
     * @returns {string} Display name
     */
    function formatSensorType(type) {
        const names = {
            temperature: 'Temp',
            pressure: 'Pressure',
            flow_rate: 'Flow',
            motor_speed: 'Speed',
            power: 'Power'
        };
        return names[type] || type;
    }

    /**
     * Format sensor value
     * @param {string} type - Sensor type
     * @param {number} value - Raw value
     * @returns {string} Formatted value
     */
    function formatValue(type, value) {
        if (value === null || value === undefined) return '--';

        switch (type) {
            case 'temperature':
            case 'flow_rate':
            case 'power':
                return value.toFixed(1);
            case 'pressure':
            case 'motor_speed':
                return Math.round(value);
            default:
                return value.toString();
        }
    }

    // Public API
    return {
        init,
        loadLogs,
        exportCSV
    };
})();
