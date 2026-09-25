export interface SensorMetadata {
  id: string;
  name: string;
  category: 'vision' | 'laser' | 'tension' | 'ultrasonic' | 'daq' | 'edge';
  model: string;
  role: string;
  tier: 'T1 Core' | 'T2 Fusion' | 'Edge DAQ' | 'Edge Compute';
  samplingRate: string;
  measurementRange: string;
  resolution: string;
  protocol: string;
  controllerNode: string;
  status: 'ONLINE' | 'ACTIVE' | 'CALIBRATED';
  description: string;
  provenance: string;
  keyMetrics: { label: string; value: string; unit: string; normalRange: string }[];
}

export const SENSOR_REGISTRY: Record<string, SensorMetadata> = {
  ai_camera: {
    id: 'ai_camera',
    name: 'HD AI Vision Inspection Camera',
    category: 'vision',
    model: 'Basler ace 2 Pro (Sony IMX547 5.1MP)',
    role: 'Top-surface continuous visual inspection, cord pullout, splice opening, and crack detection',
    tier: 'T1 Core',
    samplingRate: '30 FPS (Hardware Strobe Synced)',
    measurementRange: '0 - 1500 mm belt width FOV',
    resolution: '2448 x 2048 @ 0.6 mm/px GSD',
    protocol: 'GigE Vision (IEEE 802.3ab)',
    controllerNode: 'Raspberry Pi 4 (Edge YOLOv8 inference)',
    status: 'ACTIVE',
    description: 'High-speed industrial monochrome + RGB camera with high-intensity LED ring strobes. Feeds bounding box detections and joint surface defects to the local edge inference pipeline.',
    provenance: 'SIMULATED (Realistic Public Benchmark Augmentation)',
    keyMetrics: [
      { label: 'Current Framerate', value: '30.0', unit: 'FPS', normalRange: '29.5 - 30.5' },
      { label: 'Exposure Time', value: '350', unit: 'µs', normalRange: '200 - 500' },
      { label: 'Image Quality Score', value: '98.4', unit: '%', normalRange: '> 90%' },
      { label: 'Detection Latency', value: '28.4', unit: 'ms', normalRange: '< 40 ms' },
    ],
  },
  laser_scanner: {
    id: 'laser_scanner',
    name: '3D Laser Beam Profile Scanner',
    category: 'laser',
    model: 'Gocator 2520 3D Smart Line Profiler',
    role: 'High-speed splice height profiling, joint lift, step-height measurement, and cross-section wear',
    tier: 'T2 Fusion',
    samplingRate: '1,000 Hz Profile Lines',
    measurementRange: 'Z: 100 mm depth, X: 1200 mm width',
    resolution: 'Z: 0.012 mm (12 µm), X: 0.25 mm',
    protocol: 'Modbus TCP / Raw Point Cloud Stream',
    controllerNode: 'STM32F4 High-Speed DAQ -> RPi 4',
    status: 'ACTIVE',
    description: 'Calibrated green laser fan (532 nm) sheet triangulation sensor. Captures micro-step elevations at splice margins to detect cord separation and splice lifting before structural delamination.',
    provenance: 'SIMULATED (Geometric Profiler Model)',
    keyMetrics: [
      { label: 'Splice Step Height', value: '0.42', unit: 'mm', normalRange: '< 1.5 mm' },
      { label: 'Belt Thickness Wear', value: '18.4', unit: 'mm', normalRange: '16.0 - 20.0 mm' },
      { label: 'Laser Line Intensity', value: '94.2', unit: '%', normalRange: '85 - 100%' },
      { label: 'Profile Point Count', value: '1920', unit: 'pts/line', normalRange: '1920' },
    ],
  },
  load_cell: {
    id: 'load_cell',
    name: 'Tension Load Cell Sensors',
    category: 'tension',
    model: 'Flintec SB4 Stainless Shear Beam (Dual 100kN)',
    role: 'Continuous dynamic belt tension, load asymmetry, and take-up pulley carriage strain',
    tier: 'T1 Core',
    samplingRate: '100 Hz Continuous',
    measurementRange: '0 - 200 kN Total Tension',
    resolution: '0.05 kN (0.025% F.S.)',
    protocol: '4-20 mA Isolated -> STM32 24-bit ADC',
    controllerNode: 'STM32F4 Industrial DAQ Node',
    status: 'ONLINE',
    description: 'Hermetically sealed IP68 dual strain gauge load cells mounted directly on the tail take-up sliding carriage. Monitors belt tension harmonics to detect splice elongation and drive slipping.',
    provenance: 'SIMULATED (Physical Tension Model)',
    keyMetrics: [
      { label: 'Dynamic Tension', value: '44.8', unit: 'kN', normalRange: '38 - 55 kN' },
      { label: 'Left/Right Asymmetry', value: '1.2', unit: '%', normalRange: '< 5%' },
      { label: 'Tension Drift (24h)', value: '+0.3', unit: 'kN', normalRange: '± 2.0 kN' },
      { label: 'Sensor Excitation', value: '10.0', unit: 'V DC', normalRange: '9.9 - 10.1 V' },
    ],
  },
  ultrasonic_transducer: {
    id: 'ultrasonic_transducer',
    name: 'Ultrasonic Flaw Transducers',
    category: 'ultrasonic',
    model: 'Olympus Dual-Element Immersion Transducer (2.25 MHz)',
    role: 'Sub-surface internal rubber void detection, steel-cord bonding integrity, and internal delamination',
    tier: 'T2 Fusion',
    samplingRate: '250 kHz Pulse Repetition',
    measurementRange: '2 mm - 35 mm belt thickness',
    resolution: '0.1 mm internal defect sizing',
    protocol: 'Differential Analog Pulse / Envelope to STM32 DSP',
    controllerNode: 'STM32F4 DSP DAQ Node',
    status: 'ACTIVE',
    description: 'Focused high-frequency acoustic pulse-echo transducer array positioned at the joint scan station. Penetrates rubber covers to identify cord adhesion loss and hidden air pockets.',
    provenance: 'SIMULATED (Acoustic Echo Model)',
    keyMetrics: [
      { label: 'Echo Amplitude Ratio', value: '0.94', unit: 'dB rel', normalRange: '> 0.85' },
      { label: 'Acoustic Attenuation', value: '1.8', unit: 'dB/cm', normalRange: '1.2 - 2.5 dB/cm' },
      { label: 'Internal Delamination Flag', value: 'CLEAR', unit: '', normalRange: 'CLEAR' },
      { label: 'Pulse Center Frequency', value: '2.25', unit: 'MHz', normalRange: '2.2 - 2.3 MHz' },
    ],
  },
  esp32_stm32: {
    id: 'esp32_stm32',
    name: 'STM32F4 & ESP32 Dual DAQ Controller',
    category: 'daq',
    model: 'STM32F407 High-Speed + ESP32-WROOM-32U Edge Node',
    role: 'Microsecond sensor synchronization, hardware encoder pulse counting, and Modbus/MQTT packaging',
    tier: 'Edge DAQ',
    samplingRate: 'Hardware Timer @ 1 MHz resolution',
    measurementRange: '8 Analog Channels, 4 Encoder Inputs',
    resolution: '24-bit Sigma-Delta ADC, 32-bit Timers',
    protocol: 'SPI / UART to RPi 4 & Isolated RS-485 Modbus',
    controllerNode: 'Local IP67 Instrument Box',
    status: 'ONLINE',
    description: 'Redundant dual-MCU data acquisition subsystem. STM32 handles deterministic timestamping and high-frequency ADC sampling; ESP32 maintains fallback WiFi/BLE diagnostic interface.',
    provenance: 'SIMULATED (Firmware Heartbeat)',
    keyMetrics: [
      { label: 'MCU Core Frequency', value: '168', unit: 'MHz', normalRange: '168 MHz' },
      { label: 'Time Sync Offset (PTP)', value: '12', unit: 'µs', normalRange: '< 50 µs' },
      { label: 'Buffer Usage', value: '14.2', unit: '%', normalRange: '< 80%' },
      { label: 'Bus Packet Loss', value: '0.00', unit: '%', normalRange: '< 0.01%' },
    ],
  },
  raspberry_pi: {
    id: 'raspberry_pi',
    name: 'Raspberry Pi 4 Edge Inference Gateway',
    category: 'edge',
    model: 'Raspberry Pi 4 Model B (8GB RAM, Broadcom BCM2711)',
    role: 'Local YOLOv8 vision inference, multi-modal sensor corroboration, edge SQLite cache, and MQTT publisher',
    tier: 'Edge Compute',
    samplingRate: 'Real-time Event-driven Edge Processing',
    measurementRange: '4-core Cortex-A72 @ 1.8 GHz with passive heatsink',
    resolution: 'FP16 Quantized Model Execution',
    protocol: 'MQTT over TLS / Local WebSocket / REST API',
    controllerNode: 'Autonomous Industrial Edge Unit',
    status: 'ACTIVE',
    description: 'Ruggedized edge computing engine executing ISO-compliant sensor fusion and persistence logic. Runs edge-first so monitoring continues seamlessly even during network disconnects.',
    provenance: 'SIMULATED (Edge Host Telemetry)',
    keyMetrics: [
      { label: 'CPU Temperature', value: '46.8', unit: '°C', normalRange: '< 75 °C' },
      { label: 'RAM Utilization', value: '2.4 / 8.0', unit: 'GB', normalRange: '< 6.5 GB' },
      { label: 'Local Queue Depth', value: '0', unit: 'events', normalRange: '< 500' },
      { label: 'Edge Uptime', value: '99.98', unit: '%', normalRange: '> 99.5%' },
    ],
  },
};
