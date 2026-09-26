export interface SensorMetadata {
  id: string;
  name: string;
  category: 'vision' | 'laser' | 'tension' | 'proximity' | 'daq' | 'edge';
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
  multispectral_camera: {
    id: 'multispectral_camera',
    name: 'Multispectral AI Inspection Camera',
    category: 'vision',
    model: 'Basler ace 2 Pro Multispectral (Sony IMX547 RGB + NIR 5.1MP)',
    role: 'Top-surface continuous visual inspection at head pulley discharge; detects splice lift, cracks, and cord exposure',
    tier: 'T1 Core',
    samplingRate: '30 FPS (Hardware Strobe Synced)',
    measurementRange: '0 - 1500 mm belt width FOV',
    resolution: '2448 x 2048 @ 0.6 mm/px GSD',
    protocol: 'GigE Vision (IEEE 802.3ab)',
    controllerNode: 'Raspberry Pi 4 (Edge YOLOv8 inference)',
    status: 'ACTIVE',
    description: 'Mounted on the vertical inspection mast overlooking the head drive pulley. Combines visible RGB and Near-Infrared (NIR) spectrums to penetrate dust and capture micro-surface cracks and splice degradation.',
    provenance: 'SIMULATED (Multispectral AI Model)',
    keyMetrics: [
      { label: 'Current Framerate', value: '30.0', unit: 'FPS', normalRange: '29.5 - 30.5' },
      { label: 'Multispectral Band Ratio', value: '1.12', unit: 'NIR/RGB', normalRange: '1.0 - 1.3' },
      { label: 'Image Quality Score', value: '98.6', unit: '%', normalRange: '> 90%' },
      { label: 'YOLOv8 Detection Latency', value: '28.4', unit: 'ms', normalRange: '< 40 ms' },
    ],
  },
  tf_luna_lidar: {
    id: 'tf_luna_lidar',
    name: 'TF-Luna Micro LiDAR 3D Profile Scanner',
    category: 'laser',
    model: 'Benewake TF-Luna 850nm ToF Solid-State LiDAR',
    role: 'High-speed 3D surface profile scanning, splice step height, joint lift, and belt thickness elevation',
    tier: 'T2 Fusion',
    samplingRate: '100 Hz Continuous ToF Ranging',
    measurementRange: '0.2 m - 8.0 m (1 mm resolution)',
    resolution: '±1 mm accuracy',
    protocol: 'UART / I2C -> STM32 DAQ -> RPi 4',
    controllerNode: 'STM32F407 High-Speed DAQ',
    status: 'ACTIVE',
    description: 'Compact solid-state LiDAR module using Time-of-Flight (ToF) technology at 850nm. Mounted over the loading end to accurately measure belt surface depth, splice lip height, and 3D elevation profile.',
    provenance: 'SIMULATED (ToF Profile Scanner Model)',
    keyMetrics: [
      { label: 'Splice Step Height', value: '0.42', unit: 'mm', normalRange: '< 1.5 mm' },
      { label: 'Profile Elevation', value: '342.1', unit: 'mm', normalRange: '340 - 345 mm' },
      { label: 'Signal Quality Score', value: '96.8', unit: '%', normalRange: '> 85%' },
      { label: 'LiDAR Ranging Frequency', value: '100', unit: 'Hz', normalRange: '95 - 105 Hz' },
    ],
  },
  load_cell: {
    id: 'load_cell',
    name: 'Tension & Load Cell Sensors',
    category: 'tension',
    model: 'S-Type / Shear Beam Precision Load Cell (Dual 100kN)',
    role: 'Continuous dynamic belt tension, load asymmetry, and take-up pulley carriage strain',
    tier: 'T1 Core',
    samplingRate: '100 Hz Continuous',
    measurementRange: '0 - 200 kN Total Tension',
    resolution: '0.05 kN (0.025% F.S.)',
    protocol: '4-20 mA Isolated -> STM32 24-bit ADC',
    controllerNode: 'STM32F4 Industrial DAQ Node',
    status: 'ONLINE',
    description: 'Hermetically sealed IP68 dual strain gauge load cells mounted at the loading take-up sliding carriage. Monitors belt tension harmonics to detect splice elongation and drive slipping.',
    provenance: 'SIMULATED (Physical Tension Model)',
    keyMetrics: [
      { label: 'Dynamic Tension', value: '44.8', unit: 'kN', normalRange: '38 - 55 kN' },
      { label: 'Left/Right Asymmetry', value: '1.2', unit: '%', normalRange: '< 5%' },
      { label: 'Tension Drift (24h)', value: '+0.3', unit: 'kN', normalRange: '± 2.0 kN' },
      { label: 'Sensor Excitation', value: '10.0', unit: 'V DC', normalRange: '9.9 - 10.1 V' },
    ],
  },
  inductive_proxi: {
    id: 'inductive_proxi',
    name: 'Inductive Proximity Sensor Array (Internal Rupture Sensors)',
    category: 'proximity',
    model: 'OMRON E2B High-Sensitivity M18 Inductive Array (3 Stations)',
    role: 'Detects internal steel cord damage, splice core delamination, and magnetic joint markers across 3 stations',
    tier: 'T2 Fusion',
    samplingRate: '1,000 Hz High-Speed Pulse Counting',
    measurementRange: '0 - 15 mm Sensing Distance',
    resolution: '0.05 mm Eddy Current Displacement',
    protocol: 'High-Speed Digital Interrupt / Modbus RS-485',
    controllerNode: 'STM32F4 Fast Interrupt DAQ Node',
    status: 'ACTIVE',
    description: 'Three inductive proximity sensor stations distributed along the conveyor bed beneath the belt. Employs electromagnetic eddy currents to detect ruptured internal cords, splice metallic anchors, and cord spacing pitch deviations.',
    provenance: 'SIMULATED (Inductive Eddy-Current Model)',
    keyMetrics: [
      { label: 'Station 1 Proximity Signal', value: '4.85', unit: 'V', normalRange: '4.5 - 5.0 V' },
      { label: 'Station 2 Proximity Signal', value: '4.90', unit: 'V', normalRange: '4.5 - 5.0 V' },
      { label: 'Station 3 Proximity Signal', value: '4.88', unit: 'V', normalRange: '4.5 - 5.0 V' },
      { label: 'Cord Rupture Flag', value: 'CLEAR', unit: '', normalRange: 'CLEAR' },
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
