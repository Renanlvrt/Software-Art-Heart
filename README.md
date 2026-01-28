# Artificial Heart Testing Platform

> Web-based testing platform for artificial heart prototype components

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation

```bash
cd backend
npm install
```

### Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:4000`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System status and health check |
| GET | `/api/logs` | Retrieve sensor readings |
| POST | `/api/logs` | Add a sensor reading |
| GET | `/api/logs/latest` | Get latest reading per sensor |
| GET | `/api/export` | Download readings as CSV |
| POST | `/api/control` | Send motor command |
| POST | `/api/control/emergency-stop` | Emergency stop all motors |
| GET | `/api/control/state` | Get current motor state |
| GET | `/api/control/history` | Get command history |

### WebSocket Events

**Server → Client:**
- `reading` - New sensor reading
- `state` - Motor state update
- `emergency_stop` - Emergency stop triggered

**Client → Server:**
- `control` - Send control command

## Project Structure

```
software/
├── ARCHITECTURE.md          # System design document
├── IMPLEMENTATION_LOG.md    # Development progress
├── backend/
│   ├── server.js            # Express + Socket.io server
│   ├── api/                 # REST API routes
│   ├── database/            # SQLite schema and queries
│   ├── hardware/            # Simulator and serial bridge
│   ├── services/            # Business logic
│   ├── middleware/          # Express middleware
│   └── utils/               # Validators and helpers
├── frontend/                # Web UI (coming soon)
└── docs/                    # Documentation
```

## Development

### Run Tests
```bash
npm test
```

### Run with Watch Mode
```bash
npm run dev
```

### Check Health
```bash
curl http://localhost:4000/api/health
```

## License

MIT
