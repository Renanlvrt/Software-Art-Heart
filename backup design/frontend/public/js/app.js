/**
 * Main Application Entry Point
 * 
 * Initializes all modules and starts the application.
 * 
 * @module app
 */

(function () {
    'use strict';

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║     ARTHEART TESTING PLATFORM - FRONTEND              ║');
    console.log('╚═══════════════════════════════════════════════════════╝');

    /**
     * Initialize application
     */
    function init() {
        console.log('[App] Initializing...');

        // Initialize modules in order
        try {
            // 1. Socket connection first
            SocketClient.init();

            // 2. Dashboard (gauges)
            Dashboard.init();

            // 3. Graphs
            Graphs.init();

            // 4. Controls
            Controls.init();

            // 5. Logger UI
            LoggerUI.init();

            console.log('[App] All modules initialized');

        } catch (error) {
            console.error('[App] Initialization failed:', error);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.ArtHeart = {
        SocketClient,
        Dashboard,
        Graphs,
        Controls,
        LoggerUI,
        CONFIG
    };
})();
