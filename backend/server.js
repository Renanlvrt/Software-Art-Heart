/**
 * Artificial Heart Testing Platform - Backend Server
 * 
 * Main entry point for the Express + Socket.io server.
 * Handles REST API endpoints and real-time WebSocket communication.
 * 
 * @module server
 */

require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Database
const db = require('./database/db');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// API Routes
const healthRoutes = require('./api/health');
const logsRoutes = require('./api/logs');
const controlRoutes = require('./api/control');

// Hardware
const simulator = require('./hardware/simulator');
const playback = require('./hardware/playback');
const hardwareConfig = require('./hardware/config.json');

// Configuration
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HARDWARE_MODE = process.env.HARDWARE_MODE || 'simulator';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
    cors: {
        origin: NODE_ENV === 'development'
            ? ['http://localhost:3000', 'http://localhost:4000', 'http://127.0.0.1:3000', 'http://127.0.0.1:4000']
            : process.env.FRONTEND_URL,
        methods: ['GET', 'POST']
    }
});

// ============================================================
// Middleware Setup
// ============================================================

// CORS
app.use(cors({
    origin: NODE_ENV === 'development'
        ? '*'
        : process.env.FRONTEND_URL
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (NODE_ENV === 'development') {
    app.use(requestLogger);
}

// Serve static frontend files (in production)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ============================================================
// API Routes
// ============================================================

app.use('/api', healthRoutes);
app.use('/api', logsRoutes);
app.use('/api', controlRoutes);

// Root redirect to health check
app.get('/', (req, res) => {
    res.json({
        name: 'ArtHeart Testing Platform API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/health'
    });
});

// ============================================================
// Socket.io Connection Handling
// ============================================================

// Track connected clients
let connectedClients = 0;

io.on('connection', (socket) => {
    connectedClients++;
    console.log(`[Socket] Client connected: ${socket.id} (Total: ${connectedClients})`);

    // Send current state on connect
    socket.emit('state', {
        motor: {
            state: db.getState('motor_state') || 'stopped',
            speed: parseInt(db.getState('motor_speed') || '0', 10),
            target_speed: parseInt(db.getState('motor_target_speed') || '0', 10)
        },
        hardware_mode: db.getState('hardware_mode') || 'simulator',
        connection: {
            hardware: db.getState('connection_status') || 'disconnected',
            clients: connectedClients
        }
    });

    // Send latest sensor readings
    const latestReadings = db.getLatestReadings();
    socket.emit('readings', latestReadings);

    // Handle control commands from client
    socket.on('control', (command) => {
        console.log(`[Socket] Control command received:`, command);

        // Validate and process command
        const controller = require('./services/controller');
        try {
            const result = controller.processCommand(command);
            socket.emit('control_response', { success: true, result });

            // Broadcast state update to all clients
            io.emit('state', {
                motor: {
                    state: db.getState('motor_state') || 'stopped',
                    speed: parseInt(db.getState('motor_speed') || '0', 10),
                    target_speed: parseInt(db.getState('motor_target_speed') || '0', 10)
                }
            });
        } catch (error) {
            socket.emit('control_response', { success: false, error: error.message });
        }
    });

    socket.on('disconnect', () => {
        connectedClients--;
        console.log(`[Socket] Client disconnected: ${socket.id} (Total: ${connectedClients})`);
    });
});

// Make io accessible to other modules
app.set('io', io);

// ============================================================
// Hardware Engine (Simulator or Playback)
// ============================================================

// Common callback for any data engine
function onReading(reading) {
    // Store in database
    db.insertReading(reading);

    // Broadcast to all connected clients
    io.emit('reading', reading);
}

const engineMode = hardwareConfig.mode || 'simulator';

if (engineMode === 'playback') {
    playback.start(onReading);
    console.log('[Hardware] Playback engine started');
} else {
    simulator.start(onReading);
    console.log('[Hardware] Simulator started');
}

// ============================================================
// Error Handling
// ============================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.path} does not exist`,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/logs',
            'POST /api/logs',
            'POST /api/control',
            'GET /api/export'
        ]
    });
});

// Global error handler
app.use(errorHandler);

// ============================================================
// Server Startup
// ============================================================

function startServer() {
    // Initialize database
    db.initialize();

    // Start HTTP server
    httpServer.listen(PORT, () => {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║     ARTIFICIAL HEART TESTING PLATFORM - BACKEND       ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║  Server:    http://localhost:${PORT}                      ║`);
        console.log(`║  Mode:      ${NODE_ENV.padEnd(12)}                       ║`);
        console.log(`║  Hardware:  ${HARDWARE_MODE.padEnd(12)}                       ║`);
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log('║  API Endpoints:                                       ║');
        console.log('║    GET  /api/health    - System status                ║');
        console.log('║    GET  /api/logs      - Retrieve sensor logs         ║');
        console.log('║    POST /api/logs      - Add sensor reading           ║');
        console.log('║    POST /api/control   - Send motor command           ║');
        console.log('║    GET  /api/export    - Download CSV                 ║');
        console.log('╚═══════════════════════════════════════════════════════╝');
        console.log('');
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down gracefully...');
    simulator.stop();
    playback.stop();
    db.close();
    httpServer.close(() => {
        console.log('[Server] Closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n[Server] Received SIGTERM');
    simulator.stop();
    playback.stop();
    db.close();
    httpServer.close(() => {
        process.exit(0);
    });
});

// Start the server
startServer();

module.exports = { app, io, httpServer };
