import * as THREE from 'three';
import { LANE_WIDTH } from './types';
import skyboxImg from '../assets/images/skybox_cyberpunk_city_1790370065434.jpg';

export interface EnvironmentChunk {
  group: THREE.Group;
  zIndex: number;
}

export class CyberEnvironment {
  public scene: THREE.Scene;
  private chunks: EnvironmentChunk[] = [];
  private chunkLength: number = 60;
  private totalChunks: number = 7;
  private roadWidth: number = 10;
  
  // Materials pool
  private roadMaterial: THREE.MeshStandardMaterial;
  private curbMaterial: THREE.MeshStandardMaterial;
  private neonCyanMaterial: THREE.MeshStandardMaterial;
  private neonMagentaMaterial: THREE.MeshStandardMaterial;
  private neonAmberMaterial: THREE.MeshStandardMaterial;
  private buildingMaterials: THREE.MeshStandardMaterial[] = [];
  private windowTextures: THREE.CanvasTexture[] = [];
  private billboardTextures: THREE.CanvasTexture[] = [];

  // Sky traffic & Drones
  private flyingCars: { mesh: THREE.Group; speed: number; laneX: number; minZ: number; maxZ: number }[] = [];
  private drones: { mesh: THREE.Group; initialY: number; bobOffset: number }[] = [];

  // Rain & Speed Streaks
  private rainParticles!: THREE.Points;
  private rainCount: number = 1500;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Atmospheric Fog - Deep Cyber Midnight Indigo
    this.scene.fog = new THREE.FogExp2(0x050713, 0.011);
    this.scene.background = new THREE.Color(0x050713);

    // Create Shared Materials
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f131c,
      roughness: 0.32, // Glossy wet street reflections
      metalness: 0.35,
    });

    this.curbMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f293d,
      roughness: 0.6,
      metalness: 0.2,
    });

    this.neonCyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });

    this.neonMagentaMaterial = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xec4899,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });

    this.neonAmberMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });

    this.initTextures();
    this.initSkyboxBackdrop();
    this.initInitialChunks();
    this.initSkyTraffic();
    this.initRainParticles();
  }

  private initTextures() {
    // Generate procedural window grid textures with illuminated cyberpunk apartments
    const windowColors = ['#06b6d4', '#ec4899', '#f59e0b', '#8b5cf6', '#3b82f6'];
    
    for (let c = 0; c < windowColors.length; c++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Dark building surface
      ctx.fillStyle = '#0a0d17';
      ctx.fillRect(0, 0, 128, 256);

      const color = windowColors[c];
      const cols = 6;
      const rows = 14;
      const cellW = 128 / cols;
      const cellH = 256 / rows;

      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          if (Math.random() > 0.42) {
            ctx.fillStyle = Math.random() > 0.8 ? '#ffffff' : color;
            ctx.fillRect(col * cellW + 3, r * cellH + 3, cellW - 6, cellH - 6);
          }
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      this.windowTextures.push(texture);

      this.buildingMaterials.push(
        new THREE.MeshStandardMaterial({
          color: 0x111625,
          map: texture,
          roughness: 0.5,
          metalness: 0.4,
          emissive: new THREE.Color(color),
          emissiveMap: texture,
          emissiveIntensity: 0.65,
        })
      );
    }

    // Billboards
    const ads = ['NEO TOKYO', 'CYBER RUN', 'SYNTH CORE', 'RAM 256TB', 'OVERDRIVE', 'HYPER LOOP'];
    ads.forEach((text, i) => {
      const bCanvas = document.createElement('canvas');
      bCanvas.width = 256;
      bCanvas.height = 128;
      const bCtx = bCanvas.getContext('2d')!;

      bCtx.fillStyle = '#050711';
      bCtx.fillRect(0, 0, 256, 128);

      bCtx.lineWidth = 6;
      bCtx.strokeStyle = i % 2 === 0 ? '#06b6d4' : '#ec4899';
      bCtx.strokeRect(6, 6, 244, 116);

      bCtx.fillStyle = i % 2 === 0 ? '#22d3ee' : '#f472b6';
      bCtx.font = 'bold 28px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(text, 128, 64);

      const bTex = new THREE.CanvasTexture(bCanvas);
      this.billboardTextures.push(bTex);
    });
  }

  private initSkyboxBackdrop() {
    // Panoramic cylinder skyline
    const skyGeom = new THREE.CylinderGeometry(280, 280, 160, 24, 1, true);
    
    // Texture loader with fallback
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      skyboxImg,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.set(3, 1);
        const skyMat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.BackSide,
          fog: true,
        });
        const skyMesh = new THREE.Mesh(skyGeom, skyMat);
        skyMesh.position.y = 40;
        this.scene.add(skyMesh);
      },
      undefined,
      () => {
        // Fallback gradient if texture fails
        const skyMat = new THREE.MeshBasicMaterial({
          color: 0x050714,
          side: THREE.BackSide,
        });
        const skyMesh = new THREE.Mesh(skyGeom, skyMat);
        skyMesh.position.y = 40;
        this.scene.add(skyMesh);
      }
    );
  }

  private initInitialChunks() {
    for (let i = 0; i < this.totalChunks; i++) {
      const zPos = 20 - i * this.chunkLength;
      const chunkGroup = this.createChunk(zPos, i);
      this.scene.add(chunkGroup);
      this.chunks.push({ group: chunkGroup, zIndex: zPos });
    }
  }

  private createChunk(zOffset: number, chunkIndex: number): THREE.Group {
    const chunk = new THREE.Group();
    chunk.position.z = zOffset;

    // --- 1. ROAD (Wide 3-lane futuristic cyber expressway) ---
    const roadGeom = new THREE.PlaneGeometry(this.roadWidth, this.chunkLength);
    roadGeom.rotateX(-Math.PI / 2);
    const roadMesh = new THREE.Mesh(roadGeom, this.roadMaterial);
    roadMesh.position.set(0, 0, -this.chunkLength / 2);
    roadMesh.receiveShadow = true;
    chunk.add(roadMesh);

    // Wet puddles with high specular neon sheen
    const puddleGeom = new THREE.PlaneGeometry(2.2, 4.0);
    puddleGeom.rotateX(-Math.PI / 2);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x080c18,
      roughness: 0.05,
      metalness: 0.9,
    });
    const puddle1 = new THREE.Mesh(puddleGeom, puddleMat);
    puddle1.position.set(-LANE_WIDTH, 0.005, -this.chunkLength * 0.3);
    chunk.add(puddle1);

    const puddle2 = new THREE.Mesh(puddleGeom, puddleMat);
    puddle2.position.set(LANE_WIDTH, 0.005, -this.chunkLength * 0.7);
    chunk.add(puddle2);

    // --- 2. LANE DIVIDERS (Dashed Glowing Neon Lines) ---
    // Dividing Lane Left (-1.25) and Lane Right (+1.25)
    const dashLength = 3.5;
    const gapLength = 2.5;
    const count = Math.floor(this.chunkLength / (dashLength + gapLength));
    
    const lineGeom = new THREE.PlaneGeometry(0.12, dashLength);
    lineGeom.rotateX(-Math.PI / 2);

    for (let i = 0; i < count; i++) {
      const zPos = -i * (dashLength + gapLength) - dashLength / 2;

      // Divider 1 (between Left and Center)
      const divider1 = new THREE.Mesh(lineGeom, this.neonCyanMaterial);
      divider1.position.set(-1.25, 0.01, zPos);
      chunk.add(divider1);

      // Divider 2 (between Center and Right)
      const divider2 = new THREE.Mesh(lineGeom, this.neonCyanMaterial);
      divider2.position.set(1.25, 0.01, zPos);
      chunk.add(divider2);
    }

    // --- 3. CURBS & NEON GUARDRAILS ---
    // Left Curb
    const curbGeom = new THREE.BoxGeometry(1.2, 0.25, this.chunkLength);
    const leftCurb = new THREE.Mesh(curbGeom, this.curbMaterial);
    leftCurb.position.set(-this.roadWidth / 2 - 0.6, 0.125, -this.chunkLength / 2);
    chunk.add(leftCurb);

    // Right Curb
    const rightCurb = new THREE.Mesh(curbGeom, this.curbMaterial);
    rightCurb.position.set(this.roadWidth / 2 + 0.6, 0.125, -this.chunkLength / 2);
    chunk.add(rightCurb);

    // Glowing Neon Edge Trim Strips
    const edgeStripGeom = new THREE.BoxGeometry(0.08, 0.15, this.chunkLength);
    const leftEdgeStrip = new THREE.Mesh(edgeStripGeom, this.neonMagentaMaterial);
    leftEdgeStrip.position.set(-this.roadWidth / 2, 0.15, -this.chunkLength / 2);
    chunk.add(leftEdgeStrip);

    const rightEdgeStrip = new THREE.Mesh(edgeStripGeom, this.neonMagentaMaterial);
    rightEdgeStrip.position.set(this.roadWidth / 2, 0.15, -this.chunkLength / 2);
    chunk.add(rightEdgeStrip);

    // Guardrail Posts with Neon Warning Chevrons
    const postGeom = new THREE.BoxGeometry(0.16, 0.8, 0.16);
    const railBarGeom = new THREE.CylinderGeometry(0.06, 0.06, this.chunkLength);
    railBarGeom.rotateX(Math.PI / 2);

    const leftRailBar = new THREE.Mesh(railBarGeom, this.neonCyanMaterial);
    leftRailBar.position.set(-this.roadWidth / 2 - 1.1, 0.7, -this.chunkLength / 2);
    chunk.add(leftRailBar);

    const rightRailBar = new THREE.Mesh(railBarGeom, this.neonCyanMaterial);
    rightRailBar.position.set(this.roadWidth / 2 + 1.1, 0.7, -this.chunkLength / 2);
    chunk.add(rightRailBar);

    for (let p = 0; p < 6; p++) {
      const postZ = -p * 10 - 5;
      const leftPost = new THREE.Mesh(postGeom, this.curbMaterial);
      leftPost.position.set(-this.roadWidth / 2 - 1.1, 0.4, postZ);
      chunk.add(leftPost);

      const rightPost = new THREE.Mesh(postGeom, this.curbMaterial);
      rightPost.position.set(this.roadWidth / 2 + 1.1, 0.4, postZ);
      chunk.add(rightPost);
    }

    // --- 4. CYBERPUNK SKYSCRAPERS ON SIDES ---
    // Left Buildings
    this.populateBuildings(chunk, -1, chunkIndex);
    // Right Buildings
    this.populateBuildings(chunk, 1, chunkIndex);

    // --- 5. OVERPASS BRIDGES OR TUNNEL ARCHES (Every 2nd chunk) ---
    if (chunkIndex % 2 === 1) {
      this.createOverpassBridge(chunk);
    } else {
      this.createNeonTunnelArch(chunk);
    }

    return chunk;
  }

  private populateBuildings(chunk: THREE.Group, side: number, chunkIndex: number) {
    const numBuildings = 3;
    const spacing = this.chunkLength / numBuildings;

    for (let i = 0; i < numBuildings; i++) {
      const height = 35 + ((chunkIndex * 7 + i * 13) % 40);
      const width = 10 + ((i * 5) % 6);
      const depth = spacing * 0.85;

      const matIndex = (chunkIndex + i + (side === 1 ? 2 : 0)) % this.buildingMaterials.length;
      const buildingMat = this.buildingMaterials[matIndex];

      const bGeom = new THREE.BoxGeometry(width, height, depth);
      const building = new THREE.Mesh(bGeom, buildingMat);

      const posX = side * (this.roadWidth / 2 + 2.5 + width / 2);
      const posZ = -i * spacing - depth / 2;
      building.position.set(posX, height / 2, posZ);
      chunk.add(building);

      // Rooftop Antenna with blinking beacon
      const antennaGeom = new THREE.CylinderGeometry(0.1, 0.1, 8, 6);
      const antenna = new THREE.Mesh(antennaGeom, this.curbMaterial);
      antenna.position.set(posX, height + 4, posZ);
      chunk.add(antenna);

      const beaconGeom = new THREE.SphereGeometry(0.3, 6, 6);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.set(posX, height + 8, posZ);
      chunk.add(beacon);

      // Holographic Billboard Sign on building face
      if (i === 1) {
        const adTexIndex = (chunkIndex + i) % this.billboardTextures.length;
        const bbGeom = new THREE.PlaneGeometry(8, 4);
        if (side === -1) {
          bbGeom.rotateY(Math.PI / 2);
        } else {
          bbGeom.rotateY(-Math.PI / 2);
        }
        const bbMat = new THREE.MeshBasicMaterial({
          map: this.billboardTextures[adTexIndex],
          side: THREE.DoubleSide,
        });
        const billboard = new THREE.Mesh(bbGeom, bbMat);
        billboard.position.set(side * (this.roadWidth / 2 + 2.45), 14, posZ);
        chunk.add(billboard);
      }
    }
  }

  private createOverpassBridge(chunk: THREE.Group) {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 0, -this.chunkLength * 0.5);

    // Main overhead deck spanning across the 3 lanes
    const deckGeom = new THREE.BoxGeometry(this.roadWidth + 8, 1.2, 4.5);
    const deckMesh = new THREE.Mesh(deckGeom, this.curbMaterial);
    deckMesh.position.y = 8.5;
    bridgeGroup.add(deckMesh);

    // Glowing underside warning lights
    const underGlowGeom = new THREE.BoxGeometry(this.roadWidth + 4, 0.1, 0.3);
    const underGlow = new THREE.Mesh(underGlowGeom, this.neonAmberMaterial);
    underGlow.position.set(0, 7.85, 0);
    bridgeGroup.add(underGlow);

    // Bridge Side Railings
    const railGeom = new THREE.BoxGeometry(this.roadWidth + 8, 0.8, 0.15);
    const frontRail = new THREE.Mesh(railGeom, this.neonCyanMaterial);
    frontRail.position.set(0, 9.5, 2.1);
    bridgeGroup.add(frontRail);

    const backRail = new THREE.Mesh(railGeom, this.neonCyanMaterial);
    backRail.position.set(0, 9.5, -2.1);
    bridgeGroup.add(backRail);

    // Bridge Support Pillars on sidewalk
    const pillarGeom = new THREE.BoxGeometry(1.2, 8.5, 1.2);
    const leftPillar = new THREE.Mesh(pillarGeom, this.curbMaterial);
    leftPillar.position.set(-this.roadWidth / 2 - 2.5, 4.25, 0);
    bridgeGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeom, this.curbMaterial);
    rightPillar.position.set(this.roadWidth / 2 + 2.5, 4.25, 0);
    bridgeGroup.add(rightPillar);

    chunk.add(bridgeGroup);
  }

  private createNeonTunnelArch(chunk: THREE.Group) {
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -this.chunkLength * 0.5);

    // Hexagonal arch rib
    const ribGeom = new THREE.TorusGeometry(7.2, 0.22, 6, 8, Math.PI);
    const ribMesh = new THREE.Mesh(ribGeom, this.neonCyanMaterial);
    ribMesh.position.set(0, 0, 0);
    archGroup.add(ribMesh);

    const archPillarsGeom = new THREE.BoxGeometry(0.8, 7.5, 0.8);
    const leftP = new THREE.Mesh(archPillarsGeom, this.curbMaterial);
    leftP.position.set(-7.0, 3.75, 0);
    archGroup.add(leftP);

    const rightP = new THREE.Mesh(archPillarsGeom, this.curbMaterial);
    rightP.position.set(7.0, 3.75, 0);
    archGroup.add(rightP);

    chunk.add(archGroup);
  }

  private initSkyTraffic() {
    // 6 Flying cars cruising in aerial lanes
    for (let i = 0; i < 6; i++) {
      const car = new THREE.Group();

      // Sleek hover chassis
      const bodyGeom = new THREE.BoxGeometry(2.4, 0.8, 5.0);
      const carMat = new THREE.MeshStandardMaterial({
        color: 0x181824,
        roughness: 0.3,
        metalness: 0.8,
      });
      const carBody = new THREE.Mesh(bodyGeom, carMat);
      car.add(carBody);

      // Cyan headlights
      const hlGeom = new THREE.BoxGeometry(0.6, 0.2, 0.1);
      const hlMesh = new THREE.Mesh(hlGeom, this.neonCyanMaterial);
      hlMesh.position.set(0, 0, -2.55);
      car.add(hlMesh);

      // Red tail-thruster exhaust
      const tailGeom = new THREE.BoxGeometry(1.8, 0.18, 0.1);
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
      const tailMesh = new THREE.Mesh(tailGeom, tailMat);
      tailMesh.position.set(0, 0, 2.55);
      car.add(tailMesh);

      // Jet stream trail
      const jetTrailGeom = new THREE.ConeGeometry(0.4, 3.5, 4);
      jetTrailGeom.rotateX(-Math.PI / 2);
      const jetTrailMat = new THREE.MeshBasicMaterial({
        color: 0xff3366,
        transparent: true,
        opacity: 0.6,
      });
      const jetTrail = new THREE.Mesh(jetTrailGeom, jetTrailMat);
      jetTrail.position.set(0, 0, 4.3);
      car.add(jetTrail);

      const side = i % 2 === 0 ? -1 : 1;
      const laneX = side * (12 + (i % 3) * 3);
      const altitude = 12 + (i % 2) * 5;
      const initialZ = -i * 50 - 30;

      car.position.set(laneX, altitude, initialZ);
      this.scene.add(car);

      this.flyingCars.push({
        mesh: car,
        speed: 35 + Math.random() * 20,
        laneX,
        minZ: -350,
        maxZ: 50,
      });
    }

    // 2 Hovering Surveillance Drones with scanning cone lights
    for (let d = 0; d < 2; d++) {
      const drone = new THREE.Group();
      const coreGeom = new THREE.SphereGeometry(0.6, 8, 8);
      const core = new THREE.Mesh(coreGeom, this.curbMaterial);
      drone.add(core);

      const eyeGeom = new THREE.SphereGeometry(0.25, 6, 6);
      const eye = new THREE.Mesh(eyeGeom, this.neonCyanMaterial);
      eye.position.set(0, -0.2, 0.4);
      drone.add(eye);

      // Rotating rotor ring
      const ringGeom = new THREE.TorusGeometry(1.2, 0.08, 4, 12);
      ringGeom.rotateX(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeom, this.neonMagentaMaterial);
      drone.add(ring);

      const side = d === 0 ? -6.5 : 6.5;
      const posY = 5.5;
      drone.position.set(side, posY, -25 - d * 60);
      this.scene.add(drone);

      this.drones.push({
        mesh: drone,
        initialY: posY,
        bobOffset: d * Math.PI,
      });
    }
  }

  private initRainParticles() {
    const rainGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 36;
      positions[i * 3 + 1] = Math.random() * 25;
      positions[i * 3 + 2] = -Math.random() * 280;
    }

    rainGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.14,
      transparent: true,
      opacity: 0.65,
    });

    this.rainParticles = new THREE.Points(rainGeom, rainMat);
    this.scene.add(this.rainParticles);
  }

  public update(playerZ: number, delta: number, gameSpeed: number) {
    // Dynamic chunk recycling ahead of player
    this.chunks.forEach((chunk) => {
      // If chunk is completely behind player camera view
      if (chunk.group.position.z > playerZ + 45) {
        // Move chunk to furthest front
        const furthestZ = this.getFurthestChunkZ();
        const newZ = furthestZ - this.chunkLength;
        chunk.group.position.z = newZ;
        chunk.zIndex = newZ;
      }
    });

    // Update flying cars
    this.flyingCars.forEach((car) => {
      car.mesh.position.z -= car.speed * delta;
      if (car.mesh.position.z < playerZ - 320) {
        car.mesh.position.z = playerZ + 40;
      }
    });

    // Update hovering drones
    const time = Date.now() * 0.003;
    this.drones.forEach((d) => {
      d.mesh.position.y = d.initialY + Math.sin(time + d.bobOffset) * 0.6;
      d.mesh.rotation.y += delta * 1.8;
      // Keep drone pacing in front of player
      if (d.mesh.position.z > playerZ + 20) {
        d.mesh.position.z -= 180;
      }
    });

    // Update rain & speed streak particles
    const positions = this.rainParticles.geometry.attributes.position as THREE.BufferAttribute;
    const speedFactor = gameSpeed * 1.8;
    for (let i = 0; i < this.rainCount; i++) {
      let z = positions.getZ(i) + delta * speedFactor;
      let y = positions.getY(i) - delta * 30;

      if (z > playerZ + 15) {
        z = playerZ - 260 + Math.random() * 20;
      }
      if (y < 0) {
        y = 22 + Math.random() * 5;
      }

      positions.setZ(i, z);
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  }

  private getFurthestChunkZ(): number {
    let minZ = 0;
    this.chunks.forEach((c) => {
      if (c.group.position.z < minZ) {
        minZ = c.group.position.z;
      }
    });
    return minZ;
  }

  public reset() {
    for (let i = 0; i < this.chunks.length; i++) {
      const zPos = 20 - i * this.chunkLength;
      this.chunks[i].group.position.z = zPos;
      this.chunks[i].zIndex = zPos;
    }
  }
}
