/**
 * Graphs Module
 * 
 * Manages Chart.js time-series graphs for sensor data.
 * 
 * @module graphs
 */

const Graphs = (function () {
    let chart = null;
    let chartData = [];
    let currentSensor = 'pressure';
    let maxPoints = CONFIG.MAX_GRAPH_POINTS;

    /**
     * Initialize graphs
     */
    function init() {
        console.log('[Graphs] Initializing...');

        // Create chart
        createChart();

        // Register for socket events
        SocketClient.on('reading', handleReading);

        // Setup controls
        setupControls();

        console.log('[Graphs] Ready');
    }

    /**
     * Create Chart.js chart
     */
    function createChart() {
        const ctx = document.getElementById('sensor-chart');
        if (!ctx) {
            console.error('[Graphs] Canvas not found');
            return;
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: getSensorLabel(currentSensor),
                    data: [],
                    borderColor: CONFIG.SENSOR_COLORS[currentSensor],
                    backgroundColor: hexToRgba(CONFIG.SENSOR_COLORS[currentSensor], 0.1),
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: CONFIG.GRAPH_ANIMATION_DURATION
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#a0a0b0',
                            font: {
                                family: 'Inter'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a24',
                        titleColor: '#ffffff',
                        bodyColor: '#a0a0b0',
                        borderColor: '#2a2a3a',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                const range = CONFIG.SENSOR_RANGES[currentSensor];
                                return `${context.parsed.y.toFixed(2)} ${range?.unit || ''}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        grid: {
                            color: '#2a2a3a',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#606070',
                            maxTicksLimit: 10,
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#2a2a3a',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#606070',
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            }
                        },
                        suggestedMin: CONFIG.SENSOR_RANGES[currentSensor]?.min,
                        suggestedMax: CONFIG.SENSOR_RANGES[currentSensor]?.max
                    }
                }
            }
        });
    }

    /**
     * Handle incoming sensor reading
     * @param {Object} reading - Sensor reading data
     */
    function handleReading(reading) {
        if (!reading || reading.sensor_type !== currentSensor) return;

        const timestamp = new Date(reading.timestamp);
        const timeLabel = timestamp.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Add to data array
        chartData.push({
            time: timeLabel,
            value: reading.value
        });

        // Trim to max points
        while (chartData.length > maxPoints) {
            chartData.shift();
        }

        // Update chart
        updateChart();
    }

    /**
     * Update chart with current data
     */
    function updateChart() {
        if (!chart) return;

        chart.data.labels = chartData.map(d => d.time);
        chart.data.datasets[0].data = chartData.map(d => d.value);
        chart.update('none'); // No animation for performance
    }

    /**
     * Setup control event listeners
     */
    function setupControls() {
        const sensorSelect = document.getElementById('graph-sensor');
        const timeSelect = document.getElementById('graph-timerange');

        if (sensorSelect) {
            sensorSelect.addEventListener('change', (e) => {
                changeSensor(e.target.value);
            });
        }

        if (timeSelect) {
            timeSelect.addEventListener('change', (e) => {
                changeTimeRange(parseInt(e.target.value, 10));
            });
        }
    }

    /**
     * Change displayed sensor
     * @param {string} sensor - Sensor type
     */
    function changeSensor(sensor) {
        console.log('[Graphs] Changing to sensor:', sensor);

        currentSensor = sensor;
        chartData = []; // Clear data

        if (chart) {
            // Update chart styling
            chart.data.datasets[0].label = getSensorLabel(sensor);
            chart.data.datasets[0].borderColor = CONFIG.SENSOR_COLORS[sensor];
            chart.data.datasets[0].backgroundColor = hexToRgba(CONFIG.SENSOR_COLORS[sensor], 0.1);

            // Update Y axis
            chart.options.scales.y.suggestedMin = CONFIG.SENSOR_RANGES[sensor]?.min;
            chart.options.scales.y.suggestedMax = CONFIG.SENSOR_RANGES[sensor]?.max;

            chart.update();
        }
    }

    /**
     * Change time range
     * @param {number} seconds - Time range in seconds
     */
    function changeTimeRange(seconds) {
        console.log('[Graphs] Changing time range to:', seconds, 'seconds');
        maxPoints = seconds; // 1 point per second

        // Trim existing data
        while (chartData.length > maxPoints) {
            chartData.shift();
        }

        updateChart();
    }

    /**
     * Get display label for sensor
     * @param {string} sensor - Sensor type
     * @returns {string} Display label
     */
    function getSensorLabel(sensor) {
        const labels = {
            temperature: 'Temperature (°C)',
            pressure: 'Pressure (mmHg)',
            flow_rate: 'Flow Rate (L/min)',
            motor_speed: 'Motor Speed (RPM)',
            power: 'Power (W)'
        };
        return labels[sensor] || sensor;
    }

    /**
     * Convert hex color to rgba
     * @param {string} hex - Hex color
     * @param {number} alpha - Alpha value
     * @returns {string} RGBA color
     */
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Public API
    return {
        init,
        changeSensor,
        changeTimeRange
    };
})();
