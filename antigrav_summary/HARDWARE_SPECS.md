# Hardware Specifications Summary

*Last Updated: 2026-01-14*
*Source: Project documentation in `2025-2026/2025-2026/` folder*

---

## 1. Microcontroller

### ESP32-WROOM-32
- **Source**: [Inverter_LTSpice_Match.net](file:///c:/Users/renan/Desktop/artHeart/software/2025-2026/2025-2026/KiCAD/Inverter.%20V1/Inverter_LTSpice_Match.net) (Line 475-490)
- **Datasheet**: https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf
- **Features**:
  - Wi-Fi 802.11b/g/n
  - Bluetooth + BLE
  - 32-bit processor
  - Operating voltage: 2.7-3.6V
  - Onboard antenna (SMD)
- **Assigned GPIO Pins** (from netlist):
  - `GPIO25` → Gate Driver U1 INA
  - `GPIO26` → Gate Driver U1 INB
  - `GPIO32` → Gate Driver U2 INA
  - `GPIO33` → Gate Driver U2 INB
  - `SENSOR_VP` (Pin 4) - Available for ADC
  - `SENSOR_VN` (Pin 5) - Available for ADC

## 2. Power Management

### DC/DC Regulator: OKI-78SR-3.3_1.5-W36-C
- **Source**: Inverter_LTSpice_Match.net (Line 491-506)
- **Datasheet**: https://power.murata.com/data/power/oki-78sr.pdf
- **Specifications**:
  - Input: 7-36V DC
  - Output: 3.3V fixed
  - Max Current: 1.5A
  - Operating Temperature: -40°C to +85°C

### Power MOSFETs: IPD082N10N3 G (x4)
- **Manufacturer**: Infineon Technologies
- **Package**: PG-TO252 (DPAK)
- **Specifications**:
  - OptiMOS-3 Power Transistor
  - Maximum Voltage: 100V
  - Used in H-bridge configuration for inverter

### Gate Drivers: ADP3654ARHZ (x2)
- **Function**: Drive MOSFET gates for inverter switching
- **Connections**:
  - U1: Controls Q1/Q2 pair
  - U2: Controls Q3/Q4 pair

## 3. Circuit Components

### Capacitors
| Reference | Value | Description | Datasheet |
|-----------|-------|-------------|-----------|
| C1, C2 | 0.091µF | GRM31M7U1H913JA01L (Murata, MLCC 1206) | [Link](https://search.murata.co.jp/Ceramy/image/img/A01X/G101/ENG/GRM31M7U1H913JA01-01A.pdf) |
| C3, C5 | 10µF | C1210C106M6PACTU (KEMET) | [Link](https://content.kemet.com/datasheets/KEM_C1006_X5R_SMD.pdf) |
| C4, C6, C7, C8 | 0.1µF | C0603C104K3RACTU (KEMET) | [Link](https://content.kemet.com/datasheets/KEM_C1002_X7R_SMD.pdf) |

### Diodes: SS22 Schottky (x2)
- **Voltage**: 20V
- **Current**: 2A
- **Datasheet**: https://www.vishay.com/docs/88748/ss22.pdf

### Connectors
- **J1**: Screw Terminal 2-pin (5mm pitch) - Power input
- **J2**: Generic connector 2-pin (3.96mm pitch) - Coil output

## 4. Communication Interfaces

Based on ESP32 capabilities and KiCAD design:
- **USB Serial** - For programming/debugging (via USB-to-UART bridge)
- **WiFi** - ESP32 native 802.11b/g/n
- **Bluetooth** - ESP32 native BLE support
- **GPIO** - Direct pin control for sensors

## 5. Voltage Rails

| Rail | Voltage | Purpose |
|------|---------|---------|
| Input | 12V | Main power supply, gate drivers |
| Logic | 3.3V | ESP32, sensor ICs |

## 6. Coil/TET System Notes

From [Simulation notes.txt](file:///c:/Users/renan/Desktop/artHeart/software/2025-2026/2025-2026/Coil/Simulation/ANSYS/Hamilton%20High-Quality/3D%20models/Simulation%20notes.txt):
- Outer coil: 2mm separation from skin (for clothing)
- Inner coil: Zero tolerance (implanted)
- Litz wire: 48 strands, individually insulated
- Skin simulation thickness: 20mm (standard chest/abdominal)

---

## 7. Sensor Information (TO BE DETERMINED)

### Pending Discovery
The following sensor details are likely in the presentations:
- `Sensors Sam and Clara.pptx` - Need manual extraction
- `meg_motor_control_safety.pptx` - Safety thresholds

### Expected Sensors (from WhatsApp requirements image)
1. **Temperature Sensor** - Range TBD
2. **Pressure Sensor** - Range TBD
3. **Flow Rate Sensor** - Range TBD
4. **Motor Current/Speed** - Via internal sensing

---

## 8. File Sources

| File | Contains |
|------|----------|
| `2025-2026/2025-2026/KiCAD/Inverter. V1/Inverter_LTSpice_Match.net` | Complete BOM and connections |
| `2025-2026/2025-2026/Wokwi/InverterESP32Code.docx` | ESP32 code (need manual extraction) |
| `2025-2026/2025-2026/Presentation/Sensors Sam and Clara.pptx` | Sensor specifications |
| `2025-2026/2025-2026/Coil/Simulation/ANSYS/.../Simulation notes.txt` | Coil physical parameters |
| `2025-2026/2025-2026/Coil/Simulation/ANSYS/.../Research Sources.txt` | Medical research references |

---

## Action Items

- [ ] Extract sensor specs from `Sensors Sam and Clara.pptx` (convert to PDF or extract manually)
- [ ] Extract ESP32 code from `InverterESP32Code.docx`
- [ ] Confirm motor specifications from motor presentations
- [ ] Determine serial communication protocol (baud rate, message format)
