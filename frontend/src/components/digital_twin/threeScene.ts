import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SENSOR_REGISTRY, SensorMetadata } from './sensorData';

export interface SceneOptions {
  container: HTMLDivElement;
  onSelectSensor: (sensor: SensorMetadata) => void;
  onSelectJoint: (jointCode: string) => void;
  onHoverObject: (name: string | null) => void;
}

export type ViewPreset = 'overview' | 'lidar' | 'rupture' | 'camera' | 'drive';

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
  private beltMaterial!: THREE.MeshStandardMaterial;
  private rollers: THREE.Mesh[] = [];
  private products: THREE.Mesh[] = [];
  private jointMarkers: Map<string, THREE.Group> = new Map();
  private jointPositions: Map<string, number> = new Map(); // Normalized loop distance [0, 1)
  private laserBeamMesh!: THREE.Mesh;
  private cameraFrustumMesh!: THREE.Mesh;
  private proximityRings: THREE.Mesh[] = [];
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
  private targetJointCode: string = 'J02';
  private targetJointState: string = 'HEALTHY';
  private targetJointHealth: number = 95.0;

  // Camera lerping for presets
  private targetCamPos: THREE.Vector3 | null = null;
  private targetControlsTarget: THREE.Vector3 | null = null;

  // View preset coordinates matching CAD layout
  private readonly PRESETS: Record<ViewPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
    overview: { pos: [0, 3.5, 14.5], target: [0, 1.2, 0] },
    lidar: { pos: [-3.6, 3.2, 3.2], target: [-4.0, 1.8, 0] },
    rupture: { pos: [0.5, 2.4, 3.8], target: [0.5, 1.4, 0] },
    camera: { pos: [5.8, 3.2, 3.0], target: [5.8, 1.9, 0] },
    drive: { pos: [6.8, 2.2, 3.0], target: [6.0, 1.5, 0] },
  };

  constructor(options: SceneOptions) {
    this.container = options.container;
    this.onSelectSensor = options.onSelectSensor;
    this.onSelectJoint = options.onSelectJoint;
    this.onHoverObject = options.onHoverObject;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Slate-900 industrial dark
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.022);

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
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 35;
    this.controls.target.set(...defaultView.target);

    // 5. Build Scene
    this.setupLighting();
    this.setupEnvironment();
    this.buildConveyorFrame();
    this.buildPulleysAndBelt();
    this.buildRollers();
    this.buildFeedChuteAndHopper();
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
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.75);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 40;
    const d = 14;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-8, 8, -6);
    this.scene.add(fillLight);

    const mastSpot = new THREE.SpotLight(0x38bdf8, 2.2, 12, Math.PI / 5, 0.3);
    mastSpot.position.set(5.9, 4.2, 0);
    mastSpot.target.position.set(6.0, 1.5, 0);
    this.scene.add(mastSpot);
    this.scene.add(mastSpot.target);
  }

  private setupEnvironment(): void {
    const grid = new THREE.GridHelper(26, 26, 0x334155, 0x1e293b);
    grid.position.y = -0.01;
    this.scene.add(grid);

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

    // Demarcation yellow boundary
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
      color: 0x475569, // Structural steel slate
      metalness: 0.65,
      roughness: 0.35,
    });
    const yellowAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Yellow hardware brackets
      metalness: 0.4,
      roughness: 0.4,
    });

    const length = 12.6; // From x = -6.3 to +6.3
    const width = 1.4;

    // Longitudinal main beams (Top carry channel)
    const beamGeo = new THREE.BoxGeometry(length, 0.16, 0.08);
    const topBeamL = new THREE.Mesh(beamGeo, steelMat);
    topBeamL.position.set(0, 1.42, -width / 2);
    topBeamL.castShadow = true;
    frameGroup.add(topBeamL);

    const topBeamR = new THREE.Mesh(beamGeo, steelMat);
    topBeamR.position.set(0, 1.42, width / 2);
    topBeamR.castShadow = true;
    frameGroup.add(topBeamR);

    // Lower longitudinal beams
    const lowerBeamL = new THREE.Mesh(beamGeo, steelMat);
    lowerBeamL.position.set(0, 0.62, -width / 2);
    frameGroup.add(lowerBeamL);

    const lowerBeamR = new THREE.Mesh(beamGeo, steelMat);
    lowerBeamR.position.set(0, 0.62, width / 2);
    frameGroup.add(lowerBeamR);

    // Vertical legs and cross members
    const legGeo = new THREE.BoxGeometry(0.12, 1.42, 0.12);
    const crossGeo = new THREE.BoxGeometry(0.08, 0.08, width);

    for (let x = -5.8; x <= 5.8; x += 1.93) {
      const legL = new THREE.Mesh(legGeo, steelMat);
      legL.position.set(x, 0.71, -width / 2);
      legL.castShadow = true;
      frameGroup.add(legL);

      const legR = new THREE.Mesh(legGeo, steelMat);
      legR.position.set(x, 0.71, width / 2);
      legR.castShadow = true;
      frameGroup.add(legR);

      // Base Foot plates
      const footGeo = new THREE.BoxGeometry(0.24, 0.04, 0.24);
      const footL = new THREE.Mesh(footGeo, steelMat);
      footL.position.set(x, 0.02, -width / 2);
      frameGroup.add(footL);

      const footR = new THREE.Mesh(footGeo, steelMat);
      footR.position.set(x, 0.02, width / 2);
      frameGroup.add(footR);

      // Cross ties
      const crossTop = new THREE.Mesh(crossGeo, steelMat);
      crossTop.position.set(x, 1.38, 0);
      frameGroup.add(crossTop);

      const crossMid = new THREE.Mesh(crossGeo, steelMat);
      crossMid.position.set(x, 0.62, 0);
      frameGroup.add(crossMid);

      // Yellow bracket accents matching CAD image
      const bracketGeo = new THREE.BoxGeometry(0.06, 0.14, 0.04);
      const bL = new THREE.Mesh(bracketGeo, yellowAccentMat);
      bL.position.set(x + 0.4, 1.42, -width / 2 - 0.05);
      frameGroup.add(bL);

      const bR = new THREE.Mesh(bracketGeo, yellowAccentMat);
      bR.position.set(x + 0.4, 1.42, width / 2 + 0.05);
      frameGroup.add(bR);
    }

    this.scene.add(frameGroup);
  }

  // ==========================================
  // PULLEYS & BELT
  // ==========================================
  private buildPulleysAndBelt(): void {
    const pulleyMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.8,
      roughness: 0.25,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.75,
      roughness: 0.3,
    });

    // 1. Tail Pulley at x = -6.0
    const tailPulleyGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.34, 32);
    const tailPulley = new THREE.Mesh(tailPulleyGeo, brassMat);
    tailPulley.rotation.x = Math.PI / 2;
    tailPulley.position.set(-6.0, 1.18, 0);
    tailPulley.castShadow = true;
    this.scene.add(tailPulley);

    // 2. Head Drive Pulley at x = +6.0
    const headPulleyGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.34, 32);
    const headPulley = new THREE.Mesh(headPulleyGeo, pulleyMat);
    headPulley.rotation.x = Math.PI / 2;
    headPulley.position.set(6.0, 1.18, 0);
    headPulley.castShadow = true;
    this.scene.add(headPulley);

    // 3. Continuous Industrial Conveyor Belt
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Rubber texture stripes
    ctx.fillStyle = '#0f172a';
    for (let y = 0; y < 512; y += 16) {
      ctx.fillRect(0, y, 512, 6);
    }
    const beltTexture = new THREE.CanvasTexture(canvas);
    beltTexture.wrapS = THREE.RepeatWrapping;
    beltTexture.wrapT = THREE.RepeatWrapping;
    beltTexture.repeat.set(12, 1);

    this.beltMaterial = new THREE.MeshStandardMaterial({
      map: beltTexture,
      roughness: 0.85,
      metalness: 0.15,
      bumpScale: 0.05,
    });

    // Top Run Belt
    const beltTopGeo = new THREE.BoxGeometry(12.0, 0.03, 1.3);
    const beltTop = new THREE.Mesh(beltTopGeo, this.beltMaterial);
    beltTop.position.set(0, 1.6, 0);
    beltTop.castShadow = true;
    beltTop.receiveShadow = true;
    this.scene.add(beltTop);

    // Bottom Return Belt
    const beltBottomGeo = new THREE.BoxGeometry(12.0, 0.03, 1.3);
    const beltBottom = new THREE.Mesh(beltBottomGeo, this.beltMaterial);
    beltBottom.position.set(0, 0.76, 0);
    beltBottom.castShadow = true;
    this.scene.add(beltBottom);

    // End curved wraps
    const wrapGeo = new THREE.CylinderGeometry(0.435, 0.435, 1.3, 32, 1, true, -Math.PI / 2, Math.PI);
    const tailWrap = new THREE.Mesh(wrapGeo, this.beltMaterial);
    tailWrap.rotation.x = Math.PI / 2;
    tailWrap.rotation.z = Math.PI / 2;
    tailWrap.position.set(-6.0, 1.18, 0);
    this.scene.add(tailWrap);

    const headWrap = new THREE.Mesh(wrapGeo, this.beltMaterial);
    headWrap.rotation.x = Math.PI / 2;
    headWrap.rotation.z = -Math.PI / 2;
    headWrap.position.set(6.0, 1.18, 0);
    this.scene.add(headWrap);
  }

  // ==========================================
  // IDLER ROLLERS
  // ==========================================
  private buildRollers(): void {
    const rollerMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.25,
    });

    // Top Carrying Idler sets
    const rollerGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.32, 16);
    for (let x = -5.0; x <= 5.0; x += 1.25) {
      const roller = new THREE.Mesh(rollerGeo, rollerMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(x, 1.54, 0);
      roller.castShadow = true;
      this.scene.add(roller);
      this.rollers.push(roller);
    }

    // Bottom Return Idlers
    for (let x = -4.2; x <= 4.2; x += 2.5) {
      const retRoller = new THREE.Mesh(rollerGeo, rollerMat);
      retRoller.rotation.x = Math.PI / 2;
      retRoller.position.set(x, 0.82, 0);
      retRoller.castShadow = true;
      this.scene.add(retRoller);
      this.rollers.push(retRoller);
    }
  }

  // ==========================================
  // LOADING CHUTE & HOPPER (GREEN HOOD FROM CAD)
  // ==========================================
  private buildFeedChuteAndHopper(): void {
    const chuteGroup = new THREE.Group();
    chuteGroup.position.set(-4.8, 1.6, 0);

    const greenChuteMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a29, // Industrial dark forest green matching diagram
      metalness: 0.4,
      roughness: 0.5,
    });

    // Sloped Feed Chute Hood
    const hoodGeo = new THREE.BoxGeometry(1.8, 0.65, 1.36);
    const hood = new THREE.Mesh(hoodGeo, greenChuteMat);
    hood.position.set(0, 0.38, 0);
    hood.rotation.z = -0.12; // Slight slope toward right direction
    hood.castShadow = true;
    chuteGroup.add(hood);

    // Feed Funnel Top Inlet
    const funnelGeo = new THREE.ConeGeometry(0.7, 0.6, 4, 1, true);
    const funnelMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      side: THREE.DoubleSide,
      metalness: 0.3,
      roughness: 0.6,
    });
    const funnel = new THREE.Mesh(funnelGeo, funnelMat);
    funnel.rotation.y = Math.PI / 4;
    funnel.position.set(-0.5, 0.9, 0);
    chuteGroup.add(funnel);

    // Rubber Skirtboards along belt edges
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const skirtGeo = new THREE.BoxGeometry(2.0, 0.15, 0.04);
    const skirtL = new THREE.Mesh(skirtGeo, skirtMat);
    skirtL.position.set(0, 0.08, -0.66);
    chuteGroup.add(skirtL);

    const skirtR = new THREE.Mesh(skirtGeo, skirtMat);
    skirtR.position.set(0, 0.08, 0.66);
    chuteGroup.add(skirtR);

    this.scene.add(chuteGroup);
  }

  // ==========================================
  // DRIVE MOTOR UNIT (RED MOTOR FROM CAD)
  // ==========================================
  private buildDriveMotorUnit(): void {
    const driveGroup = new THREE.Group();
    driveGroup.position.set(6.2, 1.18, 0);

    const redMotorMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Vibrant red industrial motor matching CAD diagram
      metalness: 0.6,
      roughness: 0.35,
    });
    const gearboxMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3,
    });

    // Gearbox Housing directly coupled to head shaft
    const gearBoxGeo = new THREE.BoxGeometry(0.65, 0.8, 0.55);
    const gearBox = new THREE.Mesh(gearBoxGeo, gearboxMat);
    gearBox.position.set(0.1, -0.1, 0.9);
    gearBox.castShadow = true;
    driveGroup.add(gearBox);

    // Cylindrical Motor Housing (Red)
    const motorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.75, 24);
    const motor = new THREE.Mesh(motorGeo, redMotorMat);
    motor.rotation.x = Math.PI / 2;
    motor.position.set(0.1, -0.1, 1.5);
    motor.castShadow = true;
    driveGroup.add(motor);

    // Motor Cooling Fan Shroud
    const shroudGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 24);
    const shroud = new THREE.Mesh(shroudGeo, gearboxMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0.1, -0.1, 1.95);
    driveGroup.add(shroud);

    this.scene.add(driveGroup);
  }

  // ==========================================
  // BULK CARGO PRODUCTS (ORE)
  // ==========================================
  private buildCargoProducts(): void {
    const oreColors = [0x57534e, 0x78716c, 0xa8a29e, 0x44403c];

    for (let i = 0; i < 24; i++) {
      const radius = 0.08 + Math.random() * 0.07;
      const oreGeo = new THREE.DodecahedronGeometry(radius, 1);
      const oreMat = new THREE.MeshStandardMaterial({
        color: oreColors[i % oreColors.length],
        roughness: 0.9,
        metalness: 0.2,
      });

      const ore = new THREE.Mesh(oreGeo, oreMat);
      const x = -5.0 + (i / 24) * 10.5;
      const z = (Math.random() - 0.5) * 0.75;
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
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const casingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 });

    // -------------------------------------------------------------
    // 1. TF-LUNA MICRO LIDAR (3D Profile Scanner at x = -3.8)
    // -------------------------------------------------------------
    const lidarGantry = new THREE.Group();
    lidarGantry.position.set(-3.8, 0, 0);

    // Gantry Arch Posts
    const postGeo = new THREE.BoxGeometry(0.1, 2.6, 0.1);
    const postL = new THREE.Mesh(postGeo, gantryMat);
    postL.position.set(0, 1.3, -0.9);
    postL.castShadow = true;
    lidarGantry.add(postL);

    const postR = new THREE.Mesh(postGeo, gantryMat);
    postR.position.set(0, 1.3, 0.9);
    postR.castShadow = true;
    lidarGantry.add(postR);

    // Cross beam
    const topBarGeo = new THREE.BoxGeometry(0.12, 0.1, 1.9);
    const topBar = new THREE.Mesh(topBarGeo, gantryMat);
    topBar.position.set(0, 2.6, 0);
    topBar.castShadow = true;
    lidarGantry.add(topBar);

    this.sensorGroup.add(lidarGantry);

    // TF-Luna Sensor Module Housing
    const lidarModuleGroup = new THREE.Group();
    lidarModuleGroup.position.set(-3.8, 2.5, 0);
    lidarModuleGroup.name = 'tf_luna_lidar';

    const lidarBodyGeo = new THREE.BoxGeometry(0.18, 0.14, 0.36);
    const lidarBody = new THREE.Mesh(lidarBodyGeo, casingMat);
    lidarBody.castShadow = true;
    lidarModuleGroup.add(lidarBody);

    // Dual ToF optical aperture lenses (Emitter + Receiver)
    const optGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16);
    const optMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Glowing green ToF optics
    const optL = new THREE.Mesh(optGeo, optMat);
    optL.position.set(0, -0.08, -0.08);
    lidarModuleGroup.add(optL);

    const optR = new THREE.Mesh(optGeo, optMat);
    optR.position.set(0, -0.08, 0.08);
    lidarModuleGroup.add(optR);

    this.registerInteractive(lidarModuleGroup, 'tf_luna_lidar');
    this.sensorGroup.add(lidarModuleGroup);

    // Dynamic 3D Laser Profile Scanning Fan
    const laserConeGeo = new THREE.ConeGeometry(0.7, 0.85, 4, 1, true);
    const laserConeMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this.laserBeamMesh = new THREE.Mesh(laserConeGeo, laserConeMat);
    this.laserBeamMesh.position.set(-3.8, 2.05, 0);
    this.laserBeamMesh.scale.set(1.6, 1.0, 0.05); // Thin sheet
    this.beamGroup.add(this.laserBeamMesh);

    // -------------------------------------------------------------
    // 2. TENSION LOAD CELL (Under Chute Take-Up Carriage at x = -4.8)
    // -------------------------------------------------------------
    const loadCellGroup = new THREE.Group();
    loadCellGroup.position.set(-4.8, 1.05, 0);
    loadCellGroup.name = 'load_cell';

    const cellBodyGeo = new THREE.BoxGeometry(0.22, 0.16, 0.12);
    const cellMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 }); // Amber metal

    const cellL = new THREE.Mesh(cellBodyGeo, cellMat);
    cellL.position.set(0, 0, -0.75);
    cellL.castShadow = true;
    loadCellGroup.add(cellL);

    const cellR = new THREE.Mesh(cellBodyGeo, cellMat);
    cellR.position.set(0, 0, 0.75);
    cellR.castShadow = true;
    loadCellGroup.add(cellR);

    // Yellow strain gauge cables
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6 });
    const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
    const cbL = new THREE.Mesh(cableGeo, cableMat);
    cbL.position.set(0, 0.18, -0.75);
    loadCellGroup.add(cbL);

    const cbR = new THREE.Mesh(cableGeo, cableMat);
    cbR.position.set(0, 0.18, 0.75);
    loadCellGroup.add(cbR);

    this.registerInteractive(loadCellGroup, 'load_cell');
    this.sensorGroup.add(loadCellGroup);

    // -------------------------------------------------------------
    // 3. INDUCTIVE PROXIMITY SENSOR ARRAY (3 STATIONS ALONG BED)
    // -------------------------------------------------------------
    const proximityGroup = new THREE.Group();
    proximityGroup.name = 'inductive_proxi';

    const proxiBracketMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Vibrant blue bracket matching diagram blue boxes
      metalness: 0.5,
      roughness: 0.4,
    });
    const proxiHeadMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      metalness: 0.9,
      roughness: 0.1,
    });

    const proxiXPositions = [-2.2, 0.4, 3.0]; // 3 strategic points along the bed
    for (const px of proxiXPositions) {
      const stationGroup = new THREE.Group();
      stationGroup.position.set(px, 1.42, 0);

      // Blue side clamp bracket
      const clampGeo = new THREE.BoxGeometry(0.18, 0.22, 1.44);
      const clamp = new THREE.Mesh(clampGeo, proxiBracketMat);
      clamp.castShadow = true;
      stationGroup.add(clamp);

      // 3 Cylindrical Inductive Proximity M18 heads pointing up toward belt underside
      for (let z = -0.4; z <= 0.4; z += 0.4) {
        const probeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.1, 16);
        const probe = new THREE.Mesh(probeGeo, proxiHeadMat);
        probe.position.set(0, 0.08, z);
        stationGroup.add(probe);
      }

      // Pulsing electromagnetic field ring
      const ringGeo = new THREE.RingGeometry(0.06, 0.16, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(0, 0.16, 0);
      this.beamGroup.add(ringMesh);
      this.proximityRings.push(ringMesh);

      proximityGroup.add(stationGroup);
    }

    this.registerInteractive(proximityGroup, 'inductive_proxi');
    this.sensorGroup.add(proximityGroup);

    // -------------------------------------------------------------
    // 4. MULTISPECTRAL CAMERA ON VERTICAL MAST (HEAD DISCHARGE AT x = 5.9)
    // -------------------------------------------------------------
    const mastGroup = new THREE.Group();
    mastGroup.position.set(5.9, 0, 0);

    // Tall vertical inspection mast post
    const mastPostGeo = new THREE.CylinderGeometry(0.06, 0.07, 3.6, 16);
    const mastPost = new THREE.Mesh(mastPostGeo, gantryMat);
    mastPost.position.set(0, 1.8, -0.8);
    mastPost.castShadow = true;
    mastGroup.add(mastPost);

    // Angled cantilever arm pointing over discharge head
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 12);
    const arm = new THREE.Mesh(armGeo, gantryMat);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(0, 3.5, -0.3);
    arm.castShadow = true;
    mastGroup.add(arm);

    this.sensorGroup.add(mastGroup);

    // Multispectral Camera Housing (Swiveled downwards at 45 deg)
    const camHousingGroup = new THREE.Group();
    camHousingGroup.position.set(5.9, 3.4, 0);
    camHousingGroup.rotation.z = -0.55; // Angled down towards discharge pulley
    camHousingGroup.name = 'multispectral_camera';

    const camBoxGeo = new THREE.BoxGeometry(0.24, 0.22, 0.32);
    const camBox = new THREE.Mesh(camBoxGeo, casingMat);
    camBox.castShadow = true;
    camHousingGroup.add(camBox);

    // Dual multispectral lenses (Visible RGB + NIR)
    const camLensGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.1, 16);
    const camLensMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 });
    const lensRGB = new THREE.Mesh(camLensGeo, camLensMat);
    lensRGB.position.set(0, -0.12, -0.07);
    camHousingGroup.add(lensRGB);

    const lensNIR = new THREE.Mesh(camLensGeo, camLensMat);
    lensNIR.position.set(0, -0.12, 0.07);
    camHousingGroup.add(lensNIR);

    // Strobe Ring
    const strobeGeo = new THREE.TorusGeometry(0.07, 0.012, 8, 20);
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const strobeL = new THREE.Mesh(strobeGeo, strobeMat);
    strobeL.rotation.x = Math.PI / 2;
    strobeL.position.set(0, -0.15, -0.07);
    camHousingGroup.add(strobeL);

    // 30 FPS Status Blinking LED
    const camLedGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const camLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.rpiLedMesh = new THREE.Mesh(camLedGeo, camLedMat);
    this.rpiLedMesh.position.set(0.12, 0.06, 0);
    camHousingGroup.add(this.rpiLedMesh);

    this.registerInteractive(camHousingGroup, 'multispectral_camera');
    this.sensorGroup.add(camHousingGroup);

    // Multispectral Translucent Vision Inspection Frustum
    const frustumGeo = new THREE.ConeGeometry(0.95, 1.8, 4, 1, true);
    const frustumMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    this.cameraFrustumMesh = new THREE.Mesh(frustumGeo, frustumMat);
    this.cameraFrustumMesh.position.set(5.95, 2.5, 0);
    this.cameraFrustumMesh.rotation.z = -0.55;
    this.cameraFrustumMesh.rotation.y = Math.PI / 4;
    this.beamGroup.add(this.cameraFrustumMesh);

    // -------------------------------------------------------------
    // 5. STM32 / ESP32 DAQ & RPi EDGE NODE JUNCTION
    // -------------------------------------------------------------
    const edgeJunction = new THREE.Group();
    edgeJunction.position.set(0.8, 1.45, 0.95);

    // STM32 IP67 Box
    const daqGroup = new THREE.Group();
    daqGroup.name = 'esp32_stm32';
    const daqBoxGeo = new THREE.BoxGeometry(0.32, 0.42, 0.16);
    const daqBoxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const daqBox = new THREE.Mesh(daqBoxGeo, daqBoxMat);
    daqBox.castShadow = true;
    daqGroup.add(daqBox);

    const daqLedGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const daqLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    this.daqLedMesh = new THREE.Mesh(daqLedGeo, daqLedMat);
    this.daqLedMesh.position.set(-0.06, 0.12, 0.09);
    daqGroup.add(this.daqLedMesh);

    this.registerInteractive(daqGroup, 'esp32_stm32');
    edgeJunction.add(daqGroup);

    // RPi 4 Edge Unit
    const rpiGroup = new THREE.Group();
    rpiGroup.position.set(-0.45, 0, 0);
    rpiGroup.name = 'raspberry_pi';

    const rpiCaseGeo = new THREE.BoxGeometry(0.26, 0.3, 0.12);
    const rpiMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3 });
    const rpiCase = new THREE.Mesh(rpiCaseGeo, rpiMat);
    rpiCase.castShadow = true;
    rpiGroup.add(rpiCase);

    this.registerInteractive(rpiGroup, 'raspberry_pi');
    edgeJunction.add(rpiGroup);

    this.sensorGroup.add(edgeJunction);
  }

  // ==========================================
  // 4 SPLICE JOINT MARKERS (J01, J02, J03, J04)
  // ==========================================
  private buildJointMarkers(): void {
    const jointWidth = 1.32;
    const jointLength = 0.22;

    const jointCodes = ['J01', 'J02', 'J03', 'J04'];

    jointCodes.forEach((code, idx) => {
      const jointGroup = new THREE.Group();
      jointGroup.name = `joint_${code}`;

      const isTarget = code === this.targetJointCode;
      const initialColor = isTarget ? 0x10b981 : 0x475569;

      // Splice vulcanized rubber band
      const stripGeo = new THREE.BoxGeometry(jointLength, 0.035, jointWidth);
      const stripMat = new THREE.MeshStandardMaterial({
        color: initialColor,
        roughness: 0.5,
        metalness: 0.3,
        emissive: isTarget ? 0x064e3b : 0x000000,
        emissiveIntensity: 0.4,
      });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(0, 0.02, 0);
      jointGroup.add(strip);

      // Label Pin Mast
      const pinGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(0, 0.2, jointWidth / 2 + 0.12);
      jointGroup.add(pin);

      // Identification Tag Billboard
      const flagGeo = new THREE.BoxGeometry(0.22, 0.14, 0.02);
      const flagMat = new THREE.MeshStandardMaterial({
        color: isTarget ? 0x059669 : 0x1e293b,
        metalness: 0.2,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0, 0.36, jointWidth / 2 + 0.12);
      jointGroup.add(flag);

      // Initial position spaced evenly at 1/4 offsets [0, 0.25, 0.5, 0.75]
      const initialFrac = idx / 4.0;
      this.jointPositions.set(code, initialFrac);

      const initialX = -5.5 + initialFrac * 11.0;
      jointGroup.position.set(initialX, 1.6, 0);

      this.registerInteractive(jointGroup, `joint_${code}`);
      this.jointGroup.add(jointGroup);
      this.jointMarkers.set(code, jointGroup);
    });
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

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkHover();
    });

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

        if (top) {
          top.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material && 'emissive' in mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.emissive.setHex(0x38bdf8);
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
  // VIEW PRESETS & CAMERA TRANSITIONS
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
  // ANIMATION LOOP
  // ==========================================
  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const effectiveSpeed = this.isPaused ? 0 : this.beltSpeedMps * (this.speedFactor > 60 ? 3.0 : 1.0);

    // 1. Conveyor Belt UV animation
    if (this.beltMaterial && this.beltMaterial.map) {
      this.beltMaterial.map.offset.x -= delta * (effectiveSpeed * 0.25);
    }

    // 2. Rollers rotation
    const rollerAngularSpeed = (effectiveSpeed / 0.08) * delta;
    for (const roller of this.rollers) {
      roller.rotation.y += rollerAngularSpeed;
    }

    // 3. Products moving along top belt run (left to right ->)
    for (const product of this.products) {
      if (!this.isPaused) {
        product.position.x += effectiveSpeed * 0.4 * delta;
        if (product.position.x > 5.5) {
          product.position.x = -5.0;
          product.position.z = (Math.random() - 0.5) * 0.75;
        }
      }
    }

    // 4. Exactly 3 Splice joints moving along the conveyor loop
    const jointCodes = ['J01', 'J02', 'J03'];
    for (const code of jointCodes) {
      const group = this.jointMarkers.get(code);
      if (group && !this.isPaused) {
        let pos = (this.jointPositions.get(code) ?? 0) + (effectiveSpeed * 0.035 * delta);
        if (pos >= 1.0) pos -= 1.0;
        this.jointPositions.set(code, pos);

        // Map normalized loop pos [0, 1) to physical path (top run left-to-right, return run right-to-left)
        if (pos < 0.5) {
          // Top carry run: x from -5.8 to +5.8, y = 1.6
          const t = pos / 0.5;
          group.position.set(-5.8 + t * 11.6, 1.6, 0);
          group.rotation.z = 0;
        } else {
          // Return run: x from +5.8 to -5.8, y = 0.76
          const t = (pos - 0.5) / 0.5;
          group.position.set(5.8 - t * 11.6, 0.76, 0);
          group.rotation.z = Math.PI;
        }
      }
    }

    // 5. TF-Luna LiDAR scan oscillation
    if (this.laserBeamMesh) {
      const elapsed = this.clock.getElapsedTime();
      this.laserBeamMesh.position.x = -3.8 + Math.sin(elapsed * 6) * 0.04;
    }

    // 6. Proximity Sensor array pulses
    const elapsed = this.clock.getElapsedTime();
    const pulse = (elapsed * 3.0) % 1.0;
    for (const ring of this.proximityRings) {
      ring.scale.set(1 + pulse * 1.8, 1 + pulse * 1.8, 1);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - pulse);
    }

    // 7. Blinking DAQ & RPi LEDs
    if (this.daqLedMesh) {
      (this.daqLedMesh.material as THREE.MeshBasicMaterial).color.setHex(
        Math.floor(elapsed * 5) % 2 === 0 ? 0x10b981 : 0x0284c7
      );
    }

    // 8. Camera smooth lerp transition
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
