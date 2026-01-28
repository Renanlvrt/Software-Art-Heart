# ARCHITECTURE.md - Artificial Heart Testing Platform

> **Living Document** - Updated as implementation reveals real-world constraints  
> **Last Updated**: 2026-01-14  
> **Phase**: 1 (MVP - Logging + Control + Graphs)

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Hardware Context](#3-hardware-context)
4. [Core Modules](#4-core-modules)
5. [Data Flow](#5-data-flow)
6. [File Structure](#6-file-structure)
7. [Data Models](#7-data-models)
8. [Security & Compliance](#8-security--compliance)
9. [Implementation Phases](#9-implementation-phases)
10. [Known Constraints](#10-known-constraints)

---

## 1. System Overview

### 1.1 Purpose
Web-based testing platform for artificial heart prototype components:
- **Sensors**: Temperature, pressure, flow rate monitoring
- **Actuators**: Pump/motor control (YASA PMSM via ESP32)
- **Data**: Real-time visualization, logging, CSV export

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Browser)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Dashboard  │  │   Graphs    │  │  Controls   │  │   Logs     │ │
│  │  (gauges)   │  │ (Chart.js)  │  │ (start/stop)│  │  (export)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         └────────────────┴────────────────┴───────────────┘        │
│                              │ Socket.io                            │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                         BACKEND (Node.js)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Express   │  │  Socket.io  │  │   Logger    │  │ Controller │ │
│  │   (REST)    │  │  (realtime) │  │  (SQLite)   │  │ (commands) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         └────────────────┴────────────────┴───────────────┘        │
│                              │ Serial/WebSocket                     │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                    HARDWARE LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     ESP32-WROOM-32                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────────────┐  │   │
│  │  │ WiFi/BT │  │ Sensors │  │  MCPWM  │  │  Gate Drivers  │  │   │
│  │  │ (comms) │  │  (ADC)  │  │ (motor) │  │   (IR2110)     │  │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └───────┬────────┘  │   │
│  └─────────────────────────────────────────────────┼───────────┘   │
│                                                    │                │
│  ┌─────────────────────────────────────────────────┼───────────┐   │
│  │                    POWER STAGE                  │           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────▼─────────┐ │   │
│  │  │  TET     │  │  Boost   │  │    3-Phase Inverter        │ │   │
│  │  │  Coils   │→→│ 12V→20V  │→→│    (6x IRFZ44N MOSFETs)    │ │   │
│  │  └──────────┘  └──────────┘  └──────────────────┬─────────┘ │   │
│  └─────────────────────────────────────────────────┼───────────┘   │
│                                                    │                │
│  ┌─────────────────────────────────────────────────▼───────────┐   │
│  │                    YASA PMSM MOTOR                          │   │
│  │                  (Axial Flux, 3-Phase)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Modularity** | Clear separation: frontend, backend, hardware abstraction |
| **Safety-First** | All commands validated; dead-time in hardware; graceful failures |
| **Compliance-Ready** | Audit logs, traceability, IEC 62304 design patterns |
| **Hardware Agnostic** | Simulator for Phase 1; real sensors swap in transparently |
| **Real-Time** | WebSocket for live updates; 1s sensor polling |

---

## 2. Technology Stack

### 2.1 Frontend
| Technology | Purpose | Status |
|------------|---------|--------|
| HTML5/CSS3/JS | Core UI | ○ To Do |
| Chart.js | Time-series graphs | ○ To Do |
| Socket.io-client | Real-time updates | ○ To Do |
| Web Serial API | Direct browser-to-ESP32 (Phase 3) | ○ Future |

### 2.2 Backend
| Technology | Purpose | Status |
|------------|---------|--------|
| Node.js + Express | REST API server | ○ To Do |
| Socket.io | Real-time bidirectional comms | ○ To Do |
| SQLite | Local database (≤100k logs) | ○ To Do |
| node-serialport | USB serial to ESP32 (Phase 2) | ○ Future |

### 2.3 Hardware
| Component | Model | Status |
|-----------|-------|--------|
| Microcontroller | ESP32-WROOM-32 | ✓ Specified |
| Motor | YASA PMSM (Axial Flux) | ✓ Specified |
| Gate Drivers | IR2110 | ✓ Specified |
| Power MOSFETs | IRFZ44N (6x) | ✓ Specified |
| Boost Converter | LTC3872 (12V→20V) | ✓ Specified |
| TET System | Litz wire coils, 48 strands | ✓ Specified |

### 2.4 Development
| Tool | Purpose |
|------|---------|
| Git + GitHub | Version control |
| Jest | Unit testing |
| Puppeteer | E2E browser testing |
| ESLint | Code quality |

---

## 3. Hardware Context

> Detailed specs: [HARDWARE_SPECS.md](file:///c:/Users/renan/Desktop/artHeart/software/antigrav_summary/HARDWARE_SPECS.md)  
> Motor control: [MOTOR_CONTROL_SPECS.md](file:///c:/Users/renan/Desktop/artHeart/software/antigrav_summary/MOTOR_CONTROL_SPECS.md)

### 3.1 ESP32 Pin Allocation

| GPIO | Function | Notes |
|------|----------|-------|
| GPIO25 | Gate Driver U1 INA | PWM Phase A High |
| GPIO26 | Gate Driver U1 INB | PWM Phase A Low |
| GPIO32 | Gate Driver U2 INA | PWM Phase B High |
| GPIO33 | Gate Driver U2 INB | PWM Phase B Low |
| SENSOR_VP | ADC Input | Temperature sensor |
| SENSOR_VN | ADC Input | Pressure sensor |
| TXD0/RXD0 | UART | Serial comms to backend |

### 3.2 Motor Control Parameters

| Parameter | Value |
|-----------|-------|
| Control Method | V/F (Voltage/Frequency) |
| PWM Frequency | 20 kHz |
| Phase Shift | 120° |
| Dead Time | Required (hardware-enforced) |
| Input Voltage | 12V AC → 20V DC |

### 3.3 Expected Sensors (Phase 1 Simulation)

| Sensor | Range | Unit | Update Rate |
|--------|-------|------|-------------|
| Temperature | 30-45 | °C | 1 Hz |
| Pressure | 50-150 | mmHg | 1 Hz |
| Flow Rate | 0-10 | L/min | 1 Hz |
| Motor Speed | 0-3000 | RPM | 1 Hz |
| Power Draw | 0-50 | W | 1 Hz |

---

## 4. Core Modules

### 4.1 Frontend Modules

```
frontend/
├── js/
│   ├── app.js           # Main entry, initialization
│   ├── socket-client.js # WebSocket connection management
│   ├── dashboard.js     # Gauge displays, current stats
│   ├── graphs.js        # Chart.js line graphs
│   ├── controls.js      # Motor start/stop, speed slider
│   ├── logger-ui.js     # View/export logs interface
│   └── config.js        # API URLs, refresh rates
```

| Module | Responsibility | Dependencies |
|--------|----------------|--------------|
| `app.js` | Bootstrap, route events | All modules |
| `socket-client.js` | Connect to Socket.io, dispatch events | socket.io-client |
| `dashboard.js` | Update gauge displays | socket-client |
| `graphs.js` | Render time-series charts | Chart.js, socket-client |
| `controls.js` | Send motor commands | socket-client |
| `logger-ui.js` | Display logs, trigger CSV export | REST API |

### 4.2 Backend Modules

```
backend/
├── server.js            # Express + Socket.io entry
├── api/
│   ├── logs.js          # GET/POST /logs
│   ├── control.js       # POST /control
│   └── health.js        # GET /health
├── database/
│   ├── db.js            # SQLite connection
│   └── schema.js        # Table definitions
├── hardware/
│   ├── simulator.js     # Fake sensor data (Phase 1)
│   └── serial-bridge.js # Serial handler (Phase 2)
├── services/
│   ├── logger.js        # Append readings to DB
│   └── controller.js    # Translate commands → hardware
└── middleware/
    ├── errorHandler.js  # Global error handling
    └── requestLogger.js # HTTP request logging
```

| Module | Responsibility | Status |
|--------|----------------|--------|
| `server.js` | Initialize Express, Socket.io, routes | ○ To Do |
| `api/logs.js` | REST endpoints for log data | ○ To Do |
| `api/control.js` | Motor command endpoints | ○ To Do |
| `database/db.js` | SQLite connection pool | ○ To Do |
| `hardware/simulator.js` | Generate realistic fake data | ○ To Do |
| `services/logger.js` | Persist sensor readings | ○ To Do |
| `services/controller.js` | Validate & route commands | ○ To Do |

---

## 5. Data Flow

### 5.1 Sensor Data Flow (Read)

```
┌──────────────────┐     every 1s      ┌──────────────────┐
│  ESP32 Sensors   │ ─────────────────→│  Backend         │
│  (or Simulator)  │   JSON/Serial     │  simulator.js    │
└──────────────────┘                   └────────┬─────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           ▼                           │
                    │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
                    │  │  logger.js   │  │   SQLite     │  │  Socket.io  │ │
                    │  │  (validate)  │→→│  (INSERT)    │  │  (emit)     │ │
                    │  └──────────────┘  └──────────────┘  └──────┬──────┘ │
                    │                           Backend           │        │
                    └─────────────────────────────────────────────┼────────┘
                                                                  │
                    ┌─────────────────────────────────────────────┼────────┐
                    │                           Frontend          ▼        │
                    │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
                    │  │ dashboard.js │  │  graphs.js   │  │socket-client│ │
                    │  │ (update UI)  │←←│ (add point)  │←←│ (receive)   │ │
                    │  └──────────────┘  └──────────────┘  └─────────────┘ │
                    │                                                      │
                    └──────────────────────────────────────────────────────┘
```

### 5.2 Control Command Flow (Write)

```
┌──────────────────┐  click event   ┌──────────────────┐
│   User clicks    │ ─────────────→ │   controls.js    │
│  "Start Motor"   │                │  (validate UI)   │
└──────────────────┘                └────────┬─────────┘
                                             │ emit('control')
                    ┌────────────────────────┼────────────────────────┐
                    │                        ▼                        │
                    │  ┌──────────────┐  ┌──────────────┐            │
                    │  │  Socket.io   │  │ controller.js│            │
                    │  │  (receive)   │→→│  (validate)  │            │
                    │  └──────────────┘  └──────┬───────┘            │
                    │                           │                     │
                    │  ┌──────────────┐  ┌──────▼───────┐            │
                    │  │   SQLite     │←←│  Log command │            │
                    │  │  (audit)     │  │  (timestamp) │            │
                    │  └──────────────┘  └──────┬───────┘            │
                    │                           │ Serial/Simulator    │
                    │                    ┌──────▼───────┐            │
                    │                    │   Hardware   │            │
                    │                    │ (or sim ACK) │            │
                    │                    └──────────────┘            │
                    │                         Backend                 │
                    └─────────────────────────────────────────────────┘
```

---

## 6. File Structure

```
project-root/
├── ARCHITECTURE.md              # This file (source of truth)
├── IMPLEMENTATION_LOG.md        # Track progress
├── .gitignore
│
├── frontend/
│   ├── index.html               # Main UI shell
│   ├── css/
│   │   ├── style.css            # Global styles + design tokens
│   │   └── responsive.css       # Mobile-first responsive
│   ├── js/
│   │   ├── app.js               # Entry + initialization
│   │   ├── socket-client.js     # Socket.io listener
│   │   ├── dashboard.js         # Gauges, current stats
│   │   ├── graphs.js            # Chart.js graphs
│   │   ├── controls.js          # Motor controls
│   │   ├── logger-ui.js         # View/export logs
│   │   └── config.js            # Configuration
│   └── assets/
│       └── favicon.ico
│
├── backend/
│   ├── server.js                # Express + Socket.io entry
│   ├── package.json             # Backend dependencies
│   ├── .env.example             # Environment template
│   │
│   ├── api/
│   │   ├── logs.js              # GET/POST /logs
│   │   ├── control.js           # POST /control
│   │   └── health.js            # GET /health
│   │
│   ├── database/
│   │   ├── db.js                # SQLite connection
│   │   ├── schema.js            # Table definitions
│   │   └── migrations/
│   │       └── 001-init.sql     # Create tables
│   │
│   ├── hardware/
│   │   ├── simulator.js         # Fake sensor data (Phase 1)
│   │   ├── serial-bridge.js     # Serial port (Phase 2, stub)
│   │   └── config.json          # Sensor params, thresholds
│   │
│   ├── services/
│   │   ├── logger.js            # Append readings to DB
│   │   ├── controller.js        # Command processing
│   │   └── alert.js             # Alert logic (Phase 2, stub)
│   │
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handler
│   │   └── requestLogger.js     # HTTP request logging
│   │
│   ├── utils/
│   │   ├── validators.js        # Input validation
│   │   └── formatters.js        # Unit conversion
│   │
│   └── tests/
│       ├── unit/
│       │   ├── logger.test.js
│       │   └── simulator.test.js
│       └── fixtures/
│           └── sample-data.json
│
├── docs/
│   ├── SETUP.md                 # Local dev guide
│   ├── API.md                   # API documentation
│   └── HARDWARE_INTEGRATION.md  # Serial bridge setup
│
└── antigrav_summary/            # Hardware research
    ├── HARDWARE_SPECS.md
    └── MOTOR_CONTROL_SPECS.md
```

---

## 7. Data Models

### 7.1 Sensor Reading

```json
{
  "id": "uuid-v4",
  "timestamp": "2026-01-14T15:00:00.000Z",
  "sensor_type": "temperature|pressure|flow_rate|motor_speed|power",
  "value": 37.5,
  "unit": "°C|mmHg|L/min|RPM|W",
  "motor_state": "stopped|running|error",
  "source": "simulator|esp32"
}
```

### 7.2 Control Command

```json
{
  "id": "uuid-v4",
  "timestamp": "2026-01-14T15:00:00.000Z",
  "target": "motor",
  "action": "start|stop|set_speed",
  "params": {
    "speed": 1500,
    "unit": "RPM"
  },
  "status": "pending|executed|failed",
  "error": null
}
```

### 7.3 System State

```json
{
  "motor": {
    "state": "stopped|running|error",
    "speed": 0,
    "target_speed": 0
  },
  "sensors": {
    "temperature": { "value": 37.0, "unit": "°C", "status": "ok" },
    "pressure": { "value": 80, "unit": "mmHg", "status": "ok" },
    "flow_rate": { "value": 5.0, "unit": "L/min", "status": "ok" }
  },
  "connection": {
    "hardware": "simulator|serial|disconnected",
    "clients": 1
  }
}
```

---

## 8. Security & Compliance

### 8.1 Security Checklist

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| No hardcoded secrets | `.env` files, not in git | ○ To Do |
| Input validation | All API inputs validated | ○ To Do |
| No localStorage | In-memory state only | ○ To Do |
| Rate limiting | Commands throttled | ○ To Do |
| Audit trail | All commands logged with timestamp | ○ To Do |
| Graceful degradation | Failed reads don't crash system | ○ To Do |

### 8.2 Compliance Notes (IEC 62304)

| Requirement | Approach |
|-------------|----------|
| Design History | Git history + IMPLEMENTATION_LOG.md |
| Traceability | Requirements → Code → Tests mapping |
| Risk Analysis | Document in Phase 2 |
| Change Control | Pull request workflow |

---

## 9. Implementation Phases

### Phase 1: MVP (Weeks 1-2) ◐ In Progress

| Task | Status | Owner |
|------|--------|-------|
| Backend: Express + Socket.io server | ○ To Do | - |
| Backend: SQLite schema + migrations | ○ To Do | - |
| Backend: Sensor simulator | ○ To Do | - |
| Backend: Logger service | ○ To Do | - |
| Backend: Control command handler | ○ To Do | - |
| Frontend: Dashboard UI | ○ To Do | - |
| Frontend: Real-time graphs | ○ To Do | - |
| Frontend: Motor controls | ○ To Do | - |
| Frontend: Log viewer + CSV export | ○ To Do | - |
| **Deliverable**: Working app with simulated data | | |

### Phase 2: Warnings & Testing (Weeks 3-4)

| Task | Status |
|------|--------|
| Alert engine (threshold checking) | ○ To Do |
| Serial port integration (ESP32) | ○ To Do |
| Automated test suite | ○ To Do |
| Authentication (JWT) | ○ To Do |

### Phase 3: Production & Hardware (Weeks 5+)

| Task | Status |
|------|--------|
| Real ESP32 sensor integration | ○ To Do |
| Cloud deployment option | ○ To Do |
| Mobile app wrapper (Capacitor) | ○ To Do |
| IEC 62304 compliance documentation | ○ To Do |

---

## 10. Known Constraints

### 10.1 Current Limitations

| Constraint | Mitigation |
|------------|------------|
| No real hardware yet | Simulator generates realistic data |
| Sensor specs incomplete | Pending extraction from `Sensors Sam and Clara.pptx` |
| Single-user Phase 1 | Architecture supports multi-user |

### 10.2 Assumptions

| Assumption | Risk if Wrong |
|------------|---------------|
| ESP32 WiFi reliable | May need USB serial fallback |
| SQLite sufficient for 100k logs | May need SQLite WAL mode or migration |
| V/F motor control adequate | May need closed-loop control later |

### 10.3 Dependencies

| Dependency | Version | Notes |
|------------|---------|-------|
| Node.js | ≥18.x | LTS version |
| npm | ≥9.x | Comes with Node |
| SQLite3 | ≥5.x | Via better-sqlite3 |
| Chart.js | ≥4.x | ESM module |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-14 | 0.1 | Initial architecture based on hardware research |

---

## Related Documents

- [HARDWARE_SPECS.md](file:///c:/Users/renan/Desktop/artHeart/software/antigrav_summary/HARDWARE_SPECS.md) - Component specifications
- [MOTOR_CONTROL_SPECS.md](file:///c:/Users/renan/Desktop/artHeart/software/antigrav_summary/MOTOR_CONTROL_SPECS.md) - Motor control parameters
- [IMPLEMENTATION_LOG.md](file:///c:/Users/renan/Desktop/artHeart/software/IMPLEMENTATION_LOG.md) - Progress tracking
