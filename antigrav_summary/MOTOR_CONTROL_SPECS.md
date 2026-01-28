# Motor Control Specifications

*Last Updated: 2026-01-14*
*Source: `Full Description and Explanation of the Variable Frequency Drive.pdf`*
*Path: [2025-2026/2025-2026/LTSpice/Motor Control/](file:///c:/Users/renan/Desktop/artHeart/software/2025-2026/2025-2026/LTSpice/Motor%20Control/)*

---

## 1. Motor Type

### YASA PMSM (Permanent Magnet Synchronous Motor)
- **Configuration**: Three-phase, Star Connected Load
- **Architecture**: Axial Flux design (per Motor folder documentation)

## 2. Power System

### Voltage Rails
| Stage | Voltage | Purpose |
|-------|---------|---------|
| Input | 12V AC | From TET coils/inductor charging pads |
| Rectified | 12V DC | After rectification |
| Boosted | 20V DC | At MOSFET drains (via boost converter) |

### Key Components
- **Boost Converter**: LTC3872 chip (12V → 20V)
- **Inverter MOSFETs**: IRFZ44N (x6)
  - Max VDD: 55V
  - Rated for motor power requirements
- **Gate Driver**: IR2110
  - Requires 2 GPIOs from ESP32 per phase (HO and LO)
  - Total: 6 GPIOs for 3-phase control

## 3. Control Parameters

### Control Method: V/F (Voltage/Frequency)
- **Controller**: ESP32 (signal generator)
- **PWM Frequency**: 20 kHz
- **Waveform**: Comparison of sinusoidal reference vs. 20kHz triangle wave
- **Phase Shift**: 120° between phases

### Signal Logic
```
Reference Voltage > Triangle Wave → High-side N-MOS ON
Reference Voltage < Triangle Wave → Low-side N-MOS ON
```

## 4. Safety Features

### Short-Circuit Prevention
- **Dead Time**: Implemented in comparison logic
- Prevents simultaneous High/Low-side conduction

### Voltage Protection
- **DC Link Capacitor**: Reduces ripple, smooths voltage (Stage 2→3)
- **Snubber RC Circuits**: In parallel with each MOSFET
  - Blocks voltage transients
  - Smooths AC output

### Current Limiting
- **Gate Resistors**: In series with each MOSFET gate
  - Reduces gate current spikes

## 5. ESP32 GPIO Requirements for Motor Control

| Function | GPIO Count | Description |
|----------|------------|-------------|
| Phase A HO/LO | 2 | High/Low side gate driver inputs |
| Phase B HO/LO | 2 | High/Low side gate driver inputs |
| Phase C HO/LO | 2 | High/Low side gate driver inputs |
| **Total** | **6** | Minimum for 3-phase V/F control |

## 6. Sensor Requirements (from this document)

### Currently Specified
- Input voltage sensing (from inductor charging pads)
- Voltage stabilization feedback

### Not Specified (likely open-loop)
- No Hall effect sensors mentioned
- No encoder feedback mentioned
- Suggests **sensorless V/F control** for initial design

---

## Software Implications

### Required Capabilities
1. **PWM Generation**: 20kHz, 6 channels
2. **Sinusoidal Waveform**: 120° phase-shifted for 3 phases
3. **Dead Time Control**: Configurable dead time in PWM
4. **Frequency Adjustment**: V/F ratio control for speed

### ESP32 MCPWM Module
The ESP32's MCPWM (Motor Control PWM) peripheral is ideal:
- 2 MCPWM units, each with 3 pairs of PWM outputs
- Hardware dead time insertion
- Built-in fault handling

---

## Related Files

| File | Content |
|------|---------|
| `Full_Schematic.asc` | LTSpice simulation of complete VFD |
| `YASAmotor (1).docx` | Motor design specifications |
| `Double_Rotor_AFPM_Design_Equations_DH.xlsx` | Motor calculations |
