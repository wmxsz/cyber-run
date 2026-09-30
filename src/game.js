import SoundEngine from './audio.js';
import { createGridTexture, createBuildingTexture, createHazardTexture, createWarningSignTexture } from './textures.js';

/* ==========================================================================
     2. GLOBAL VARIABLES & CONSTANTS
     ========================================================================== */
  const LANES = [-4.0, 0.0, 4.0]; // 3개의 차선 X 좌표
  let currentLane = 1; // 기본 중앙 레인 (0: 좌, 1: 중, 2: 우)
  let targetX = LANES[currentLane];

  let scene, camera, renderer;
  let player, playerGroup, playerThrusterLight;
  let speedLines, trackGrid;
  const buildings = [];
  const obstacles = [];
  const pickups = [];
  const particles = [];

  // 게임 상태 변수
  let isGameActive = false;
  let isGameOver = false;
  let score = 0;
  let distance = 0;
  let coresCollected = 0;
  let speed = 1.2; // 기본 이동 속도
  let baseSpeed = 1.2;
  let maxSpeed = 3.2;
  let hp = 3;
  let maxHp = 3;
  let hasShield = false;
  let shieldMesh = null;
  let isInvincible = false;
  let invincibilityTimer = 0;
  let highScore = localStorage.getItem('neon_runner_highscore') || 0;

  // 플레이어 물리 (점프 & 슬라이드)
  let isJumping = false;
  let jumpVelocity = 0;
  const GRAVITY = 0.018;
  const JUMP_FORCE = 0.38;

  // 카메라 셰이크
  let cameraShake = 0;

  // 오디오 인스턴스
  const sound = new SoundEngine();

  

/* ==========================================================================
     4. THREE.JS 3D SCENE SETUP
     ========================================================================== */
  function initThree() {
    const container = document.getElementById('webgl-container');

    // 씬 & 안개 (짙은 사이버펑크 네온 대기감)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060414);
    scene.fog = new THREE.FogExp2(0x060414, 0.015);

    // 카메라
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4.5, 7.5);
    camera.lookAt(0, 1.5, -10);

    // 렌더러
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 부드러운 조명 시스템
    const ambientLight = new THREE.AmbientLight(0x3a1d5a, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 1.5);
    dirLight1.position.set(20, 40, 20);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff0077, 1.2);
    dirLight2.position.set(-20, 30, -30);
    scene.add(dirLight2);

    // 트랙 및 도로 생성
    buildTrack();

    // 배경 사이버펑크 도시 스카이라인 생성
    buildCity();

    // 플레이어 사이버 호버카 생성
    buildPlayer();

    // 스타스트림 스피드라인 파티클 생성
    buildSpeedLines();

    // 거대한 원경 사이버 썬 & 링
    buildSunAndRing();

    // 리사이즈 이벤트
    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  

/* ==========================================================================
     5. GEOMETRY BUILDERS (트랙, 도시, 플레이어, 환경)
     ========================================================================== */
  function buildTrack() {
    const trackWidth = 14;
    const trackLength = 500;

    const gridTex = createGridTexture();
    const trackGeo = new THREE.PlaneGeometry(trackWidth, trackLength);
    const trackMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.2,
      metalness: 0.8,
    });

    trackGrid = new THREE.Mesh(trackGeo, trackMat);
    trackGrid.rotation.x = -Math.PI / 2;
    trackGrid.position.set(0, 0, -trackLength / 2 + 10);
    trackGrid.receiveShadow = true;
    scene.add(trackGrid);

    // 네온 가드레일 (좌우 발광 빔)
    const railGeo = new THREE.CylinderGeometry(0.2, 0.2, trackLength, 8);
    const leftRailMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const rightRailMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });

    const leftRail = new THREE.Mesh(railGeo, leftRailMat);
    leftRail.rotation.x = Math.PI / 2;
    leftRail.position.set(-trackWidth / 2, 0.3, -trackLength / 2 + 10);
    scene.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, rightRailMat);
    rightRail.rotation.x = Math.PI / 2;
    rightRail.position.set(trackWidth / 2, 0.3, -trackLength / 2 + 10);
    scene.add(rightRail);
  }

  function buildCity() {
    const buildingTex = createBuildingTexture();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    // 도로 양쪽에 80여 개의 초고층 빌딩 절차적 배치
    for (let i = 0; i < 70; i++) {
      const isLeft = Math.random() > 0.5;
      const xDist = 12 + Math.random() * 35;
      const x = isLeft ? -xDist : xDist;
      const z = - (Math.random() * 480);
      const width = 8 + Math.random() * 12;
      const depth = 8 + Math.random() * 12;
      const height = 25 + Math.random() * 70;

      const mat = new THREE.MeshStandardMaterial({
        map: buildingTex,
        roughness: 0.3,
        metalness: 0.7,
      });

      const bldg = new THREE.Mesh(boxGeo, mat);
      bldg.scale.set(width, height, depth);
      bldg.position.set(x, height / 2, z);
      bldg.castShadow = true;
      bldg.receiveShadow = true;
      scene.add(bldg);

      // 옥상 네온 안테나 스파이어
      if (Math.random() > 0.4) {
        const spireGeo = new THREE.CylinderGeometry(0.1, 0.6, 12, 4);
        const spireMat = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0x00f0ff : 0xff0077
        });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.set(x, height + 6, z);
        scene.add(spire);
        buildings.push(spire);
      }

      buildings.push(bldg);
    }
  }

  function buildSunAndRing() {
    // 배경 거대 네온 썬
    const sunGeo = new THREE.CircleGeometry(45, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      fog: false
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 30, -320);
    scene.add(sun);

    // 수평선 레트로 네온 그리드 링
    const torusGeo = new THREE.TorusGeometry(55, 1.2, 16, 64);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      fog: false
    });
    const ring = new THREE.Mesh(torusGeo, torusMat);
    ring.position.set(0, 30, -315);
    ring.rotation.x = Math.PI / 4;
    scene.add(ring);
  }

  function buildPlayer() {
    playerGroup = new THREE.Group();

    // 메인 차체 (날렵한 미래형 스피더 보디)
    const bodyGeo = new THREE.ConeGeometry(1.1, 3.2, 5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x121528,
      metalness: 0.9,
      roughness: 0.2,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = -Math.PI / 2;
    body.rotation.y = Math.PI;
    body.position.set(0, 0.5, 0);
    body.castShadow = true;
    playerGroup.add(body);

    // 날개 핀 (Wings)
    const wingGeo = new THREE.BoxGeometry(3.2, 0.1, 1.2);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c16,
      metalness: 0.8,
      roughness: 0.3
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, 0.45, 0.4);
    playerGroup.add(wings);

    // 네온 사이언 엑센트 트림
    const trimGeo = new THREE.BoxGeometry(0.1, 0.15, 2.6);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const leftTrim = new THREE.Mesh(trimGeo, trimMat);
    leftTrim.position.set(-0.7, 0.5, 0);
    playerGroup.add(leftTrim);

    const rightTrim = new THREE.Mesh(trimGeo, trimMat);
    rightTrim.position.set(0.7, 0.5, 0);
    playerGroup.add(rightTrim);

    // 조종석 콕핏 캐노피 (네온 마젠타 글래스)
    const glassGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xff0077,
      emissive: 0xff0077,
      emissiveIntensity: 0.7,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.85
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.scale.set(0.9, 0.6, 1.6);
    glass.position.set(0, 0.75, -0.2);
    playerGroup.add(glass);

    // 제트 엔진 노즐 & 발광 펄스
    const engineGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.5, 8);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    const leftEngine = new THREE.Mesh(engineGeo, engineMat);
    leftEngine.rotation.x = Math.PI / 2;
    leftEngine.position.set(-0.55, 0.45, 1.4);
    playerGroup.add(leftEngine);

    const rightEngine = new THREE.Mesh(engineGeo, engineMat);
    rightEngine.rotation.x = Math.PI / 2;
    rightEngine.position.set(0.55, 0.45, 1.4);
    playerGroup.add(rightEngine);

    // 차량 하부 포인트 라이트
    playerThrusterLight = new THREE.PointLight(0x00f0ff, 2, 8);
    playerThrusterLight.position.set(0, 0.5, 2.0);
    playerGroup.add(playerThrusterLight);

    // 네온 에너지 쉴드 (획득 시 활성화)
    const shieldGeo = new THREE.SphereGeometry(2.0, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 0.6, 0);
    shieldMesh.visible = false;
    playerGroup.add(shieldMesh);

    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);
    player = playerGroup;
  }

  function buildSpeedLines() {
    const lineCount = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(lineCount * 6);
    const colors = new Float32Array(lineCount * 6);

    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = Math.random() * 25 + 0.5;
      const z = -Math.random() * 400;
      const len = 4 + Math.random() * 8;

      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;

      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + len;

      const isCyan = Math.random() > 0.5;
      for (let j = 0; j < 2; j++) {
        colors[i * 6 + j * 3] = isCyan ? 0.0 : 1.0;
        colors[i * 6 + j * 3 + 1] = isCyan ? 0.94 : 0.0;
        colors[i * 6 + j * 3 + 2] = isCyan ? 1.0 : 0.47;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4
    });

    speedLines = new THREE.LineSegments(geometry, material);
    scene.add(speedLines);
  }

  

/* ==========================================================================
     6. PROCEDURAL SPAWNING (장애물, 픽업 아이템)
     ========================================================================== */
  let spawnDistanceTimer = 0;

  function spawnObstacle() {
    const laneIndex = Math.floor(Math.random() * 3);
    const spawnX = LANES[laneIndex];
    const spawnZ = -320 - Math.random() * 40;

    const typeRand = Math.random();
    let obs;

    if (typeRand < 0.38) {
      // 1. 고휘도 네온 레이저 장벽 (High-Visibility Laser Barrier)
      obs = new THREE.Group();
      obs.userData = { type: 'barrier', hitRadius: 1.5, hitHeight: 2.3 };

      // 눈에 확 띄는 네온 옐로우/오렌지 파일런
      const poleGeo = new THREE.CylinderGeometry(0.25, 0.25, 3.6, 8);
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xff6600,
        emissiveIntensity: 0.6,
        roughness: 0.2
      });

      const leftPole = new THREE.Mesh(poleGeo, poleMat);
      leftPole.position.set(-1.5, 1.8, 0);
      obs.add(leftPole);

      const rightPole = new THREE.Mesh(poleGeo, poleMat);
      rightPole.position.set(1.5, 1.8, 0);
      obs.add(rightPole);

      // 기둥 상단 깜빡이는 적색 경고등
      const beaconGeo = new THREE.SphereGeometry(0.25, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

      const leftBeacon = new THREE.Mesh(beaconGeo, beaconMat);
      leftBeacon.position.set(-1.5, 3.7, 0);
      obs.add(leftBeacon);

      const rightBeacon = new THREE.Mesh(beaconGeo, beaconMat);
      rightBeacon.position.set(1.5, 3.7, 0);
      obs.add(rightBeacon);

      // 외부 핫핑크 발광 레이저 빔
      const beamGeo = new THREE.BoxGeometry(3.1, 0.5, 0.5);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 1.3, 0);
      obs.add(beam);

      // 내부 순백색 고광도 코어 (시인성 극대화)
      const coreBeamGeo = new THREE.BoxGeometry(3.05, 0.16, 0.16);
      const coreBeamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreBeam = new THREE.Mesh(coreBeamGeo, coreBeamMat);
      coreBeam.position.set(0, 1.3, 0);
      obs.add(coreBeam);

      // 도로 바닥 붉은색 경고 프로젝션 라인 (멀리서도 레인 즉시 인지)
      const warningDecalGeo = new THREE.PlaneGeometry(3.2, 5.0);
      const warningDecalMat = new THREE.MeshBasicMaterial({
        color: 0xff0044,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
      });
      const warningDecal = new THREE.Mesh(warningDecalGeo, warningDecalMat);
      warningDecal.rotation.x = -Math.PI / 2;
      warningDecal.position.set(0, 0.05, 0);
      obs.add(warningDecal);

      // 레이저 발광 포인트 라이트
      const obsLight = new THREE.PointLight(0xff0055, 2.5, 12);
      obsLight.position.set(0, 1.5, 0);
      obs.add(obsLight);

      obs.position.set(spawnX, 0, spawnZ);

    } else if (typeRand < 0.72) {
      // 2. 플라즈마 스파이크 마인 (Luminous Spike Mine)
      obs = new THREE.Group();
      obs.userData = { type: 'mine', hitRadius: 1.4, hitHeight: 2.2, rotSpeed: 0.06 };

      // 중심 고휘도 오렌지/레드 플라즈마 코어
      const coreGeo = new THREE.SphereGeometry(0.85, 12, 12);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff5500,
        emissiveIntensity: 1.2,
        roughness: 0.2
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(0, 1.4, 0);
      obs.add(core);

      // 회전하는 8방향 네온 옐로우 스파이크 뿔
      const spikeGeo = new THREE.ConeGeometry(0.24, 1.1, 6);
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

      const angles = [
        [0, 0, 0], [0, Math.PI, 0], [0, Math.PI / 2, 0], [0, -Math.PI / 2, 0],
        [Math.PI / 2, 0, 0], [-Math.PI / 2, 0, 0], [Math.PI / 4, Math.PI / 4, 0], [-Math.PI / 4, -Math.PI / 4, 0]
      ];
      angles.forEach(([rx, ry, rz]) => {
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.rotation.set(rx, ry, rz);
        spike.position.set(0, 1.4, 0);
        spike.translateY(0.85);
        obs.add(spike);
      });

      // 외곽 네온 펄스 링
      const ringGeo = new THREE.TorusGeometry(1.65, 0.08, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 1.4, 0);
      obs.add(ring);

      // 바닥 붉은색 경고 서클
      const decalGeo = new THREE.CircleGeometry(1.6, 16);
      const decalMat = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
      });
      const decal = new THREE.Mesh(decalGeo, decalMat);
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(0, 0.05, 0);
      obs.add(decal);

      // 마인 자체 발광 포인트 라이트
      const mineLight = new THREE.PointLight(0xff4400, 2.5, 10);
      mineLight.position.set(0, 1.4, 0);
      obs.add(mineLight);

      obs.position.set(spawnX, 0, spawnZ);

    } else {
      // 3. 네온 해저드 블록 (High-Vis Cyber Hazard Block)
      obs = new THREE.Group();
      obs.userData = { type: 'block', hitRadius: 1.6, hitHeight: 3.2 };

      // 선명한 네온 옐로우 & 블랙 사선 스트라이프 바디
      const blockGeo = new THREE.BoxGeometry(2.7, 3.2, 1.8);
      const hazardTex = createHazardTexture();
      const blockMat = new THREE.MeshStandardMaterial({
        map: hazardTex,
        roughness: 0.2,
        metalness: 0.4,
        emissive: 0x553300,
        emissiveIntensity: 0.6
      });
      const blockMesh = new THREE.Mesh(blockGeo, blockMat);
      blockMesh.position.set(0, 1.6, 0);
      obs.add(blockMesh);

      // 눈부신 네온 옐로우 와이어프레임 외곽선
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(blockGeo),
        new THREE.LineBasicMaterial({ color: 0xffea00, linewidth: 3 })
      );
      wire.position.set(0, 1.6, 0);
      obs.add(wire);

      // 전면 ⚠️ 경고 홀로그램 표지판 패널
      const signGeo = new THREE.PlaneGeometry(1.9, 1.9);
      const signMat = new THREE.MeshBasicMaterial({
        map: createWarningSignTexture(),
        transparent: true
      });
      const frontSign = new THREE.Mesh(signGeo, signMat);
      frontSign.position.set(0, 1.6, 0.95);
      obs.add(frontSign);

      // 상단 회전/점멸 사이렌 비콘
      const sirenGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.4, 8);
      const sirenMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
      const siren = new THREE.Mesh(sirenGeo, sirenMat);
      siren.position.set(0, 3.4, 0);
      obs.add(siren);

      // 바닥 경고 프로젝션 프레임
      const floorLineGeo = new THREE.PlaneGeometry(3.1, 3.0);
      const floorLineMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.4,
        depthWrite: false
      });
      const floorLine = new THREE.Mesh(floorLineGeo, floorLineMat);
      floorLine.rotation.x = -Math.PI / 2;
      floorLine.position.set(0, 0.05, 0);
      obs.add(floorLine);

      // 경고등 포인트 라이트
      const blockLight = new THREE.PointLight(0xff8800, 2.5, 12);
      blockLight.position.set(0, 2.2, 0);
      obs.add(blockLight);

      obs.position.set(spawnX, 0, spawnZ);
    }

    scene.add(obs);
    obstacles.push(obs);
  }

  function spawnPickup() {
    const laneIndex = Math.floor(Math.random() * 3);
    const spawnX = LANES[laneIndex];
    const spawnZ = -300 - Math.random() * 50;

    const isShield = Math.random() < 0.18; // 18% 확률로 쉴드 파워업
    let pickup;

    if (isShield) {
      // 쉴드 파워업 오브
      const geo = new THREE.DodecahedronGeometry(0.8, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        wireframe: true
      });
      pickup = new THREE.Mesh(geo, mat);
      pickup.userData = { type: 'shield', hitRadius: 1.5 };
      pickup.position.set(spawnX, 1.4, spawnZ);
    } else {
      // 데이터 코어 (점수 아이템)
      const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.9,
        roughness: 0.1,
        metalness: 0.9
      });
      pickup = new THREE.Mesh(geo, mat);
      pickup.userData = { type: 'core', hitRadius: 1.4 };
      pickup.position.set(spawnX, 1.2, spawnZ);
    }

    scene.add(pickup);
    pickups.push(pickup);
  }

  

/* ==========================================================================
     7. PARTICLE FX ENGINE (폭발, 수집 스파크, 엔진 제트)
     ========================================================================== */
  function createExplosion(x, y, z, colorHex = 0xff0077, count = 35) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const p = new THREE.Mesh(geo, mat);

      p.position.set(x, y, z);
      p.userData = {
        velX: (Math.random() - 0.5) * 0.45,
        velY: Math.random() * 0.4 + 0.1,
        velZ: (Math.random() - 0.5) * 0.45,
        life: 1.0,
        decay: 0.025 + Math.random() * 0.02
      };

      scene.add(p);
      particles.push(p);
    }
  }

  function createThrusterSpark(x, y, z) {
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const p = new THREE.Mesh(geo, mat);

    p.position.set(x + (Math.random() - 0.5) * 0.4, y, z + 1.2);
    p.userData = {
      velX: (Math.random() - 0.5) * 0.05,
      velY: (Math.random() - 0.5) * 0.05,
      velZ: speed * 0.8 + Math.random() * 0.2,
      life: 0.7,
      decay: 0.05
    };

    scene.add(p);
    particles.push(p);
  }

  

/* ==========================================================================
     8. CONTROLS & INPUT SYSTEM (키보드, 마우스, 모바일 터치)
     ========================================================================== */
  function setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (!isGameActive || isGameOver) return;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        moveLane(-1);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        moveLane(1);
      } else if ((e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') && !isJumping) {
        jump();
      }
    });

    // 마우스 패닝 시각 반응
    window.addEventListener('mousemove', (e) => {
      if (!isGameActive || isGameOver) return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, normX * 1.5, 0.05);
    });

    // 모바일 터치 이벤트
    document.getElementById('btn-left').addEventListener('touchstart', (e) => {
      e.preventDefault();
      moveLane(-1);
    }, { passive: false });

    document.getElementById('btn-right').addEventListener('touchstart', (e) => {
      e.preventDefault();
      moveLane(1);
    }, { passive: false });

    document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!isJumping) jump();
    }, { passive: false });

    // 스와이프 제스처 지원
    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    window.addEventListener('touchend', (e) => {
      if (!isGameActive || isGameOver) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx > 0) moveLane(1);
        else moveLane(-1);
      } else if (dy < -40 && !isJumping) {
        jump();
      }
    });

    // 오디오 토글
    document.getElementById('btn-audio').addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
    });

    // UI 버튼
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-restart').addEventListener('click', restartGame);
  }

  function moveLane(dir) {
    const nextLane = currentLane + dir;
    if (nextLane >= 0 && nextLane <= 2) {
      currentLane = nextLane;
      targetX = LANES[currentLane];
    }
  }

  function jump() {
    isJumping = true;
    jumpVelocity = JUMP_FORCE;
    sound.playJump();
  }

  

/* ==========================================================================
     9. GAME LOGIC & COLLISION DETECTION
     ========================================================================== */
  function startGame() {
    sound.init();
    sound.startBGM();

    document.getElementById('start-modal').classList.add('hidden');
    isGameActive = true;
    isGameOver = false;

    score = 0;
    distance = 0;
    coresCollected = 0;
    speed = baseSpeed;
    hp = maxHp;
    hasShield = false;
    currentLane = 1;
    targetX = LANES[currentLane];
    player.position.set(0, 0, 0);

    updateHpUI();
    document.getElementById('hud-highscore').textContent = String(Math.floor(highScore)).padStart(5, '0');
  }

  function restartGame() {
    // 기존 스폰된 오브젝트 정리
    for (const obs of obstacles) scene.remove(obs);
    for (const p of pickups) scene.remove(p);
    for (const part of particles) scene.remove(part);
    obstacles.length = 0;
    pickups.length = 0;
    particles.length = 0;

    document.getElementById('gameover-modal').classList.add('hidden');
    startGame();
  }

  function triggerGameOver() {
    isGameOver = true;
    isGameActive = false;
    sound.stopBGM();
    sound.playGameOver();

    // 통계 기록
    const isNewRecord = score > highScore;
    if (isNewRecord) {
      highScore = score;
      localStorage.setItem('neon_runner_highscore', highScore);
    }

    document.getElementById('go-score').textContent = Math.floor(score);
    document.getElementById('go-distance').textContent = `${Math.floor(distance)}m`;
    document.getElementById('go-cores').textContent = coresCollected;
    document.getElementById('go-record').textContent = isNewRecord ? 'NEW RECORD!' : 'COMPLETED';
    document.getElementById('go-record').style.color = isNewRecord ? '#00ffaa' : '#ffe600';

    document.getElementById('gameover-modal').classList.remove('hidden');
  }

  function takeDamage() {
    if (isInvincible) return;

    if (hasShield) {
      hasShield = false;
      shieldMesh.visible = false;
      document.getElementById('hud-shield').classList.remove('visible');
      sound.playHit();
      createExplosion(player.position.x, player.position.y + 0.8, player.position.z, 0x00ffaa, 25);
      showAnnouncement('SHIELD BROKEN!');
      activateInvincibility(1.0);
      return;
    }

    hp--;
    updateHpUI();
    sound.playHit();
    cameraShake = 0.4;
    createExplosion(player.position.x, player.position.y + 0.5, player.position.z, 0xff0055, 30);

    if (hp <= 0) {
      triggerGameOver();
    } else {
      activateInvincibility(1.5);
    }
  }

  function activateInvincibility(sec) {
    isInvincible = true;
    invincibilityTimer = sec;
  }

  function updateHpUI() {
    for (let i = 1; i <= 3; i++) {
      const cell = document.getElementById(`hp-1`);
      const el = document.getElementById(`hp-${i}`);
      if (el) {
        if (i <= hp) el.classList.add('active');
        else el.classList.remove('active');
      }
    }
  }

  function showAnnouncement(text) {
    const el = document.getElementById('announcement');
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
    }, 1200);
  }

  

/* ==========================================================================
     10. MAIN ANIMATION & RENDER LOOP (requestAnimationFrame)
     ========================================================================== */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (isGameActive && !isGameOver) {
      // 속도 점진적 증가
      if (speed < maxSpeed) {
        speed += delta * 0.018;
      }

      // 거리 및 점수 증가
      distance += speed * 0.8;
      score += (speed * 8 + (hasShield ? 2 : 1)) * delta * 15;

      // 트랙 텍스처 무한 오프셋 스크롤링
      if (trackGrid && trackGrid.material.map) {
        trackGrid.material.map.offset.y -= speed * 0.015;
      }

      // 스피드라인 스트리밍
      if (speedLines) {
        const positions = speedLines.geometry.attributes.position.array;
        for (let i = 2; i < positions.length; i += 6) {
          positions[i] += speed * 2.8;
          positions[i + 3] += speed * 2.8;
          if (positions[i] > 10) {
            const newZ = -380 - Math.random() * 40;
            positions[i] = newZ;
            positions[i + 3] = newZ + 8;
          }
        }
        speedLines.geometry.attributes.position.needsUpdate = true;
      }

      // 플레이어 레인 부드러운 Lerp 이동 및 틸팅(Banking)
      player.position.x = THREE.MathUtils.lerp(player.position.x, targetX, 0.16);
      const laneOffset = targetX - player.position.x;
      player.rotation.z = -laneOffset * 0.18; // 좌우 회전 틸트
      player.rotation.y = laneOffset * 0.1;

      // 점프 & 중력 시뮬레이션
      if (isJumping) {
        player.position.y += jumpVelocity;
        jumpVelocity -= GRAVITY;
        if (player.position.y <= 0) {
          player.position.y = 0;
          isJumping = false;
          jumpVelocity = 0;
        }
      } else {
        // 호버링 부유 애니메이션
        player.position.y = THREE.MathUtils.lerp(player.position.y, Math.sin(elapsedTime * 6) * 0.08, 0.1);
      }

      // 엔진 배기 파티클 생성
      if (Math.random() > 0.3) {
        createThrusterSpark(player.position.x, player.position.y + 0.4, player.position.z);
      }

      // 무적 시간 및 깜빡임 처리
      if (isInvincible) {
        invincibilityTimer -= delta;
        player.visible = Math.floor(elapsedTime * 20) % 2 === 0;
        if (invincibilityTimer <= 0) {
          isInvincible = false;
          player.visible = true;
        }
      }

      // 스폰 타이머 관리
      spawnDistanceTimer += speed;
      if (spawnDistanceTimer > 35) {
        spawnDistanceTimer = 0;
        if (Math.random() < 0.7) spawnObstacle();
        if (Math.random() < 0.5) spawnPickup();
      }

      // 장애물 업데이트 & 충돌 감지
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.position.z += speed;

        // 장애물 회전 및 애니메이션
        if (obs.userData.type === 'mine') {
          obs.rotation.x += 0.03;
          obs.rotation.y += 0.05;
        } else if (obs.userData.type === 'barrier') {
          obs.position.y = Math.sin(elapsedTime * 8) * 0.04;
        } else if (obs.userData.type === 'block') {
          obs.rotation.y = Math.sin(elapsedTime * 2) * 0.04;
        }

        // 충돌 체크 (거리 및 높이)
        const dz = Math.abs(obs.position.z - player.position.z);
        const dx = Math.abs(obs.position.x - player.position.x);
        const dy = Math.abs((obs.position.y || 1) - player.position.y);

        if (dz < obs.userData.hitRadius && dx < 1.3 && dy < obs.userData.hitHeight) {
          takeDamage();
          scene.remove(obs);
          obstacles.splice(i, 1);
          continue;
        }

        // 플레이어 뒤로 지나간 장애물 제거
        if (obs.position.z > 20) {
          scene.remove(obs);
          obstacles.splice(i, 1);
        }
      }

      // 아이템 업데이트 & 수집 체크
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.position.z += speed;
        p.rotation.y += 0.04;
        p.rotation.x += 0.02;

        const dz = Math.abs(p.position.z - player.position.z);
        const dx = Math.abs(p.position.x - player.position.x);
        const dy = Math.abs(p.position.y - player.position.y);

        if (dz < p.userData.hitRadius && dx < 1.4 && dy < 1.8) {
          if (p.userData.type === 'shield') {
            hasShield = true;
            shieldMesh.visible = true;
            document.getElementById('hud-shield').classList.add('visible');
            sound.playPowerup();
            showAnnouncement('SHIELD ONLINE');
            createExplosion(p.position.x, p.position.y, p.position.z, 0x00ffaa, 20);
          } else {
            // 코어 수집
            coresCollected++;
            score += 150;
            sound.playCollect();
            createExplosion(p.position.x, p.position.y, p.position.z, 0x00f0ff, 15);
          }

          scene.remove(p);
          pickups.splice(i, 1);
          continue;
        }

        if (p.position.z > 20) {
          scene.remove(p);
          pickups.splice(i, 1);
        }
      }

      // HUD UI 업데이트
      document.getElementById('hud-score').textContent = String(Math.floor(score)).padStart(5, '0');
      document.getElementById('hud-speed').textContent = Math.floor(140 + speed * 60);

      // 쉴드 회전 애니메이션
      if (hasShield && shieldMesh) {
        shieldMesh.rotation.y += 0.03;
        shieldMesh.rotation.x += 0.02;
      }
    }

    // 파티클 업데이트
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.position.x += p.userData.velX;
      p.position.y += p.userData.velY;
      p.position.z += p.userData.velZ;
      p.userData.life -= p.userData.decay;

      const scale = Math.max(p.userData.life, 0.01);
      p.scale.set(scale, scale, scale);

      if (p.userData.life <= 0) {
        scene.remove(p);
        particles.splice(i, 1);
      }
    }

    // 카메라 셰이크 감쇠 효과
    if (cameraShake > 0) {
      camera.position.x += (Math.random() - 0.5) * cameraShake;
      camera.position.y += (Math.random() - 0.5) * cameraShake;
      cameraShake *= 0.88;
      if (cameraShake < 0.01) {
        cameraShake = 0;
        camera.position.y = 4.5;
      }
    }

    renderer.render(scene, camera);
  }

export { initThree, setupInputs, animate };
