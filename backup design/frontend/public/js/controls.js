/**
 * Controls Module
 * 
 * Manages motor control buttons and speed slider.
 * 
 * @module controls
 */

const Controls = (function () {
    let isProcessing = false;
    let commandHistory = [];

    /**
     * Initialize controls
     */
    function init() {
        console.log('[Controls] Initializing...');

        // Setup button handlers
        setupButtons();

        // Setup slider
        setupSlider();

        // Register for socket events
        SocketClient.on('control_response', handleControlResponse);
        SocketClient.on('state', handleStateUpdate);
        SocketClient.on('emergency_stop', handleEmergencyStop);

        console.log('[Controls] Ready');
    }

    /**
     * Setup button event listeners
     */
    function setupButtons() {
        // Start button
        const startBtn = document.getElementById('btn-start');
        if (startBtn) {
            startBtn.addEventListener('click', () => sendCommand('motor', 'start'));
        }

        // Stop button
        const stopBtn = document.getElementById('btn-stop');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => sendCommand('motor', 'stop'));
        }

        // Set speed button
        const speedBtn = document.getElementById('btn-set-speed');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                const slider = document.getElementById('speed-slider');
                if (slider) {
                    sendCommand('motor', 'set_speed', { speed: parseInt(slider.value, 10) });
                }
            });
        }

        // Emergency stop button
        const emergencyBtn = document.getElementById('btn-emergency');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', emergencyStop);
        }
    }

    /**
     * Setup speed slider
     */
    function setupSlider() {
        const slider = document.getElementById('speed-slider');
        const display = document.getElementById('speed-value');

        if (slider && display) {
            slider.addEventListener('input', () => {
                display.textContent = slider.value;
            });
        }
    }

    /**
     * Send control command
     * @param {string} target - Target device
     * @param {string} action - Action to perform
     * @param {Object} [params] - Additional parameters
     */
    async function sendCommand(target, action, params = {}) {
        if (isProcessing) {
            console.log('[Controls] Already processing a command');
            return;
        }

        isProcessing = true;
        updateButtonStates(true);

        try {
            // Try WebSocket first
            if (SocketClient.getConnectionState()) {
                SocketClient.sendControl({ target, action, params });
            } else {
                // Fallback to REST API
                const response = await fetch(`${CONFIG.API_BASE_URL}/control`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ target, action, params })
                });

                const data = await response.json();
                handleControlResponse(data);
            }

            // Add to history
            addToHistory(action, target, params);

        } catch (error) {
            console.error('[Controls] Command failed:', error);
            showNotification('Command failed: ' + error.message, 'error');
        }

        // Re-enable after short delay
        setTimeout(() => {
            isProcessing = false;
            updateButtonStates(false);
        }, 500);
    }

    /**
     * Emergency stop
     */
    async function emergencyStop() {
        console.warn('[Controls] EMERGENCY STOP');

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/control/emergency-stop`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                showNotification('EMERGENCY STOP ACTIVATED', 'warning');
                addToHistory('emergency_stop', 'system', {});
            }
        } catch (error) {
            console.error('[Controls] Emergency stop failed:', error);
            showNotification('Emergency stop failed!', 'error');
        }
    }

    /**
     * Handle control response
     * @param {Object} response - Response data
     */
    function handleControlResponse(response) {
        console.log('[Controls] Response:', response);

        if (response.success) {
            showNotification('Command executed', 'success');
        } else if (response.error) {
            showNotification('Error: ' + response.error, 'error');
        }
    }

    /**
     * Handle state update
     * @param {Object} state - State data
     */
    function handleStateUpdate(state) {
        if (state.motor) {
            // Update slider if motor speed changed
            const slider = document.getElementById('speed-slider');
            const display = document.getElementById('speed-value');

            if (slider && state.motor.target_speed !== undefined) {
                // Only update if not currently being dragged
                if (document.activeElement !== slider) {
                    slider.value = state.motor.target_speed;
                    if (display) {
                        display.textContent = state.motor.target_speed;
                    }
                }
            }
        }
    }

    /**
     * Handle emergency stop event
     * @param {Object} data - Event data
     */
    function handleEmergencyStop(data) {
        showNotification('EMERGENCY STOP: ' + data.message, 'error');
        addToHistory('emergency_stop', 'system', {});
    }

    /**
     * Update button states
     * @param {boolean} disabled - Whether buttons are disabled
     */
    function updateButtonStates(disabled) {
        const buttons = document.querySelectorAll('.control-buttons .btn, #btn-set-speed');
        buttons.forEach(btn => {
            btn.disabled = disabled;
        });
    }

    /**
     * Add command to history
     * @param {string} action - Action performed
     * @param {string} target - Target device
     * @param {Object} params - Command parameters
     */
    function addToHistory(action, target, params) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        let text = `${action}`;
        if (params.speed !== undefined) {
            text += ` (${params.speed}%)`;
        }

        commandHistory.unshift({ time: timeStr, text, target });

        // Limit history
        if (commandHistory.length > CONFIG.COMMAND_HISTORY_SIZE) {
            commandHistory.pop();
        }

        // Update UI
        updateHistoryUI();
    }

    /**
     * Update command history UI
     */
    function updateHistoryUI() {
        const container = document.getElementById('command-history');
        if (!container) return;

        container.innerHTML = commandHistory.map(cmd => `
      <div class="command-item">
        <span class="command-time">${cmd.time}</span>
        <span class="command-text">${cmd.text}</span>
      </div>
    `).join('');
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning)
     */
    function showNotification(message, type = 'info') {
        console.log(`[Notification] ${type}: ${message}`);
        // TODO: Add toast notification UI
    }

    // Public API
    return {
        init,
        sendCommand,
        emergencyStop
    };
})();
