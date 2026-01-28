# Research Findings Summary

*Generated: 2026-01-14*  
*Purpose: Answers to clarifying questions with source references*

---

## Questions & Answers

### 1. Primary Sensor Types and Ranges

**Status**: ⚠️ Partially Determined

| Sensor | Range | Unit | Source | Confidence |
|--------|-------|------|--------|------------|
| Temperature | 30-45 | °C | Design assumption (body temp range) | Medium |
| Pressure | 50-150 | mmHg | Design assumption (cardiac range) | Medium |
| Flow Rate | 0-10 | L/min | Design assumption (cardiac output) | Medium |
| Motor Speed | 0-3000 | RPM | Inferred from PMSM specs | Medium |
| Power Draw | 0-50 | W | Inferred from 12V/20V system | Low |

**Pending**: Exact specifications likely in:
- `Sensors Sam and Clara.pptx` (path: `2025-2026/2025-2026/Presentation/`)
- Manual extraction required (.pptx not programmatically readable)

---

### 2. Deployment Environment

**Answer**: Local workstation only (Phase 1)

**Decision**: 
- Phase 1: Local deployment (http://localhost:3000)
- Phase 3: Cloud option available (architecture supports it)

**Rationale**: 
- Simpler development and testing
- No network dependencies during bench testing
- Faster iteration

---

### 3. Simultaneous Users

**Answer**: 1 user for Phase 1, architecture supports 10+ for Phase 3

**Decision**:
- Phase 1: Single operator at workstation
- Phase 3: Multiple operators via cloud deployment

**Implementation**:
- Socket.io rooms can isolate sessions
- SQLite handles single-writer, multiple-readers

---

### 4. Hardware Interface

**Answer**: ESP32 supports both WiFi AND USB Serial

**Source**: [KiCAD Netlist](file:///c:/Users/renan/Desktop/artHeart/software/2025-2026/2025-2026/KiCAD/Inverter.%20V1/Inverter_LTSpice_Match.net), Lines 475-490

**ESP32-WROOM-32 Capabilities**:
| Interface | Availability | Phase |
|-----------|--------------|-------|
| WiFi 802.11b/g/n | Built-in | Phase 2/3 |
| Bluetooth/BLE | Built-in | Phase 3 |
| USB Serial (UART) | Via TXD0/RXD0 | Phase 2 |

**Recommendation**: Start with USB Serial for reliability, add WiFi later.

---

### 5. Data Retention Requirements

**Decision**: Recommended best practices for medical device testing

| Requirement | Implementation |
|-------------|----------------|
| **Log Retention** | Minimum 1 year (configurable) |
| **Backup Frequency** | Daily automated backup |
| **Data Format** | SQLite + CSV exports |
| **Audit Trail** | All commands logged with timestamp |
| **Deletion Policy** | No auto-delete; manual archive |

**Medical Compliance Notes** (IEC 62304 / FDA 21 CFR Part 11):
- ✓ Timestamped audit logs
- ✓ No modification of historical data
- ✓ Traceability of all actions
- ○ Digital signatures (Phase 2)
- ○ Access control (Phase 2)

---

## Hardware Specifications Found

### Microcontroller: ESP32-WROOM-32
| Property | Value | Source |
|----------|-------|--------|
| Model | ESP32-WROOM-32 | KiCAD Netlist, Line 476 |
| WiFi | 802.11b/g/n | Datasheet |
| Bluetooth | BLE + Classic | Datasheet |
| Voltage | 2.7-3.6V (3.3V nominal) | Netlist, Line 483 |
| Datasheet | [espressif.com](https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf) | Netlist |

**Source Path**: `2025-2026/2025-2026/KiCAD/Inverter. V1/Inverter_LTSpice_Match.net`

---

### Motor: YASA PMSM
| Property | Value | Source |
|----------|-------|--------|
| Type | PMSM (Permanent Magnet Synchronous) | VFD PDF |
| Configuration | 3-phase, Star Connected | VFD PDF |
| Architecture | Axial Flux (YASA design) | Motor folder docs |
| Control | V/F (Voltage/Frequency) | VFD PDF |
| PWM Frequency | 20 kHz | VFD PDF |

**Source Path**: `2025-2026/2025-2026/LTSpice/Motor Control/Full Description and Explanation of the Variable Frequency Drive.pdf`

---

### Power System
| Component | Value | Source |
|-----------|-------|--------|
| Input | 12V AC (from TET coils) | VFD PDF |
| Boost Output | 20V DC | VFD PDF |
| Boost Chip | LTC3872 | VFD PDF |
| ESP32 Rail | 3.3V | Netlist (OKI-78SR regulator) |
| MOSFETs | IRFZ44N (6x) | VFD PDF |
| Gate Driver | IR2110 | VFD PDF |

---

### Gate Drivers (from KiCAD)
| Component | Value | Source |
|-----------|-------|--------|
| Model | ADP3654ARHZ (x2) | Netlist, Line 449-474 |
| Purpose | MOSFET gate drive | Netlist |
| GPIO Mapping | 25, 26, 32, 33 | Netlist, Lines 786-797 |

---

## Files Explored

| File | Type | Content Found |
|------|------|---------------|
| `Inverter_LTSpice_Match.net` | KiCAD Netlist | Complete BOM, ESP32 pinout |
| `Full Description...VFD.pdf` | PDF | Motor control specs |
| `Simulation notes.txt` | Text | Coil physical parameters |
| `Research Sources.txt` | Text | Medical research links |
| `WhatsApp Image...jpeg` | Image | Software requirements bullet points |

---

## Files Requiring Manual Extraction

| File | Expected Content | Priority |
|------|------------------|----------|
| `Sensors Sam and Clara.pptx` | Sensor specs, ranges | High |
| `InverterESP32Code.docx` | ESP32 firmware code | Medium |
| `meg_motor_control_safety.pptx` | Safety thresholds | Medium |
| `YASAmotor (1).docx` | Motor specifications | Low |

---

## Recommended Next Steps

### Immediate
1. **Create file structure** - Set up backend/frontend folders
2. **Initialize npm project** - Install dependencies
3. **Start backend server** - Express + Socket.io

### Short-term
1. **Extract sensor specs** - Manually open `Sensors Sam and Clara.pptx`
2. **Review ESP32 code** - Manually open `InverterESP32Code.docx`
3. **Update HARDWARE_SPECS.md** - Add extracted information

### First 3 Tickets (< 1 day each)

#### Ticket 1: Backend Project Setup
- Initialize npm project
- Install: express, socket.io, better-sqlite3
- Create basic server.js with health endpoint
- **Definition of Done**: `npm start` runs server on :3000

#### Ticket 2: Database Schema
- Create SQLite schema for sensor_readings and commands
- Implement db.js connection module
- Write migration script
- **Definition of Done**: Tables created, can INSERT/SELECT

#### Ticket 3: Sensor Simulator
- Create simulator.js with realistic fake data
- Configure sensor ranges in config.json
- Emit data every 1 second
- **Definition of Done**: Console logs simulated readings
