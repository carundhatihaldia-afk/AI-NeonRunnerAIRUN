import * as THREE from 'three';
import { AnimationState, CharacterSkin, CHARACTER_SKINS } from './types';

export class BoyCharacter {
  public mesh: THREE.Group;
  
  // Skeletal pivot groups
  private pelvis: THREE.Group;
  private torso: THREE.Group;
  private head: THREE.Group;
  private leftUpperArm: THREE.Group;
  private leftForearm: THREE.Group;
  private rightUpperArm: THREE.Group;
  private rightForearm: THREE.Group;
  private leftThigh: THREE.Group;
  private leftCalf: THREE.Group;
  private rightThigh: THREE.Group;
  private rightCalf: THREE.Group;
  private leftShoe: THREE.Mesh;
  private rightShoe: THREE.Mesh;

  // Effects & Accessories
  private shieldMesh: THREE.Mesh;
  private shoeGlowLeft: THREE.Mesh;
  private shoeGlowRight: THREE.Mesh;
  private visorMesh: THREE.Mesh;
  private chestCoreMesh: THREE.Mesh;
  private slideSparkParticles: THREE.Points;

  // Dynamic Materials for skin swapping
  private jacketMaterial: THREE.MeshStandardMaterial;
  private pantsMaterial: THREE.MeshStandardMaterial;
  private accentMaterial: THREE.MeshStandardMaterial;
  private emissiveMaterial: THREE.MeshStandardMaterial;
  private hairMaterial: THREE.MeshStandardMaterial;
  private skinMaterial: THREE.MeshStandardMaterial;

  // Animation cycle trackers
  private runCycleTime: number = 0;
  private isSliding: boolean = false;
  private isJumping: boolean = false;
  private currentSkin: CharacterSkin = CHARACTER_SKINS[0];

  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'CyberBoyCharacter';

    // Materials setup
    this.skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5c29b,
      roughness: 0.65,
      metalness: 0.05,
    });

    this.jacketMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentSkin.jacketColor),
      roughness: 0.4,
      metalness: 0.3,
    });

    this.pantsMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e1e24,
      roughness: 0.6,
      metalness: 0.2,
    });

    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentSkin.accentColor),
      roughness: 0.3,
      metalness: 0.4,
    });

    this.emissiveMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentSkin.visorColor),
      emissive: new THREE.Color(this.currentSkin.visorColor),
      emissiveIntensity: 1.8,
      roughness: 0.1,
      metalness: 0.8,
    });

    this.hairMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentSkin.hairColor),
      roughness: 0.5,
      metalness: 0.2,
    });

    // --- Build Procedural Boy Skeleton & Meshes ---
    // Root pelvis
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.95; // Hips center
    this.mesh.add(this.pelvis);

    // Belt / Waist pack
    const beltGeom = new THREE.CylinderGeometry(0.24, 0.23, 0.14, 12);
    const beltMesh = new THREE.Mesh(beltGeom, this.accentMaterial);
    this.pelvis.add(beltMesh);

    // Torso (Cyber Jacket)
    this.torso = new THREE.Group();
    this.torso.position.y = 0.1;
    this.pelvis.add(this.torso);

    const torsoGeom = new THREE.CylinderGeometry(0.28, 0.23, 0.48, 10);
    const torsoMesh = new THREE.Mesh(torsoGeom, this.jacketMaterial);
    torsoMesh.position.y = 0.24;
    this.torso.add(torsoMesh);

    // High futuristic collar
    const collarGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.12, 10, 1, true);
    const collarMesh = new THREE.Mesh(collarGeom, this.accentMaterial);
    collarMesh.position.y = 0.50;
    this.torso.add(collarMesh);

    // Glowing Chest Reactor / Cyber Emblem
    const chestCoreGeom = new THREE.BoxGeometry(0.08, 0.12, 0.04);
    this.chestCoreMesh = new THREE.Mesh(chestCoreGeom, this.emissiveMaterial);
    this.chestCoreMesh.position.set(0, 0.32, 0.23);
    this.torso.add(this.chestCoreMesh);

    // Cyber backpack / battery pack
    const packGeom = new THREE.BoxGeometry(0.24, 0.32, 0.14);
    const packMesh = new THREE.Mesh(packGeom, this.pantsMaterial);
    packMesh.position.set(0, 0.26, -0.21);
    this.torso.add(packMesh);

    const packStripGeom = new THREE.BoxGeometry(0.06, 0.24, 0.02);
    const packStrip = new THREE.Mesh(packStripGeom, this.emissiveMaterial);
    packStrip.position.set(0, 0.26, -0.28);
    this.torso.add(packStrip);

    // Head Group
    this.head = new THREE.Group();
    this.head.position.y = 0.56;
    this.torso.add(this.head);

    // Neck
    const neckGeom = new THREE.CylinderGeometry(0.1, 0.11, 0.1, 8);
    const neckMesh = new THREE.Mesh(neckGeom, this.skinMaterial);
    neckMesh.position.y = 0.04;
    this.head.add(neckMesh);

    // Head base (stylized boy face)
    const headGeom = new THREE.SphereGeometry(0.19, 14, 12);
    headGeom.scale(0.9, 1.05, 0.95);
    const headMesh = new THREE.Mesh(headGeom, this.skinMaterial);
    headMesh.position.y = 0.22;
    this.head.add(headMesh);

    // Cyber Visor / Smart Goggles across eyes
    const visorGeom = new THREE.BoxGeometry(0.32, 0.09, 0.18);
    this.visorMesh = new THREE.Mesh(visorGeom, this.emissiveMaterial);
    this.visorMesh.position.set(0, 0.22, 0.12);
    this.head.add(this.visorMesh);

    // Spiky Cyber Hair
    const hairGroup = new THREE.Group();
    hairGroup.position.set(0, 0.28, 0);
    this.head.add(hairGroup);

    // Procedural hair spikes
    const spikeGeom = new THREE.ConeGeometry(0.08, 0.22, 5);
    const spikePositions = [
      [0, 0.08, -0.05, -0.2, 0, 0],
      [0.08, 0.08, -0.02, -0.1, 0.2, -0.2],
      [-0.08, 0.08, -0.02, -0.1, -0.2, 0.2],
      [0.12, 0.02, 0.02, 0, 0.4, -0.4],
      [-0.12, 0.02, 0.02, 0, -0.4, 0.4],
      [0, 0.1, 0.06, 0.4, 0, 0],
      [0.07, 0.08, 0.08, 0.3, 0.3, -0.2],
      [-0.07, 0.08, 0.08, 0.3, -0.3, 0.2],
    ];
    spikePositions.forEach(([x, y, z, rx, ry, rz]) => {
      const spike = new THREE.Mesh(spikeGeom, this.hairMaterial);
      spike.position.set(x, y, z);
      spike.rotation.set(rx, ry, rz);
      hairGroup.add(spike);
    });

    // --- ARMS ---
    // Left Arm
    this.leftUpperArm = new THREE.Group();
    this.leftUpperArm.position.set(-0.34, 0.44, 0);
    this.torso.add(this.leftUpperArm);

    const shoulderPadGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const leftPad = new THREE.Mesh(shoulderPadGeom, this.accentMaterial);
    this.leftUpperArm.add(leftPad);

    const upperArmGeom = new THREE.CylinderGeometry(0.07, 0.06, 0.24, 8);
    const leftArmMesh = new THREE.Mesh(upperArmGeom, this.jacketMaterial);
    leftArmMesh.position.y = -0.12;
    this.leftUpperArm.add(leftArmMesh);

    this.leftForearm = new THREE.Group();
    this.leftForearm.position.y = -0.24;
    this.leftUpperArm.add(this.leftForearm);

    const forearmGeom = new THREE.CylinderGeometry(0.06, 0.055, 0.22, 8);
    const leftForearmMesh = new THREE.Mesh(forearmGeom, this.pantsMaterial);
    leftForearmMesh.position.y = -0.11;
    this.leftForearm.add(leftForearmMesh);

    // Left Cyber Glove / Hand
    const handGeom = new THREE.BoxGeometry(0.08, 0.1, 0.06);
    const leftHand = new THREE.Mesh(handGeom, this.accentMaterial);
    leftHand.position.y = -0.24;
    this.leftForearm.add(leftHand);

    // Right Arm
    this.rightUpperArm = new THREE.Group();
    this.rightUpperArm.position.set(0.34, 0.44, 0);
    this.torso.add(this.rightUpperArm);

    const rightPad = new THREE.Mesh(shoulderPadGeom, this.accentMaterial);
    this.rightUpperArm.add(rightPad);

    const rightArmMesh = new THREE.Mesh(upperArmGeom, this.jacketMaterial);
    rightArmMesh.position.y = -0.12;
    this.rightUpperArm.add(rightArmMesh);

    this.rightForearm = new THREE.Group();
    this.rightForearm.position.y = -0.24;
    this.rightUpperArm.add(this.rightForearm);

    const rightForearmMesh = new THREE.Mesh(forearmGeom, this.pantsMaterial);
    rightForearmMesh.position.y = -0.11;
    this.rightForearm.add(rightForearmMesh);

    const rightHand = new THREE.Mesh(handGeom, this.accentMaterial);
    rightHand.position.y = -0.24;
    this.rightForearm.add(rightHand);

    // --- LEGS ---
    // Left Leg
    this.leftThigh = new THREE.Group();
    this.leftThigh.position.set(-0.16, -0.06, 0);
    this.pelvis.add(this.leftThigh);

    const thighGeom = new THREE.CylinderGeometry(0.1, 0.08, 0.42, 8);
    const leftThighMesh = new THREE.Mesh(thighGeom, this.pantsMaterial);
    leftThighMesh.position.y = -0.21;
    this.leftThigh.add(leftThighMesh);

    // Left Knee Pad
    const kneeGeom = new THREE.BoxGeometry(0.12, 0.1, 0.07);
    const leftKnee = new THREE.Mesh(kneeGeom, this.accentMaterial);
    leftKnee.position.set(0, -0.42, 0.05);
    this.leftThigh.add(leftKnee);

    this.leftCalf = new THREE.Group();
    this.leftCalf.position.y = -0.42;
    this.leftThigh.add(this.leftCalf);

    const calfGeom = new THREE.CylinderGeometry(0.08, 0.065, 0.42, 8);
    const leftCalfMesh = new THREE.Mesh(calfGeom, this.pantsMaterial);
    leftCalfMesh.position.y = -0.21;
    this.leftCalf.add(leftCalfMesh);

    // Left Futuristic High-Top Sneaker
    const shoeGeom = new THREE.BoxGeometry(0.12, 0.12, 0.28);
    this.leftShoe = new THREE.Mesh(shoeGeom, this.jacketMaterial);
    this.leftShoe.position.set(0, -0.42, 0.06);
    this.leftCalf.add(this.leftShoe);

    // Illuminated Glowing Sole
    const soleGeom = new THREE.BoxGeometry(0.13, 0.035, 0.29);
    this.shoeGlowLeft = new THREE.Mesh(soleGeom, this.emissiveMaterial);
    this.shoeGlowLeft.position.set(0, -0.47, 0.06);
    this.leftCalf.add(this.shoeGlowLeft);

    // Right Leg
    this.rightThigh = new THREE.Group();
    this.rightThigh.position.set(0.16, -0.06, 0);
    this.pelvis.add(this.rightThigh);

    const rightThighMesh = new THREE.Mesh(thighGeom, this.pantsMaterial);
    rightThighMesh.position.y = -0.21;
    this.rightThigh.add(rightThighMesh);

    const rightKnee = new THREE.Mesh(kneeGeom, this.accentMaterial);
    rightKnee.position.set(0, -0.42, 0.05);
    this.rightThigh.add(rightKnee);

    this.rightCalf = new THREE.Group();
    this.rightCalf.position.y = -0.42;
    this.rightThigh.add(this.rightCalf);

    const rightCalfMesh = new THREE.Mesh(calfGeom, this.pantsMaterial);
    rightCalfMesh.position.y = -0.21;
    this.rightCalf.add(rightCalfMesh);

    this.rightShoe = new THREE.Mesh(shoeGeom, this.jacketMaterial);
    this.rightShoe.position.set(0, -0.42, 0.06);
    this.rightCalf.add(this.rightShoe);

    this.shoeGlowRight = new THREE.Mesh(soleGeom, this.emissiveMaterial);
    this.shoeGlowRight.position.set(0, -0.47, 0.06);
    this.rightCalf.add(this.shoeGlowRight);

    // --- SHIELD BUBBLE (Toggled when powerup active) ---
    const shieldGeom = new THREE.SphereGeometry(1.25, 20, 16);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
      roughness: 0.1,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
    this.shieldMesh.position.y = 0.9;
    this.shieldMesh.visible = false;
    this.mesh.add(this.shieldMesh);

    // --- SLIDE FRICTION PARTICLES ---
    const sparkCount = 40;
    const sparkGeom = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount * 3; i++) {
      sparkPositions[i] = (Math.random() - 0.5) * 0.4;
    }
    sparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x22d3ee,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
    });
    this.slideSparkParticles = new THREE.Points(sparkGeom, sparkMat);
    this.slideSparkParticles.position.set(0, 0.1, 0.2);
    this.slideSparkParticles.visible = false;
    this.mesh.add(this.slideSparkParticles);

    // Shadows
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  public setSkin(skin: CharacterSkin) {
    this.currentSkin = skin;
    this.jacketMaterial.color.set(skin.jacketColor);
    this.accentMaterial.color.set(skin.accentColor);
    this.emissiveMaterial.color.set(skin.visorColor);
    this.emissiveMaterial.emissive.set(skin.visorColor);
    this.hairMaterial.color.set(skin.hairColor);
  }

  public setShieldVisible(visible: boolean) {
    this.shieldMesh.visible = visible;
  }

  public update(
    delta: number,
    state: AnimationState,
    speed: number,
    jumpProgress: number, // 0 to 1
    slideProgress: number, // 0 to 1
  ) {
    // Pulse shield if active
    if (this.shieldMesh.visible) {
      this.shieldMesh.rotation.y += delta * 1.5;
      this.shieldMesh.rotation.x += delta * 0.8;
      const pulse = 1.0 + Math.sin(Date.now() * 0.008) * 0.05;
      this.shieldMesh.scale.set(pulse, pulse, pulse);
    }

    if (state === 'HIT') {
      // Game over tumble
      this.pelvis.position.y = Math.max(0.2, this.pelvis.position.y - delta * 2.0);
      this.mesh.rotation.x = -Math.PI * 0.35;
      this.leftThigh.rotation.x = -0.4;
      this.rightThigh.rotation.x = -0.3;
      this.leftUpperArm.rotation.x = 0.8;
      this.rightUpperArm.rotation.x = 0.9;
      this.slideSparkParticles.visible = false;
      return;
    }

    if (state === 'SLIDE') {
      this.isSliding = true;
      this.isJumping = false;
      this.slideSparkParticles.visible = true;

      // Lower center of mass below obstacle height
      this.pelvis.position.y = 0.35;
      this.torso.rotation.x = -0.6; // Leaned back athletic baseball slide
      this.head.rotation.x = 0.4;  // Head tilted forward to see road ahead

      // Right leg extended forward
      this.rightThigh.rotation.x = -1.35;
      this.rightCalf.rotation.x = 0.15;

      // Left leg tucked under body
      this.leftThigh.rotation.x = 0.85;
      this.leftCalf.rotation.x = 1.4;

      // Arms stabilizing slide
      this.leftUpperArm.rotation.x = 0.5;
      this.leftUpperArm.rotation.z = -0.4;
      this.rightUpperArm.rotation.x = -0.3;
      this.rightUpperArm.rotation.z = 0.4;

      // Animate sparks
      const posAttr = this.slideSparkParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let z = posAttr.getZ(i) + delta * 3.5;
        if (z > 0.8) z = -0.2;
        posAttr.setZ(i, z);
        posAttr.setX(i, (Math.random() - 0.5) * 0.4);
      }
      posAttr.needsUpdate = true;
      return;
    }

    this.slideSparkParticles.visible = false;

    if (state === 'JUMP') {
      this.isJumping = true;
      this.isSliding = false;

      // Parabolic jump arc: base height + jump height
      const arc = Math.sin(jumpProgress * Math.PI);
      this.pelvis.position.y = 0.95 + arc * 2.5;

      // Athletic tuck pose mid-air
      this.torso.rotation.x = 0.18;
      this.leftThigh.rotation.x = -0.7;
      this.leftCalf.rotation.x = 1.1;
      this.rightThigh.rotation.x = -0.55;
      this.rightCalf.rotation.x = 0.95;

      // Arms flared outward for aerial balance
      this.leftUpperArm.rotation.x = -0.6;
      this.leftUpperArm.rotation.z = -0.7;
      this.rightUpperArm.rotation.x = -0.6;
      this.rightUpperArm.rotation.z = 0.7;
      return;
    }

    // RUNNING or LANDING State
    this.isJumping = false;
    this.isSliding = false;

    // Normal running animation cycle
    const runFreq = speed * 0.48; // Faster run at higher game speeds
    this.runCycleTime += delta * runFreq;

    const cycle = this.runCycleTime;
    const sinCycle = Math.sin(cycle);
    const cosCycle = Math.cos(cycle);

    // Torso bobbing and forward sprint lean
    const bob = Math.abs(sinCycle) * 0.08;
    this.pelvis.position.y = 0.95 + bob;
    this.torso.rotation.x = 0.16; // Slight forward lean
    this.torso.rotation.y = sinCycle * 0.06; // Subtle hip twist
    this.head.rotation.x = -0.08; // Head keeps eyes level with horizon

    // Leg swings (counter-phase)
    this.leftThigh.rotation.x = sinCycle * 0.78;
    this.rightThigh.rotation.x = -sinCycle * 0.78;

    // Knee flex on back-stroke
    this.leftCalf.rotation.x = Math.max(0, -sinCycle) * 1.15;
    this.rightCalf.rotation.x = Math.max(0, sinCycle) * 1.15;

    // Arm swings (opposite to legs)
    this.leftUpperArm.rotation.x = -sinCycle * 0.75;
    this.leftUpperArm.rotation.z = -0.15;
    this.leftForearm.rotation.x = -0.5 - Math.max(0, sinCycle) * 0.5;

    this.rightUpperArm.rotation.x = sinCycle * 0.75;
    this.rightUpperArm.rotation.z = 0.15;
    this.rightForearm.rotation.x = -0.5 - Math.max(0, -sinCycle) * 0.5;

    // Reset hit rotation
    this.mesh.rotation.x = 0;
  }
}
