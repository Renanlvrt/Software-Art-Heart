/**
 * Socket.io Client
 * 
 * Manages WebSocket connection to the backend server.
 * Handles connection state, events, and reconnection.
 * 
 * @module socket-client
 */

const SocketClient = (function () {
    let socket = null;
    let isConnected = false;

    // Event callbacks
    const callbacks = {
        reading: [],
        state: [],
        control_response: [],
        emergency_stop: [],
        connect: [],
        disconnect: []
    };

    /**
     * Initialize socket connection
     */
    function init() {
        if (socket) {
            console.log('[Socket] Already initialized');
            return;
        }

        console.log('[Socket] Connecting to', CONFIG.WS_URL);

        socket = io(CONFIG.WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        // Connection events
        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
            isConnected = true;
            updateConnectionUI(true);
            triggerCallbacks('connect', { id: socket.id });
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            isConnected = false;
            updateConnectionUI(false);
            triggerCallbacks('disconnect', { reason });
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
            updateConnectionUI(false);
        });

        // Data events
        socket.on('reading', (data) => {
            if (CONFIG.DEBUG) {
                console.log('[Socket] Reading:', data.sensor_type, data.value);
            }
            triggerCallbacks('reading', data);
        });

        socket.on('readings', (data) => {
            console.log('[Socket] Initial readings:', Object.keys(data));
            // Trigger for each sensor type
            for (const [type, reading] of Object.entries(data)) {
                triggerCallbacks('reading', reading);
            }
        });

        socket.on('state', (data) => {
            console.log('[Socket] State update:', data);
            triggerCallbacks('state', data);
        });

        socket.on('control_response', (data) => {
            console.log('[Socket] Control response:', data);
            triggerCallbacks('control_response', data);
        });

        socket.on('control_executed', (data) => {
            console.log('[Socket] Control executed:', data);
            triggerCallbacks('control_response', data);
        });

        socket.on('emergency_stop', (data) => {
            console.warn('[Socket] EMERGENCY STOP:', data);
            triggerCallbacks('emergency_stop', data);
        });
    }

    /**
     * Update connection status UI
     * @param {boolean} connected - Connection state
     */
    function updateConnectionUI(connected) {
        const statusEl = document.querySelector('.connection-status');
        const textEl = statusEl?.querySelector('.status-text');

        if (statusEl) {
            statusEl.dataset.status = connected ? 'connected' : 'disconnected';
        }

        if (textEl) {
            textEl.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }

    /**
     * Register callback for an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    function on(event, callback) {
        if (callbacks[event]) {
            callbacks[event].push(callback);
        } else {
            console.warn('[Socket] Unknown event:', event);
        }
    }

    /**
     * Remove callback for an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    function off(event, callback) {
        if (callbacks[event]) {
            const index = callbacks[event].indexOf(callback);
            if (index > -1) {
                callbacks[event].splice(index, 1);
            }
        }
    }

    /**
     * Trigger all callbacks for an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    function triggerCallbacks(event, data) {
        if (callbacks[event]) {
            callbacks[event].forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`[Socket] Callback error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Emit a control command
     * @param {Object} command - Control command
     */
    function sendControl(command) {
        if (!socket || !isConnected) {
            console.error('[Socket] Cannot send control: not connected');
            return false;
        }

        console.log('[Socket] Sending control:', command);
        socket.emit('control', command);
        return true;
    }

    /**
     * Get connection state
     * @returns {boolean} True if connected
     */
    function getConnectionState() {
        return isConnected;
    }

    /**
     * Disconnect socket
     */
    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
            isConnected = false;
        }
    }

    // Public API
    return {
        init,
        on,
        off,
        sendControl,
        getConnectionState,
        disconnect
    };
})();
