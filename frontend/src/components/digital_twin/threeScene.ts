import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SENSOR_REGISTRY, SensorMetadata } from './sensorData';

export interface SceneOptions {
  container: HTMLDivElement;
  onSelectSensor: (sensor: SensorMetadata) => void;
  onSelectJoint: (jointCode: string) => void;
  onHoverObject: (name: string | null) => void;
}

export type ViewPreset = 'overview' | 'station' | 'drive' | 'tension' | 'edge';

export interface SceneToggles {
  showSensors: boolean;
  showBeams: boolean;
  showJoints: boolean;
  showProducts: boolean;
}

export class ConveyorDigitalTwinScene {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private animationFrameId: number | null = null;
  private isRunning: boolean = true;
  private clock: THREE.Clock = new THREE.Clock();

  // Callbacks
  private onSelectSensor: (sensor: SensorMetadata) => void;
  private onSelectJoint: (jointCode: string) => void;
  private onHoverObject: (name: string | null) => void;

  // Interactive Raycasting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2(-999, -999);
  private interactiveObjects: THREE.Object3D[] = [];
  private hoveredObject: THREE.Object3D | null = null;
  private originalEmissives: Map<THREE.Mesh, number> = new Map();

  // Animated elements
  private beltMeshTop!: THREE.Mesh;
  private beltMeshBottom!: THREE.Mesh;
  private beltMaterial!: THREE.MeshStandardMaterial;
  private rollers: THREE.Mesh[] = [];
  private motorRotorMesh!: THREE.Mesh;
  private products: THREE.Mesh[] = [];
  private jointMarkers: Map<string, THREE.Group> = new Map();
  private laserBeamMesh!: THREE.Mesh;
  private cameraFrustumMesh!: THREE.Mesh;
  private ultrasonicRingMesh!: THREE.Mesh;
  private daqLedMesh!: THREE.Mesh;
  private rpiLedMesh!: THREE.Mesh;

  // Groups for layer toggling
  private sensorGroup: THREE.Group = new THREE.Group();
  private beamGroup: THREE.Group = new THREE.Group();
  private jointGroup: THREE.Group = new THREE.Group();
  private productGroup: THREE.Group = new THREE.Group();

  // Dynamic simulation parameters
  private beltSpeedMps: number = 4.0;
  private speedFactor: number = 1.0;
  private isPaused: boolean = false;
  private targetJointCode: string = 'J04';
  private targetJointState: string = 'HEALTHY';
  private targetJointHealth: number = 95.0;

  // Camera lerping for presets
  private targetCamPos: THREE.Vector3 | null = null;
  private targetControlsTarget: THREE.Vector3 | null = null;

  // View preset coordinates
  private readonly PRESETS: Record<ViewPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
    overview: { pos: [12, 9, 12], target: [0, 1.2, 0] },
    station: { pos: [1.6, 4.0, 3.2], target: [0, 2.3, 0] },
    drive: { pos: [8.5, 3.2, 3.5], target: [6.0, 1.6, 0] },
    tension: { pos: [-8.5, 2.8, 3.5], target: [-6.0, 1.5, 0] },
    edge: { pos: [1.8, 2.4, 2.6], target: [0.8, 1.4, 1.1] },
  };

  constructor(options: SceneOptions) {
    this.container = options.container;
    this.onSelectSensor = options.onSelectSensor;
    this.onSelectJoint = options.onSelectJoint;
    this.onHoverObject = options.onHoverObject;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Slate-900 industrial control dark
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

    // 2. Camera setup
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    const defaultView = this.PRESETS.overview;
    this.camera.position.set(...defaultView.pos);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Do not go under floor
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 35;
    this.controls.target.set(...defaultView.target);

    // 5. Build Scene
    this.setupLighting();
    this.setupEnvironment();
    this.buildConveyorFrame();
    this.buildPulleysAndBelt();
    this.buildRollers();
    this.buildDriveMotorUnit();
    this.buildCargoProducts();
    this.buildSensorsAndHardware();
    this.buildJointMarkers();

    // Add toggleable groups
    this.scene.add(this.sensorGroup);
    this.scene.add(this.beamGroup);
    this.scene.add(this.jointGroup);
    this.scene.add(this.productGroup);

    // 6. Bind Event Listeners
    this.bindEvents();

    // 7. Start Animation Loop
    this.animate();
  }

  // ==========================================
  // LIGHTING & ENVIRONMENT
  // ==========================================
  private setupLighting(): void {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.7);
    this.scene.add(ambientLight);

    // Main Overhead Industrial Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 40;
    const d = 12;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Fill Light (Cool slate blue tone)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-8, 8, -6);
    this.scene.add(fillLight);

    // Inspection Station Accent Spotlight
    const stationSpot = new THREE.SpotLight(0x38bdf8, 2.0, 15, Math.PI / 5, 0.3);
    stationSpot.position.set(0, 5.5, 0);
    stationSpot.target.position.set(0, 1.6, 0);
    this.scene.add(stationSpot);
    this.scene.add(stationSpot.target);
  }

  private setupEnvironment(): void {
    // Floor Grid (Metric markings)
    const grid = new THREE.GridHelper(26, 26, 0x334155, 0x1e293b);
    grid.position.y = -0.01;
    this.scene.add(grid);

    // Matte Industrial Concrete Floor Plane
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Floor demarcation safety yellow boundary lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.6 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8.5, 0.01, -2.5),
      new THREE.Vector3(8.5, 0.01, -2.5),
      new THREE.Vector3(8.5, 0.01, 2.5),
      new THREE.Vector3(-8.5, 0.01, 2.5),
      new THREE.Vector3(-8.5, 0.01, -2.5),
    ]);
    const safetyLine = new THREE.Line(lineGeo, lineMat);
    this.scene.add(safetyLine);
  }

  // ==========================================
  // CONVEYOR STRUCTURAL FRAME
  // ==========================================
  private buildConveyorFrame(): void {
    const frameGroup = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Slate structural steel
      metalness: 0.6,
      roughness: 0.4,
    });
    const guardMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Safety warning yellow
      metalness: 0.4,
      roughness: 0.5,
    });

    const length = 13.0; // From x = -6.5 to +6.5
    const width = 1.6;

    // Main longitudinal side H-beams
    const beamGeo = new THREE.BoxGeometry(length, 0.18, 0.08);
    const leftBeam = new THREE.Mesh(beamGeo, steelMat);
    leftBeam.position.set(0, 1.45, -width / 2);
    leftBeam.castShadow = true;
    leftBeam.receiveShadow = true;
    frameGroup.add(leftBeam);

    const rightBeam = new THREE.Mesh(beamGeo, steelMat);
    rightBeam.position.set(0, 1.45, width / 2);
    rightBeam.castShadow = true;
    rightBeam.receiveShadow = true;
    frameGroup.add(rightBeam);

    // Return run support beams below
    const lowerLeftBeam = new THREE.Mesh(beamGeo, steelMat);
    lowerLeftBeam.position.set(0, 0.65, -width / 2);
    frameGroup.add(lowerLeftBeam);

    const lowerRightBeam = new THREE.Mesh(beamGeo, steelMat);
    lowerRightBeam.position.set(0, 0.65, width / 2);
    frameGroup.add(lowerRightBeam);

    // Support legs and cross braces every 2 meters
    const legGeo = new THREE.BoxGeometry(0.12, 1.45, 0.12);
    const footGeo = new THREE.BoxGeometry(0.3, 0.04, 0.3);
    const crossBeamGeo = new THREE.BoxGeometry(0.08, 0.08, width);

    for (let x = -6.0; x <= 6.0; x += 2.0) {
      // Left leg
      const legL = new THREE.Mesh(legGeo, steelMat);
      legL.position.set(x, 1.45 / 2, -width / 2);
      legL.castShadow = true;
      frameGroup.add(legL);

      const footL = new THREE.Mesh(footGeo, steelMat);
      footL.position.set(x, 0.02, -width / 2);
      frameGroup.add(footL);

      // Right leg
      const legR = new THREE.Mesh(legGeo, steelMat);
      legR.position.set(x, 1.45 / 2, width / 2);
      legR.castShadow = true;
      frameGroup.add(legR);

      const footR = new THREE.Mesh(footGeo, steelMat);
      footR.position.set(x, 0.02, width / 2);
      frameGroup.add(footR);

      // Cross beam
      const cross = new THREE.Mesh(crossBeamGeo, steelMat);
      cross.position.set(x, 1.45, 0);
      frameGroup.add(cross);

      const crossLower = new THREE.Mesh(crossBeamGeo, steelMat);
      crossLower.position.set(x, 0.65, 0);
      frameGroup.add(crossLower);
    }

    // Safety yellow kick-plates / skirt guards along carry edge
    const skirtGeo = new THREE.BoxGeometry(length, 0.15, 0.02);
    const skirtL = new THREE.Mesh(skirtGeo, guardMat);
    skirtL.position.set(0, 1.65, -width / 2 - 0.02);
    frameGroup.add(skirtL);

    const skirtR = new THREE.Mesh(skirtGeo, guardMat);
    skirtR.position.set(0, 1.65, width / 2 + 0.02);
    frameGroup.add(skirtR);

    this.scene.add(frameGroup);
  }

  // ==========================================
  // PULLEYS & MOVING BELT LOOP
  // ==========================================
  private buildPulleysAndBelt(): void {
    const pulleyRadius = 0.45;
    const pulleyWidth = 1.35;
    const pulleyGeo = new THREE.CylinderGeometry(pulleyRadius, pulleyRadius, pulleyWidth, 32);
    const pulleyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.5,
    });
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2,
    });

    // 1. Head Drive Pulley (at x = +6.0)
    const headPulley = new THREE.Mesh(pulleyGeo, pulleyMat);
    headPulley.rotation.x = Math.PI / 2;
    headPulley.position.set(6.0, 1.15, 0);
    headPulley.castShadow = true;
    this.scene.add(headPulley);

    // Head Shaft & Pillow Bearing Blocks
    const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 16);
    const headShaft = new THREE.Mesh(shaftGeo, shaftMat);
    headShaft.rotation.x = Math.PI / 2;
    headShaft.position.set(6.0, 1.15, 0);
    this.scene.add(headShaft);

    // 2. Tail Take-Up Pulley (at x = -6.0)
    const tailPulley = new THREE.Mesh(pulleyGeo, pulleyMat);
    tailPulley.rotation.x = Math.PI / 2;
    tailPulley.position.set(-6.0, 1.15, 0);
    tailPulley.castShadow = true;
    this.scene.add(tailPulley);

    const tailShaft = new THREE.Mesh(shaftGeo, shaftMat);
    tailShaft.rotation.x = Math.PI / 2;
    tailShaft.position.set(-6.0, 1.15, 0);
    this.scene.add(tailShaft);

    // 3. Continuous Conveyor Belt
    // Procedural canvas texture for belt surface with grip grooves and edge markers
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#18181b'; // Dark vulcanized rubber
    ctx.fillRect(0, 0, 1024, 256);

    // Longitudinal texture ribs
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 4;
    for (let y = 16; y < 256; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    // Periodic splice guidelines
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 2;
    for (let x = 64; x < 1024; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    const beltTexture = new THREE.CanvasTexture(canvas);
    beltTexture.wrapS = THREE.RepeatWrapping;
    beltTexture.wrapT = THREE.RepeatWrapping;
    beltTexture.repeat.set(8, 1);

    this.beltMaterial = new THREE.MeshStandardMaterial({
      map: beltTexture,
      roughness: 0.85,
      metalness: 0.1,
    });

    const beltLength = 12.0; // Between pulley centers
    const beltWidth = 1.3;

    // Top carry run
    const topBeltGeo = new THREE.PlaneGeometry(beltLength, beltWidth, 1, 1);
    this.beltMeshTop = new THREE.Mesh(topBeltGeo, this.beltMaterial);
    this.beltMeshTop.rotation.x = -Math.PI / 2;
    this.beltMeshTop.position.set(0, 1.15 + pulleyRadius, 0);
    this.beltMeshTop.receiveShadow = true;
    this.scene.add(this.beltMeshTop);

    // Bottom return run
    const bottomBeltGeo = new THREE.PlaneGeometry(beltLength, beltWidth, 1, 1);
    this.beltMeshBottom = new THREE.Mesh(bottomBeltGeo, this.beltMaterial);
    this.beltMeshBottom.rotation.x = Math.PI / 2;
    this.beltMeshBottom.position.set(0, 1.15 - pulleyRadius, 0);
    this.beltMeshBottom.receiveShadow = true;
    this.scene.add(this.beltMeshBottom);

    // Curved belt caps over pulleys
    const curveRadius = pulleyRadius + 0.01;
    const curveGeo = new THREE.CylinderGeometry(curveRadius, curveRadius, beltWidth, 32, 1, true, 0, Math.PI);

    const headCap = new THREE.Mesh(curveGeo, this.beltMaterial);
    headCap.rotation.x = Math.PI / 2;
    headCap.rotation.z = -Math.PI / 2;
    headCap.position.set(6.0, 1.15, 0);
    this.scene.add(headCap);

    const tailCap = new THREE.Mesh(curveGeo, this.beltMaterial);
    tailCap.rotation.x = Math.PI / 2;
    tailCap.rotation.z = Math.PI / 2;
    tailCap.position.set(-6.0, 1.15, 0);
    this.scene.add(tailCap);
  }

  // ==========================================
  // IDLER ROLLERS
  // ==========================================
  private buildRollers(): void {
    const rollerMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Galvanized steel roller
      metalness: 0.7,
      roughness: 0.3,
    });
    const rollerRadius = 0.08;
    const rollerLength = 1.32;
    const rollerGeo = new THREE.CylinderGeometry(rollerRadius, rollerRadius, rollerLength, 16);

    // Carry idlers spaced along top run
    for (let x = -5.0; x <= 5.0; x += 1.0) {
      const roller = new THREE.Mesh(rollerGeo, rollerMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(x, 1.6 - rollerRadius, 0);
      roller.castShadow = true;
      this.scene.add(roller);
      this.rollers.push(roller);
    }

    // Return idlers spaced along bottom run
    for (let x = -4.5; x <= 4.5; x += 1.8) {
      const returnRoller = new THREE.Mesh(rollerGeo, rollerMat);
      returnRoller.rotation.x = Math.PI / 2;
      returnRoller.position.set(x, 0.7 + rollerRadius, 0);
      returnRoller.castShadow = true;
      this.scene.add(returnRoller);
      this.rollers.push(returnRoller);
    }
  }

  // ==========================================
  // DRIVE MOTOR & GEARBOX UNIT
  // ==========================================
  private buildDriveMotorUnit(): void {
    const driveGroup = new THREE.Group();
    driveGroup.position.set(6.0, 1.15, 1.2);

    // Heavy-duty right-angle gearbox
    const gearMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f, // Industrial equipment blue
      metalness: 0.5,
      roughness: 0.4,
    });
    const gearboxGeo = new THREE.BoxGeometry(0.8, 0.9, 0.6);
    const gearbox = new THREE.Mesh(gearboxGeo, gearMat);
    gearbox.castShadow = true;
    driveGroup.add(gearbox);

    // Drive coupling shaft to head pulley
    const couplingMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const couplingGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 16);
    const coupling = new THREE.Mesh(couplingGeo, couplingMat);
    coupling.rotation.x = Math.PI / 2;
    coupling.position.set(0, 0, -0.6);
    driveGroup.add(coupling);

    // 3-Phase Induction Electric Motor
    const motorCylinderGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 24);
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // High-voltage motor blue
      metalness: 0.4,
      roughness: 0.5,
    });
    this.motorRotorMesh = new THREE.Mesh(motorCylinderGeo, motorMat);
    this.motorRotorMesh.rotation.z = Math.PI / 2;
    this.motorRotorMesh.position.set(0.95, 0, 0);
    this.motorRotorMesh.castShadow = true;
    driveGroup.add(this.motorRotorMesh);

    // Motor Cooling Fan Shroud
    const shroudGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 24);
    const shroudMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3, roughness: 0.7 });
    const shroud = new THREE.Mesh(shroudGeo, shroudMat);
    shroud.rotation.z = Math.PI / 2;
    shroud.position.set(1.5, 0, 0);
    driveGroup.add(shroud);

    // Terminal Connection Box on top of motor
    const termBoxGeo = new THREE.BoxGeometry(0.25, 0.18, 0.22);
    const termBox = new THREE.Mesh(termBoxGeo, gearMat);
    termBox.position.set(0.95, 0.42, 0);
    driveGroup.add(termBox);

    // Steel mounting skid base
    const skidGeo = new THREE.BoxGeometry(2.0, 0.12, 1.0);
    const skid = new THREE.Mesh(skidGeo, gearMat);
    skid.position.set(0.8, -0.5, 0);
    driveGroup.add(skid);

    this.scene.add(driveGroup);
  }

  // ==========================================
  // MOVING BULK CARGO CHUNKS (ORE / AGGREGATE)
  // ==========================================
  private buildCargoProducts(): void {
    const oreColors = [0x57534e, 0x78716c, 0xa8a29e, 0x44403c];

    for (let i = 0; i < 28; i++) {
      const radius = 0.09 + Math.random() * 0.08;
      const oreGeo = new THREE.DodecahedronGeometry(radius, 1);
      const oreMat = new THREE.MeshStandardMaterial({
        color: oreColors[i % oreColors.length],
        roughness: 0.9,
        metalness: 0.2,
      });

      const ore = new THREE.Mesh(oreGeo, oreMat);
      // Random position along top belt run
      const x = -5.5 + (i / 28) * 11.0;
      const z = (Math.random() - 0.5) * 0.8;
      ore.position.set(x, 1.6 + radius, z);
      ore.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      ore.castShadow = true;

      this.productGroup.add(ore);
      this.products.push(ore);
    }
  }

  // ==========================================
  // SENSORS & HARDWARE INSTRUMENTATION
  // ==========================================
  private buildSensorsAndHardware(): void {
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
    const casingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 });
    const aluminumMat = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: 0.85, roughness: 0.2 });

    // -------------------------------------------------------------
    // 1. OVERHEAD GANTRY ARCH FOR INSPECTION STATION (at x = 0.0)
    // -------------------------------------------------------------
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, 0);

    const postGeo = new THREE.BoxGeometry(0.15, 3.2, 0.15);
    const postL = new THREE.Mesh(postGeo, gantryMat);
    postL.position.set(0, 1.6, -1.2);
    postL.castShadow = true;
    archGroup.add(postL);

    const postR = new THREE.Mesh(postGeo, gantryMat);
    postR.position.set(0, 1.6, 1.2);
    postR.castShadow = true;
    archGroup.add(postR);

    const topBeamGeo = new THREE.BoxGeometry(0.2, 0.18, 2.5);
    const topBeam = new THREE.Mesh(topBeamGeo, gantryMat);
    topBeam.position.set(0, 3.2, 0);
    topBeam.castShadow = true;
    archGroup.add(topBeam);

    this.sensorGroup.add(archGroup);

    // -------------------------------------------------------------
    // 2. HD AI VISION CAMERA (30 FPS)
    // -------------------------------------------------------------
    const camGroup = new THREE.Group();
    camGroup.position.set(0, 3.0, 0);
    camGroup.name = 'ai_camera';

    // Dual industrial camera bodies
    const camBodyGeo = new THREE.BoxGeometry(0.22, 0.18, 0.28);
    const camBody = new THREE.Mesh(camBodyGeo, casingMat);
    camBody.castShadow = true;
    camGroup.add(camBody);

    // Optical Lens cylinders pointing down
    const lensGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.12, 16);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 });
    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.set(0, -0.12, -0.07);
    camGroup.add(lensL);

    const lensR = new THREE.Mesh(lensGeo, lensMat);
    lensR.position.set(0, -0.12, 0.07);
    camGroup.add(lensR);

    // Ring LED illuminator strobes
    const ledRingGeo = new THREE.TorusGeometry(0.08, 0.015, 8, 24);
    const ledRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ringL = new THREE.Mesh(ledRingGeo, ledRingMat);
    ringL.rotation.x = Math.PI / 2;
    ringL.position.set(0, -0.16, -0.07);
    camGroup.add(ringL);

    const ringR = new THREE.Mesh(ledRingGeo, ledRingMat);
    ringR.rotation.x = Math.PI / 2;
    ringR.position.set(0, -0.16, 0.07);
    camGroup.add(ringR);

    // Camera 30 FPS Activity Blinking LED
    const camLedGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const camLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.rpiLedMesh = new THREE.Mesh(camLedGeo, camLedMat);
    this.rpiLedMesh.position.set(0.12, 0.05, 0);
    camGroup.add(this.rpiLedMesh);

    this.registerInteractive(camGroup, 'ai_camera');
    this.sensorGroup.add(camGroup);

    // Translucent Visual Inspection Frustum (Cyan Pyramid)
    const frustumGeo = new THREE.ConeGeometry(0.9, 1.4, 4, 1, true);
    const frustumMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.18,
      wireframe: false,
      side: THREE.DoubleSide,
    });
    this.cameraFrustumMesh = new THREE.Mesh(frustumGeo, frustumMat);
    this.cameraFrustumMesh.position.set(0, 2.3, 0);
    this.cameraFrustumMesh.rotation.y = Math.PI / 4;
    this.cameraFrustumMesh.scale.set(1.4, 1.0, 1.4);
    this.beamGroup.add(this.cameraFrustumMesh);

    // -------------------------------------------------------------
    // 3. 3D LASER BEAM PROFILE SCANNER
    // -------------------------------------------------------------
    const laserGroup = new THREE.Group();
    laserGroup.position.set(0.45, 2.8, 0);
    laserGroup.name = 'laser_scanner';

    const laserBoxGeo = new THREE.BoxGeometry(0.15, 0.16, 0.9);
    const laserBox = new THREE.Mesh(laserBoxGeo, casingMat);
    laserBox.castShadow = true;
    laserGroup.add(laserBox);

    // Laser emitter optical aperture window
    const laserApertureGeo = new THREE.BoxGeometry(0.08, 0.02, 0.8);
    const laserApertureMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const aperture = new THREE.Mesh(laserApertureGeo, laserApertureMat);
    aperture.position.set(0, -0.08, 0);
    laserGroup.add(aperture);

    this.registerInteractive(laserGroup, 'laser_scanner');
    this.sensorGroup.add(laserGroup);

    // Dynamic Green Laser Fan Sheet
    const laserPlaneGeo = new THREE.PlaneGeometry(0.02, 1.2);
    const laserPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    this.laserBeamMesh = new THREE.Mesh(laserPlaneGeo, laserPlaneMat);
    this.laserBeamMesh.position.set(0.45, 2.2, 0);
    this.laserBeamMesh.scale.set(1, 1.0, 1.2);
    this.beamGroup.add(this.laserBeamMesh);

    // -------------------------------------------------------------
    // 4. LOAD CELL SENSORS (TENSION)
    // -------------------------------------------------------------
    const loadCellGroup = new THREE.Group();
    loadCellGroup.position.set(-6.0, 1.15, 0);
    loadCellGroup.name = 'load_cell';

    const loadCellBodyGeo = new THREE.BoxGeometry(0.24, 0.18, 0.14);
    const loadCellMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

    // Left Load Cell on Tail Take-Up Carriage
    const cellL = new THREE.Mesh(loadCellBodyGeo, loadCellMat);
    cellL.position.set(-0.3, -0.15, -0.85);
    cellL.castShadow = true;
    loadCellGroup.add(cellL);

    // Right Load Cell
    const cellR = new THREE.Mesh(loadCellBodyGeo, loadCellMat);
    cellR.position.set(-0.3, -0.15, 0.85);
    cellR.castShadow = true;
    loadCellGroup.add(cellR);

    // Strain relief cabling conduits
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6 });
    const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const cableL = new THREE.Mesh(cableGeo, cableMat);
    cableL.position.set(-0.3, 0.1, -0.85);
    loadCellGroup.add(cableL);

    this.registerInteractive(loadCellGroup, 'load_cell');
    this.sensorGroup.add(loadCellGroup);

    // -------------------------------------------------------------
    // 5. ULTRASONIC FLAW TRANSDUCERS
    // -------------------------------------------------------------
    const ultraGroup = new THREE.Group();
    ultraGroup.position.set(-0.45, 2.1, 0);
    ultraGroup.name = 'ultrasonic_transducer';

    // Probe mounting bar
    const probeBarGeo = new THREE.BoxGeometry(0.12, 0.08, 1.0);
    const probeBar = new THREE.Mesh(probeBarGeo, aluminumMat);
    probeBar.castShadow = true;
    ultraGroup.add(probeBar);

    // 4 Immersion Transducer Probes pointing down
    const probeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.16, 16);
    const probeMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7, roughness: 0.3 });
    for (let z = -0.36; z <= 0.36; z += 0.24) {
      const probe = new THREE.Mesh(probeGeo, probeMat);
      probe.position.set(0, -0.08, z);
      ultraGroup.add(probe);
    }

    this.registerInteractive(ultraGroup, 'ultrasonic_transducer');
    this.sensorGroup.add(ultraGroup);

    // Animated Pulsing Acoustic Wave Rings
    const ringGeo = new THREE.RingGeometry(0.08, 0.18, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.ultrasonicRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ultrasonicRingMesh.rotation.x = -Math.PI / 2;
    this.ultrasonicRingMesh.position.set(-0.45, 1.62, 0);
    this.beamGroup.add(this.ultrasonicRingMesh);

    // -------------------------------------------------------------
    // 6. STM32 / ESP32 DUAL DAQ CONTROLLER ENCLOSURE
    // -------------------------------------------------------------
    const daqGroup = new THREE.Group();
    daqGroup.position.set(1.0, 1.45, 1.0);
    daqGroup.name = 'esp32_stm32';

    // IP67 Industrial Junction Enclosure
    const daqBoxGeo = new THREE.BoxGeometry(0.35, 0.45, 0.18);
    const daqBoxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.2, roughness: 0.5 });
    const daqBox = new THREE.Mesh(daqBoxGeo, daqBoxMat);
    daqBox.castShadow = true;
    daqGroup.add(daqBox);

    // Transparent front door window
    const windowGeo = new THREE.PlaneGeometry(0.28, 0.36);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    });
    const daqWindow = new THREE.Mesh(windowGeo, windowMat);
    daqWindow.position.set(0, 0, 0.095);
    daqGroup.add(daqWindow);

    // Internal PCB representation
    const pcbGeo = new THREE.BoxGeometry(0.24, 0.32, 0.02);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x065f46 }); // Green solder mask
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    pcb.position.set(0, 0, 0.04);
    daqGroup.add(pcb);

    // Status Indicator LEDs (Blinking TX/RX)
    const daqLedGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const daqLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.daqLedMesh = new THREE.Mesh(daqLedGeo, daqLedMat);
    this.daqLedMesh.position.set(-0.06, 0.12, 0.1);
    daqGroup.add(this.daqLedMesh);

    this.registerInteractive(daqGroup, 'esp32_stm32');
    this.sensorGroup.add(daqGroup);

    // -------------------------------------------------------------
    // 7. RASPBERRY PI 4 EDGE COMPUTE UNIT
    // -------------------------------------------------------------
    const rpiGroup = new THREE.Group();
    rpiGroup.position.set(0.4, 1.45, 1.0);
    rpiGroup.name = 'raspberry_pi';

    // Finned Aluminum Heatsink Casing
    const rpiCaseGeo = new THREE.BoxGeometry(0.28, 0.32, 0.14);
    const rpiMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
    const rpiCase = new THREE.Mesh(rpiCaseGeo, rpiMat);
    rpiCase.castShadow = true;
    rpiGroup.add(rpiCase);

    // Heatsink cooling fins
    const finGeo = new THREE.BoxGeometry(0.015, 0.28, 0.12);
    for (let f = -0.1; f <= 0.1; f += 0.04) {
      const fin = new THREE.Mesh(finGeo, aluminumMat);
      fin.position.set(f, 0.02, 0.04);
      rpiGroup.add(fin);
    }

    // Ethernet RJ45 Connector port with cable
    const ethGeo = new THREE.BoxGeometry(0.06, 0.05, 0.05);
    const ethMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const ethPort = new THREE.Mesh(ethGeo, ethMat);
    ethPort.position.set(0.12, -0.1, 0);
    rpiGroup.add(ethPort);

    // External Antenna
    const antGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
    const antenna = new THREE.Mesh(antGeo, antMat);
    antenna.position.set(-0.1, 0.22, 0);
    rpiGroup.add(antenna);

    this.registerInteractive(rpiGroup, 'raspberry_pi');
    this.sensorGroup.add(rpiGroup);
  }

  // ==========================================
  // JOINT MARKERS (J01 to J24)
  // ==========================================
  private buildJointMarkers(): void {
    const jointWidth = 1.32;
    const jointLength = 0.16;

    for (let i = 1; i <= 24; i++) {
      const code = `J${i.toString().padStart(2, '0')}`;
      const jointGroup = new THREE.Group();
      jointGroup.name = `joint_${code}`;

      // Joint Vulcanized Splice Strip
      const stripGeo = new THREE.BoxGeometry(jointLength, 0.025, jointWidth);
      const isTarget = code === this.targetJointCode;
      const initialColor = isTarget ? 0x10b981 : 0x334155;

      const stripMat = new THREE.MeshStandardMaterial({
        color: initialColor,
        roughness: 0.6,
        metalness: 0.3,
        emissive: isTarget ? 0x064e3b : 0x000000,
        emissiveIntensity: 0.4,
      });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(0, 0.015, 0);
      jointGroup.add(strip);

      // Label Billboard disc
      const pinGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(0, 0.18, jointWidth / 2 + 0.12);
      jointGroup.add(pin);

      const flagGeo = new THREE.BoxGeometry(0.18, 0.12, 0.02);
      const flagMat = new THREE.MeshStandardMaterial({
        color: isTarget ? 0x059669 : 0x1e293b,
        metalness: 0.2,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0, 0.32, jointWidth / 2 + 0.12);
      jointGroup.add(flag);

      // Initial position along top run
      const fraction = (i - 1) / 24;
      const x = -5.8 + fraction * 11.6;
      jointGroup.position.set(x, 1.6, 0);

      this.registerInteractive(jointGroup, `joint_${code}`);
      this.jointGroup.add(jointGroup);
      this.jointMarkers.set(code, jointGroup);
    }
  }

  // ==========================================
  // RAYCASTING & INTERACTION REGISTRATION
  // ==========================================
  private registerInteractive(obj: THREE.Object3D, id: string): void {
    obj.userData = { id, isInteractive: true };
    this.interactiveObjects.push(obj);

    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material && 'emissive' in mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          this.originalEmissives.set(mesh, mat.emissive.getHex());
        }
      }
    });
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    // Pointer move for hover raycasting
    dom.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkHover();
    });

    // Click to select
    dom.addEventListener('click', (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

      if (intersects.length > 0) {
        let top: THREE.Object3D | null = intersects[0].object;
        while (top && !top.userData.isInteractive && top.parent && top.parent !== this.scene) {
          top = top.parent;
        }

        if (top && top.userData.id) {
          const id = top.userData.id as string;
          if (id.startsWith('joint_')) {
            const code = id.replace('joint_', '');
            this.onSelectJoint(code);
          } else if (SENSOR_REGISTRY[id]) {
            this.onSelectSensor(SENSOR_REGISTRY[id]);
          }
        }
      }
    });

    // Window / container resize
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    resizeObserver.observe(this.container);
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      let top: THREE.Object3D | null = intersects[0].object;
      while (top && !top.userData.isInteractive && top.parent && top.parent !== this.scene) {
        top = top.parent;
      }

      if (top !== this.hoveredObject) {
        this.clearHover();
        this.hoveredObject = top;
        this.renderer.domElement.style.cursor = 'pointer';

        // Apply emissive highlight
        if (top) {
          top.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material && 'emissive' in mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.emissive.setHex(0x38bdf8); // Sky blue glow
                mat.emissiveIntensity = 0.5;
              }
            }
          });

          const id = top.userData.id as string;
          if (id.startsWith('joint_')) {
            this.onHoverObject(`Splice Joint ${id.replace('joint_', '')}`);
          } else if (SENSOR_REGISTRY[id]) {
            this.onHoverObject(SENSOR_REGISTRY[id].name);
          }
        }
      }
    } else {
      if (this.hoveredObject) {
        this.clearHover();
        this.onHoverObject(null);
      }
    }
  }

  private clearHover(): void {
    if (this.hoveredObject) {
      this.hoveredObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material && 'emissive' in mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            const original = this.originalEmissives.get(mesh) ?? 0x000000;
            mat.emissive.setHex(original);
            mat.emissiveIntensity = original > 0 ? 0.3 : 0.0;
          }
        }
      });
      this.hoveredObject = null;
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  // ==========================================
  // VIEW PRESETS & SMOOTH CAMERA LERP
  // ==========================================
  public setViewPreset(preset: ViewPreset): void {
    const config = this.PRESETS[preset];
    if (config) {
      this.targetCamPos = new THREE.Vector3(...config.pos);
      this.targetControlsTarget = new THREE.Vector3(...config.target);
    }
  }

  public setToggles(toggles: SceneToggles): void {
    this.sensorGroup.visible = toggles.showSensors;
    this.beamGroup.visible = toggles.showBeams;
    this.jointGroup.visible = toggles.showJoints;
    this.productGroup.visible = toggles.showProducts;
  }

  public updateTelemetry(data: {
    beltSpeedMps?: number;
    speedFactor?: number;
    isPaused?: boolean;
    targetJointCode?: string;
    targetJointState?: string;
    targetJointHealth?: number;
  }): void {
    if (data.beltSpeedMps !== undefined) this.beltSpeedMps = data.beltSpeedMps;
    if (data.speedFactor !== undefined) this.speedFactor = data.speedFactor;
    if (data.isPaused !== undefined) this.isPaused = data.isPaused;
    if (data.targetJointCode !== undefined) this.targetJointCode = data.targetJointCode;
    if (data.targetJointState !== undefined) this.targetJointState = data.targetJointState;
    if (data.targetJointHealth !== undefined) this.targetJointHealth = data.targetJointHealth;

    // Update target joint material color in 3D scene
    const targetGroup = this.jointMarkers.get(this.targetJointCode);
    if (targetGroup) {
      let color = 0x10b981; // Healthy Green
      let emissive = 0x064e3b;

      if (this.targetJointState === 'WATCH' || (this.targetJointHealth < 80 && this.targetJointHealth >= 60)) {
        color = 0xf59e0b; // Amber Watch
        emissive = 0x78350f;
      } else if (
        this.targetJointState === 'MAINTENANCE_REQUIRED' ||
        this.targetJointState === 'CRITICAL' ||
        this.targetJointHealth < 60
      ) {
        color = 0xef4444; // Crimson Critical
        emissive = 0x7f1d1d;
      }

      targetGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material && 'color' in mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.color.setHex(color);
            if ('emissive' in mat) {
              mat.emissive.setHex(emissive);
              this.originalEmissives.set(mesh, emissive);
            }
          }
        }
      });
    }
  }

  // ==========================================
  // ANIMATION TICK LOOP
  // ==========================================
  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const effectiveSpeed = this.isPaused ? 0 : this.beltSpeedMps * (this.speedFactor > 60 ? 3.0 : 1.0);

    // 1. Conveyor Belt UV texture offset animation
    if (this.beltMaterial && this.beltMaterial.map) {
      this.beltMaterial.map.offset.x -= delta * (effectiveSpeed * 0.25);
    }

    // 2. Rollers rotation
    const rollerAngularSpeed = (effectiveSpeed / 0.08) * delta;
    for (const roller of this.rollers) {
      roller.rotation.y += rollerAngularSpeed;
    }

    // 3. Products moving along the top belt run
    for (const product of this.products) {
      if (!this.isPaused) {
        product.position.x += effectiveSpeed * 0.4 * delta;
        if (product.position.x > 5.5) {
          product.position.x = -5.5;
          product.position.z = (Math.random() - 0.5) * 0.8;
        }
      }
    }

    // 4. Splice joints moving with the belt loop
    for (let i = 1; i <= 24; i++) {
      const code = `J${i.toString().padStart(2, '0')}`;
      const group = this.jointMarkers.get(code);
      if (group && !this.isPaused) {
        group.position.x += effectiveSpeed * 0.4 * delta;
        if (group.position.x > 5.8) {
          group.position.x = -5.8;
        }
      }
    }

    // 5. Motor rotor & visual effects
    if (this.motorRotorMesh && !this.isPaused) {
      this.motorRotorMesh.rotation.x += delta * 15;
    }

    // 6. Laser scanner scanning oscillation
    if (this.laserBeamMesh) {
      const elapsed = this.clock.getElapsedTime();
      this.laserBeamMesh.position.x = 0.45 + Math.sin(elapsed * 4) * 0.05;
    }

    // 7. Ultrasonic acoustic pulse ring
    if (this.ultrasonicRingMesh) {
      const elapsed = this.clock.getElapsedTime();
      const pulse = (elapsed * 2.5) % 1.0;
      this.ultrasonicRingMesh.scale.set(1 + pulse * 2.0, 1 + pulse * 2.0, 1);
      (this.ultrasonicRingMesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - pulse);
    }

    // 8. Blinking DAQ & RPi LEDs
    if (this.daqLedMesh) {
      const elapsed = this.clock.getElapsedTime();
      (this.daqLedMesh.material as THREE.MeshBasicMaterial).color.setHex(
        Math.floor(elapsed * 5) % 2 === 0 ? 0x10b981 : 0x0284c7
      );
    }

    // 9. Camera smooth lerp transition
    if (this.targetCamPos && this.targetControlsTarget) {
      this.camera.position.lerp(this.targetCamPos, 0.06);
      this.controls.target.lerp(this.targetControlsTarget, 0.06);

      if (
        this.camera.position.distanceTo(this.targetCamPos) < 0.05 &&
        this.controls.target.distanceTo(this.targetControlsTarget) < 0.05
      ) {
        this.targetCamPos = null;
        this.targetControlsTarget = null;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize(): void {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ==========================================
  // DISPOSAL & CLEANUP
  // ==========================================
  public dispose(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.controls.dispose();
    this.renderer.dispose();

    // Dispose scene meshes and materials
    this.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
