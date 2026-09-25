import * as THREE from 'three';
import { LANE_WIDTH, ObstacleType, PowerUpType } from './types';

export interface ObstacleItem {
  id: number;
  mesh: THREE.Group;
  type: ObstacleType;
  lane: number; // -1, 0, 1
  z: number;
  box: THREE.Box3;
  width: number;
  height: number;
  minY: number; // For clearance checks
  maxY: number;
  passed: boolean;
}

export interface CoinItem {
  id: number;
  mesh: THREE.Group;
  lane: number;
  z: number;
  y: number;
  collected: boolean;
}

export interface PowerUpItem {
  id: number;
  mesh: THREE.Group;
  type: PowerUpType;
  lane: number;
  z: number;
  y: number;
  collected: boolean;
}

export class ObstacleManager {
  public scene: THREE.Scene;
  public obstacles: ObstacleItem[] = [];
  public coins: CoinItem[] = [];
  public powerUps: PowerUpItem[] = [];

  private nextSpawnZ: number = -40;
  private spawnInterval: number = 28; // Spacing between obstacle sets
  private nextId: number = 1;

  // Reusable materials
  private matHazard: THREE.MeshStandardMaterial;
  private matLaserCyan: THREE.MeshBasicMaterial;
  private matLaserRed: THREE.MeshBasicMaterial;
  private matMetal: THREE.MeshStandardMaterial;
  private matCoinGold: THREE.MeshStandardMaterial;
  private matCoinCore: THREE.MeshBasicMaterial;
  private matShield: THREE.MeshStandardMaterial;
  private matMagnet: THREE.MeshStandardMaterial;
  private matDash: THREE.MeshStandardMaterial;
  private matMultiplier: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.matHazard = new THREE.MeshStandardMaterial({
      color: 0x24242e,
      roughness: 0.5,
      metalness: 0.6,
    });

    this.matLaserCyan = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
    });

    this.matLaserRed = new THREE.MeshBasicMaterial({
      color: 0xff1e56,
    });

    this.matMetal = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.7,
    });

    this.matCoinGold = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.9,
    });

    this.matCoinCore = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    this.matShield = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    this.matMagnet = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xec4899,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    this.matDash = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    this.matMultiplier = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
  }

  public update(playerZ: number, delta: number, magnetActive: boolean, playerX: number, playerY: number) {
    // 1. Spawning ahead
    while (this.nextSpawnZ > playerZ - 220) {
      this.spawnPattern(this.nextSpawnZ);
      this.nextSpawnZ -= this.spawnInterval;
    }

    // 2. Animate Coins
    const coinRotate = delta * 4.0;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.mesh.rotation.y += coinRotate;

      // Magnet attraction
      if (magnetActive && !coin.collected) {
        const distZ = Math.abs(coin.z - playerZ);
        if (distZ < 22 && distZ > 0) {
          const dx = playerX - coin.mesh.position.x;
          const dy = (playerY + 0.8) - coin.mesh.position.y;
          const dz = playerZ - coin.mesh.position.z;
          coin.mesh.position.x += dx * delta * 7.0;
          coin.mesh.position.y += dy * delta * 7.0;
          coin.mesh.position.z += dz * delta * 7.0;
          coin.z = coin.mesh.position.z;
        }
      }

      // Cleanup behind player
      if (coin.z > playerZ + 15 || coin.collected) {
        this.scene.remove(coin.mesh);
        this.coins.splice(i, 1);
      }
    }

    // 3. Animate Power-Ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.mesh.rotation.y += delta * 3.0;
      p.mesh.position.y = p.y + Math.sin(Date.now() * 0.005 + p.id) * 0.15;

      if (p.z > playerZ + 15 || p.collected) {
        this.scene.remove(p.mesh);
        this.powerUps.splice(i, 1);
      }
    }

    // 4. Update Obstacle bounding boxes & clean up
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.box.setFromObject(obs.mesh);

      if (obs.z > playerZ + 25) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  private spawnPattern(z: number) {
    const lanes = [-1, 0, 1];
    const patternType = Math.floor(Math.random() * 5);

    if (patternType === 0) {
      // Single Jump Hurdle on one lane + coins arc over it
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      this.spawnLowBarrier(lane, z);
      this.spawnCoinArc(lane, z);

      // Other lanes get straight coins or power-up
      const otherLanes = lanes.filter((l) => l !== lane);
      this.spawnCoinLine(otherLanes[0], z - 8, 4);
      if (Math.random() > 0.65) {
        this.spawnRandomPowerUp(otherLanes[1], z);
      }
    } else if (patternType === 1) {
      // High slide beam across 1 or 2 lanes
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      this.spawnHighBeam(lane, z);
      // Low sliding coins under the beam!
      this.spawnCoinLine(lane, z - 4, 3, 0.3);

      const otherLanes = lanes.filter((l) => l !== lane);
      this.spawnCoinLine(otherLanes[0], z - 6, 4);
    } else if (patternType === 2) {
      // Hover car occupying 1 lane, player must steer away
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      this.spawnHoverCar(lane, z);

      const safeLanes = lanes.filter((l) => l !== lane);
      const chosenSafe = safeLanes[Math.floor(Math.random() * safeLanes.length)];
      this.spawnCoinLine(chosenSafe, z - 8, 5);

      if (Math.random() > 0.7) {
        this.spawnRandomPowerUp(safeLanes.find((l) => l !== chosenSafe) ?? 0, z);
      }
    } else if (patternType === 3) {
      // Double lane barrier: 2 lanes blocked, 1 open lane
      const openLane = lanes[Math.floor(Math.random() * lanes.length)];
      const blockedLanes = lanes.filter((l) => l !== openLane);

      // Blocked lane 1: Low barrier (jumpable)
      this.spawnLowBarrier(blockedLanes[0], z);
      // Blocked lane 2: Full Turret (must avoid)
      this.spawnSentinelTurret(blockedLanes[1], z);

      // Open lane gets trail of coins
      this.spawnCoinLine(openLane, z - 10, 6);
    } else {
      // High Slide Beam on lane 0, Low Barrier on lane 1, open on lane -1
      const openLane = lanes[Math.floor(Math.random() * 3)];
      const otherLanes = lanes.filter((l) => l !== openLane);
      this.spawnHighBeam(otherLanes[0], z);
      this.spawnLowBarrier(otherLanes[1], z);
      this.spawnCoinLine(openLane, z - 6, 5);
      if (Math.random() > 0.6) {
        this.spawnRandomPowerUp(openLane, z - 12);
      }
    }
  }

  // --- 1. LOW BARRIER (Must Jump Over) ---
  public spawnLowBarrier(lane: number, z: number) {
    const group = new THREE.Group();
    const posX = lane * LANE_WIDTH;
    group.position.set(posX, 0, z);

    // Left and right support posts
    const postGeom = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const leftP = new THREE.Mesh(postGeom, this.matHazard);
    leftP.position.set(-1.0, 0.4, 0);
    group.add(leftP);

    const rightP = new THREE.Mesh(postGeom, this.matHazard);
    rightP.position.set(1.0, 0.4, 0);
    group.add(rightP);

    // Hazard crossbar
    const barGeom = new THREE.BoxGeometry(2.0, 0.22, 0.15);
    const bar = new THREE.Mesh(barGeom, this.matHazard);
    bar.position.set(0, 0.7, 0);
    group.add(bar);

    // Glowing Neon Laser Grid Wire
    const laserGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.95, 8);
    laserGeom.rotateZ(Math.PI / 2);
    const laser = new THREE.Mesh(laserGeom, this.matLaserRed);
    laser.position.set(0, 0.35, 0);
    group.add(laser);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({
      id: this.nextId++,
      mesh: group,
      type: 'LOW_BARRIER',
      lane,
      z,
      box,
      width: 2.0,
      height: 0.85,
      minY: 0,
      maxY: 0.85, // JUMPING (y > 0.9) clears this!
      passed: false,
    });
  }

  // --- 2. HIGH BEAM (Must Slide Under) ---
  public spawnHighBeam(lane: number, z: number) {
    const group = new THREE.Group();
    const posX = lane * LANE_WIDTH;
    group.position.set(posX, 0, z);

    // Tall side uprights
    const postGeom = new THREE.BoxGeometry(0.25, 2.8, 0.25);
    const leftP = new THREE.Mesh(postGeom, this.matMetal);
    leftP.position.set(-1.1, 1.4, 0);
    group.add(leftP);

    const rightP = new THREE.Mesh(postGeom, this.matMetal);
    rightP.position.set(1.1, 1.4, 0);
    group.add(rightP);

    // Overhead heavy industrial beam (Bottom sits at Y = 1.15m)
    const beamGeom = new THREE.BoxGeometry(2.2, 0.7, 0.35);
    const beam = new THREE.Mesh(beamGeom, this.matHazard);
    beam.position.set(0, 1.6, 0);
    group.add(beam);

    // Glowing Scanner Down-Beam
    const scanGeom = new THREE.PlaneGeometry(2.0, 0.2);
    const scanMesh = new THREE.Mesh(scanGeom, this.matLaserCyan);
    scanMesh.position.set(0, 1.25, 0.18);
    group.add(scanMesh);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({
      id: this.nextId++,
      mesh: group,
      type: 'HIGH_BEAM',
      lane,
      z,
      box,
      width: 2.2,
      height: 2.8,
      minY: 1.15, // SLIDING (y < 0.8) clears this!
      maxY: 2.8,
      passed: false,
    });
  }

  // --- 3. HOVER CAR (Full Lane Blocker) ---
  public spawnHoverCar(lane: number, z: number) {
    const group = new THREE.Group();
    const posX = lane * LANE_WIDTH;
    group.position.set(posX, 0.5, z);

    // Car Body
    const bodyGeom = new THREE.BoxGeometry(1.9, 0.9, 3.8);
    const carMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeom, carMat);
    body.position.y = 0.45;
    group.add(body);

    // Cabin Roof
    const roofGeom = new THREE.BoxGeometry(1.5, 0.65, 2.0);
    const cabin = new THREE.Mesh(roofGeom, this.matMetal);
    cabin.position.set(0, 1.15, -0.2);
    group.add(cabin);

    // Rear Brake / Hazard Warning Strip
    const brakeGeom = new THREE.BoxGeometry(1.6, 0.2, 0.1);
    const brake = new THREE.Mesh(brakeGeom, this.matLaserRed);
    brake.position.set(0, 0.5, 1.95);
    group.add(brake);

    // Hover Repulsor Discs
    const repulsorGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10);
    const rep1 = new THREE.Mesh(repulsorGeom, this.matLaserCyan);
    rep1.position.set(-0.7, 0, -1.2);
    group.add(rep1);

    const rep2 = new THREE.Mesh(repulsorGeom, this.matLaserCyan);
    rep2.position.set(0.7, 0, -1.2);
    group.add(rep2);

    const rep3 = new THREE.Mesh(repulsorGeom, this.matLaserCyan);
    rep3.position.set(-0.7, 0, 1.2);
    group.add(rep3);

    const rep4 = new THREE.Mesh(repulsorGeom, this.matLaserCyan);
    rep4.position.set(0.7, 0, 1.2);
    group.add(rep4);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({
      id: this.nextId++,
      mesh: group,
      type: 'HOVER_CAR',
      lane,
      z,
      box,
      width: 1.9,
      height: 1.8,
      minY: 0,
      maxY: 1.8, // Full height: cannot jump or slide over
      passed: false,
    });
  }

  // --- 4. SENTINEL TURRET (Security Pillar) ---
  public spawnSentinelTurret(lane: number, z: number) {
    const group = new THREE.Group();
    const posX = lane * LANE_WIDTH;
    group.position.set(posX, 0, z);

    // Base
    const baseGeom = new THREE.CylinderGeometry(0.7, 0.9, 0.5, 8);
    const base = new THREE.Mesh(baseGeom, this.matHazard);
    base.position.y = 0.25;
    group.add(base);

    // Pillar
    const pillarGeom = new THREE.CylinderGeometry(0.4, 0.45, 2.2, 8);
    const pillar = new THREE.Mesh(pillarGeom, this.matMetal);
    pillar.position.y = 1.4;
    group.add(pillar);

    // Glowing Scanning Head
    const headGeom = new THREE.SphereGeometry(0.45, 8, 8);
    const head = new THREE.Mesh(headGeom, this.matLaserRed);
    head.position.y = 2.4;
    group.add(head);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.obstacles.push({
      id: this.nextId++,
      mesh: group,
      type: 'SENTINEL_TURRET',
      lane,
      z,
      box,
      width: 1.4,
      height: 2.6,
      minY: 0,
      maxY: 2.6,
      passed: false,
    });
  }

  // --- COIN PICKUPS ---
  public spawnCoin(lane: number, z: number, y: number = 0.8) {
    const group = new THREE.Group();
    const posX = lane * LANE_WIDTH;
    group.position.set(posX, y, z);

    // Rotating Cyber Data Cube / Coin
    const cubeGeom = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const cube = new THREE.Mesh(cubeGeom, this.matCoinGold);
    group.add(cube);

    // Bright White Energy Core inside
    const coreGeom = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const core = new THREE.Mesh(coreGeom, this.matCoinCore);
    group.add(core);

    // Glowing Ring around Coin
    const ringGeom = new THREE.TorusGeometry(0.34, 0.03, 4, 12);
    const ring = new THREE.Mesh(ringGeom, this.matCoinGold);
    group.add(ring);

    this.scene.add(group);

    this.coins.push({
      id: this.nextId++,
      mesh: group,
      lane,
      z,
      y,
      collected: false,
    });
  }

  public spawnCoinLine(lane: number, startZ: number, count: number = 5, y: number = 0.8) {
    for (let i = 0; i < count; i++) {
      this.spawnCoin(lane, startZ - i * 3.2, y);
    }
  }

  public spawnCoinArc(lane: number, barrierZ: number) {
    // Parabolic arc matching jump trajectory over obstacle
    const arcOffsets = [
      { dz: 4.5, y: 0.8 },
      { dz: 2.2, y: 1.8 },
      { dz: 0.0, y: 2.4 },
      { dz: -2.2, y: 1.8 },
      { dz: -4.5, y: 0.8 },
    ];
    arcOffsets.forEach((pt) => {
      this.spawnCoin(lane, barrierZ + pt.dz, pt.y);
    });
  }

  // --- POWER-UPS ---
  public spawnRandomPowerUp(lane: number, z: number) {
    const types: PowerUpType[] = ['SHIELD', 'MAGNET', 'DASH', 'MULTIPLIER'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.spawnPowerUp(lane, z, type);
  }

  public spawnPowerUp(lane: number, z: number, type: PowerUpType) {
    const group = new THREE.Group();
    const posX = lane * LANE_WIDTH;
    const posY = 1.2;
    group.position.set(posX, posY, z);

    let mat = this.matShield;
    if (type === 'MAGNET') mat = this.matMagnet;
    if (type === 'DASH') mat = this.matDash;
    if (type === 'MULTIPLIER') mat = this.matMultiplier;

    // Glowing Sphere
    const sphereGeom = new THREE.IcosahedronGeometry(0.42, 1);
    const sphere = new THREE.Mesh(sphereGeom, mat);
    group.add(sphere);

    // Outer Orbit Ring
    const ringGeom = new THREE.TorusGeometry(0.65, 0.04, 6, 16);
    const ring = new THREE.Mesh(ringGeom, mat);
    ring.rotation.x = Math.PI / 4;
    group.add(ring);

    this.scene.add(group);

    this.powerUps.push({
      id: this.nextId++,
      mesh: group,
      type,
      lane,
      z,
      y: posY,
      collected: false,
    });
  }

  public reset() {
    this.obstacles.forEach((o) => this.scene.remove(o.mesh));
    this.coins.forEach((c) => this.scene.remove(c.mesh));
    this.powerUps.forEach((p) => this.scene.remove(p.mesh));

    this.obstacles = [];
    this.coins = [];
    this.powerUps = [];
    this.nextSpawnZ = -40;
  }
}
