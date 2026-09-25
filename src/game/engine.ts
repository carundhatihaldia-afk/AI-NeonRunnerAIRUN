import * as THREE from 'three';
import { BoyCharacter } from './character';
import { CyberEnvironment } from './environment';
import { ObstacleManager } from './obstacles';
import { sound } from './audio';
import {
  GameState,
  Lane,
  LANE_WIDTH,
  LANES,
  BASE_SPEED,
  MAX_SPEED,
  JUMP_DURATION,
  SLIDE_DURATION,
  PowerUpType,
  PowerUpActive,
  CharacterSkin,
  CHARACTER_SKINS,
} from './types';

export interface GameMetrics {
  score: number;
  distance: number;
  coins: number;
  multiplier: number;
  speed: number;
  activePowerUps: PowerUpActive[];
  highScore: number;
  totalCoins: number;
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  // Game Systems
  public character: BoyCharacter;
  public environment: CyberEnvironment;
  public obstacles: ObstacleManager;

  // State
  public state: GameState = 'MENU';
  private targetLane: Lane = 0;
  private currentLaneX: number = 0;
  private playerZ: number = 0;
  private playerY: number = 0;
  private gameSpeed: number = BASE_SPEED;

  // Jump & Slide kinematics
  private isJumping: boolean = false;
  private jumpProgress: number = 0;
  private isSliding: boolean = false;
  private slideProgress: number = 0;
  private isHit: boolean = false;
  private hitTimer: number = 0;

  // Active Power-ups
  private activePowerUps: Map<PowerUpType, { duration: number; maxDuration: number }> = new Map();

  // Metrics
  public score: number = 0;
  public distance: number = 0;
  public coins: number = 0;
  public baseMultiplier: number = 1;
  public highScore: number = 0;
  public totalCoins: number = 0;

  // Camera settings & juice
  private baseFOV: number = 60;
  private cameraShake: number = 0;
  private lastTime: number = performance.now();
  private lastUIUpdateTime: number = 0;
  private animationFrameId: number | null = null;
  private onStateChangeCallback?: (metrics: GameMetrics, state: GameState) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Load High Score and Coins
    try {
      this.highScore = parseInt(localStorage.getItem('neon_runner_high_score') || '0', 10);
      this.totalCoins = parseInt(localStorage.getItem('neon_runner_total_coins') || '0', 10);
    } catch {
      this.highScore = 0;
      this.totalCoins = 0;
    }

    // Three.js Scene Setup
    this.scene = new THREE.Scene();

    // Camera: positioned behind and slightly above the character
    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(this.baseFOV, aspect, 0.1, 400);
    this.camera.position.set(0, 2.4, 5.5);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lighting setup
    this.initLighting();

    // Instantiate Subsystems
    this.character = new BoyCharacter();
    this.scene.add(this.character.mesh);

    this.environment = new CyberEnvironment(this.scene);
    this.obstacles = new ObstacleManager(this.scene);

    // Initial position
    this.resetPlayerPosition();

    // Event Listeners
    window.addEventListener('resize', this.onResize);
    this.setupControls();

    // Start Loop
    this.animate();
  }

  private initLighting() {
    // Ambient Light - cool indigo tint
    const ambientLight = new THREE.AmbientLight(0x18203c, 1.2);
    this.scene.add(ambientLight);

    // Directional Key Light (Moonlight / Sky Spire)
    const dirLight = new THREE.DirectionalLight(0xa5f3fc, 1.8);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    this.scene.add(dirLight);

    // Dynamic Character Rim Light (Backlight for high contrast silhouette)
    const rimLight = new THREE.DirectionalLight(0xec4899, 1.4);
    rimLight.position.set(0, 5, -12);
    this.scene.add(rimLight);
  }

  private resetPlayerPosition() {
    this.targetLane = 0;
    this.currentLaneX = 0;
    this.playerZ = 0;
    this.playerY = 0;
    this.gameSpeed = BASE_SPEED;
    this.isJumping = false;
    this.jumpProgress = 0;
    this.isSliding = false;
    this.slideProgress = 0;
    this.isHit = false;
    this.hitTimer = 0;
    this.activePowerUps.clear();
    this.character.setShieldVisible(false);

    this.character.mesh.position.set(0, 0, 0);
    this.character.mesh.rotation.set(0, 0, 0);

    // Camera initial framing
    this.camera.position.set(0, 2.4, 5.5);
    this.camera.lookAt(0, 1.2, -8.0);
  }

  public setOnStateChange(cb: (metrics: GameMetrics, state: GameState) => void) {
    this.onStateChangeCallback = cb;
  }

  public setSkin(skin: CharacterSkin) {
    this.character.setSkin(skin);
  }

  public startGame() {
    this.resetPlayerPosition();
    this.environment.reset();
    this.obstacles.reset();
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.state = 'PLAYING';
    sound.startMusic();
  }

  public pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
    }
  }

  public resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
    }
  }

  public stopGame(returnToMenu: boolean = true) {
    sound.stopMusic();

    // Save High Score & Total Coins
    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      try {
        localStorage.setItem('neon_runner_high_score', this.highScore.toString());
      } catch {
        // Ignore
      }
    }
    try {
      localStorage.setItem('neon_runner_total_coins', this.totalCoins.toString());
    } catch {
      // Ignore
    }

    this.resetPlayerPosition();
    this.environment.reset();
    this.obstacles.reset();
    this.state = returnToMenu ? 'MENU' : 'GAMEOVER';

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(
        {
          score: Math.floor(this.score),
          distance: Math.floor(this.distance),
          coins: this.coins,
          multiplier: this.getEffectiveMultiplier(),
          speed: Math.round(this.gameSpeed),
          activePowerUps: [],
          highScore: this.highScore,
          totalCoins: this.totalCoins,
        },
        this.state
      );
    }
  }

  public restartGame() {
    this.startGame();
  }

  // --- CONTROLS ---
  public moveLeft() {
    if (this.state !== 'PLAYING' || this.isHit) return;
    if (this.targetLane > -1) {
      this.targetLane = (this.targetLane - 1) as Lane;
    }
  }

  public moveRight() {
    if (this.state !== 'PLAYING' || this.isHit) return;
    if (this.targetLane < 1) {
      this.targetLane = (this.targetLane + 1) as Lane;
    }
  }

  public jump() {
    if (this.state !== 'PLAYING' || this.isHit) return;
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpProgress = 0;
      this.isSliding = false; // Cancel slide into jump
      this.slideProgress = 0;
      sound.playJump();
    }
  }

  public slide() {
    if (this.state !== 'PLAYING' || this.isHit) return;
    if (!this.isSliding) {
      this.isSliding = true;
      this.slideProgress = 0;
      this.isJumping = false; // Fast dive from jump
      this.jumpProgress = 0;
      this.playerY = 0;
      sound.playSlide();
    }
  }

  private setupControls() {
    // Keyboard listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.moveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.moveRight();
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault();
        this.jump();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.slide();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        this.pauseGame();
      }
    });

    // Touch & Swipe listener
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    this.container.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = performance.now();
        }
      },
      { passive: true }
    );

    this.container.addEventListener(
      'touchend',
      (e) => {
        if (e.changedTouches.length > 0) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          const duration = performance.now() - touchStartTime;

          // Require swipe distance
          if (duration < 500 && (Math.abs(deltaX) > 28 || Math.abs(deltaY) > 28)) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              // Horizontal swipe
              if (deltaX > 0) {
                this.moveRight();
              } else {
                this.moveLeft();
              }
            } else {
              // Vertical swipe
              if (deltaY > 0) {
                this.slide();
              } else {
                this.jump();
              }
            }
          }
        }
      },
      { passive: true }
    );
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth || 800;
    const height = this.container.clientHeight || window.innerHeight || 600;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.state === 'PLAYING') {
      this.updatePlaying(delta);
    } else if (this.state === 'MENU') {
      // Menu idle preview animation
      this.character.update(delta, 'RUN', BASE_SPEED * 0.7, 0, 0);
      this.environment.update(this.playerZ, delta, BASE_SPEED * 0.7);
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);

    // Notify UI Metrics (throttled to 10 FPS so React doesn't freeze the main thread)
    if (this.onStateChangeCallback) {
      if (this.state !== 'PLAYING' || now - this.lastUIUpdateTime > 100) {
        this.lastUIUpdateTime = now;
        const activeList: PowerUpActive[] = [];
        this.activePowerUps.forEach((val, type) => {
          activeList.push({ type, duration: val.duration, maxDuration: val.maxDuration });
        });

        this.onStateChangeCallback(
          {
            score: Math.floor(this.score),
            distance: Math.floor(this.distance),
            coins: this.coins,
            multiplier: this.getEffectiveMultiplier(),
            speed: Math.round(this.gameSpeed),
            activePowerUps: activeList,
            highScore: this.highScore,
            totalCoins: this.totalCoins,
          },
          this.state
        );
      }
    }
  };

  private getEffectiveMultiplier(): number {
    let mult = this.baseMultiplier;
    if (this.activePowerUps.has('MULTIPLIER')) mult *= 2;
    if (this.activePowerUps.has('DASH')) mult *= 2;
    return mult;
  }

  private updatePlaying(delta: number) {
    if (this.isHit) {
      this.hitTimer += delta;
      this.character.update(delta, 'HIT', 0, 0, 0);
      if (this.hitTimer > 1.2) {
        this.triggerGameOver();
      }
      return;
    }

    // Update active powerups
    this.activePowerUps.forEach((item, type) => {
      item.duration -= delta;
      if (item.duration <= 0) {
        this.activePowerUps.delete(type);
        if (type === 'SHIELD') {
          this.character.setShieldVisible(false);
        }
      }
    });

    const isDashActive = this.activePowerUps.has('DASH');
    const isMagnetActive = this.activePowerUps.has('MAGNET');
    const isShieldActive = this.activePowerUps.has('SHIELD');

    // Smooth speed ramping as distance increases
    const targetSpeed = Math.min(
      MAX_SPEED,
      BASE_SPEED + (this.distance / 200) * 1.5
    ) * (isDashActive ? 1.6 : 1.0);

    this.gameSpeed += (targetSpeed - this.gameSpeed) * delta * 2.0;

    // Advance forward
    const moveDist = this.gameSpeed * delta;
    this.playerZ -= moveDist;
    this.distance += moveDist;
    this.score += moveDist * this.getEffectiveMultiplier();

    // Smooth lane transitions (Damped horizontal lerp)
    const targetX = this.targetLane * LANE_WIDTH;
    this.currentLaneX += (targetX - this.currentLaneX) * Math.min(1.0, delta * 15.0);

    // Jump Kinematics
    if (this.isJumping) {
      this.jumpProgress += delta / JUMP_DURATION;
      if (this.jumpProgress >= 1.0) {
        this.isJumping = false;
        this.jumpProgress = 0;
        this.playerY = 0;
      } else {
        this.playerY = Math.sin(this.jumpProgress * Math.PI) * 2.5;
      }
    } else {
      this.playerY = 0;
    }

    // Slide Kinematics
    if (this.isSliding) {
      this.slideProgress += delta / SLIDE_DURATION;
      if (this.slideProgress >= 1.0) {
        this.isSliding = false;
        this.slideProgress = 0;
      }
    }

    // Sync character mesh position
    this.character.mesh.position.set(this.currentLaneX, this.playerY, this.playerZ);

    // Determine animation state
    let animState: 'RUN' | 'JUMP' | 'SLIDE' = 'RUN';
    if (this.isJumping) animState = 'JUMP';
    else if (this.isSliding) animState = 'SLIDE';

    this.character.update(delta, animState, this.gameSpeed, this.jumpProgress, this.slideProgress);

    // Update Subsystems
    this.environment.update(this.playerZ, delta, this.gameSpeed);
    this.obstacles.update(
      this.playerZ,
      delta,
      isMagnetActive,
      this.currentLaneX,
      this.playerY
    );

    // Check Collisions
    this.checkCollisions(isShieldActive, isDashActive);

    // Update Camera Follow
    this.updateCamera(delta, isDashActive);
  }

  private checkCollisions(shieldActive: boolean, dashActive: boolean) {
    const playerRadiusX = 0.55;
    const playerZMin = this.playerZ - 0.45;
    const playerZMax = this.playerZ + 0.45;

    // 1. Check Coins
    for (let i = 0; i < this.obstacles.coins.length; i++) {
      const coin = this.obstacles.coins[i];
      if (coin.collected) continue;

      const distZ = Math.abs(coin.z - this.playerZ);
      const distX = Math.abs(coin.mesh.position.x - this.currentLaneX);
      const distY = Math.abs(coin.mesh.position.y - (this.playerY + 0.9));

      if (distZ < 1.1 && distX < 1.0 && distY < 1.5) {
        coin.collected = true;
        this.coins++;
        this.totalCoins++;
        this.score += 50 * this.getEffectiveMultiplier();
        sound.playCoin(this.coins % 6);
      }
    }

    // 2. Check Power-Ups
    for (let i = 0; i < this.obstacles.powerUps.length; i++) {
      const p = this.obstacles.powerUps[i];
      if (p.collected) continue;

      const distZ = Math.abs(p.z - this.playerZ);
      const distX = Math.abs(p.mesh.position.x - this.currentLaneX);

      if (distZ < 1.2 && distX < 1.0) {
        p.collected = true;
        this.activatePowerUp(p.type);
        sound.playPowerUp();
      }
    }

    // 3. Check Obstacles
    for (let i = 0; i < this.obstacles.obstacles.length; i++) {
      const obs = this.obstacles.obstacles[i];
      if (obs.passed) continue;

      // Check Z overlap
      const obsZMin = obs.z - 0.6;
      const obsZMax = obs.z + 0.6;

      if (playerZMax >= obsZMin && playerZMin <= obsZMax) {
        // Check X lane overlap
        const obsX = obs.lane * LANE_WIDTH;
        const distX = Math.abs(this.currentLaneX - obsX);

        if (distX < playerRadiusX + obs.width * 0.45) {
          // Obstacle is in player's path! Check clearance type:
          let hit = false;

          if (obs.type === 'LOW_BARRIER') {
            // Player must JUMP over it (player height > obstacle maxY)
            if (this.playerY < 1.1) {
              hit = true;
            }
          } else if (obs.type === 'HIGH_BEAM') {
            // Player must SLIDE under it
            if (!this.isSliding || this.playerY > 0.4) {
              hit = true;
            }
          } else {
            // HOVER_CAR or SENTINEL_TURRET: Full blocker!
            hit = true;
          }

          if (hit) {
            if (dashActive) {
              // Vaporize obstacle with score bonus!
              obs.passed = true;
              this.scene.remove(obs.mesh);
              this.score += 200;
              this.cameraShake = 0.2;
              sound.playShieldDeflect();
            } else if (shieldActive) {
              // Absorb hit with shield
              obs.passed = true;
              this.activePowerUps.delete('SHIELD');
              this.character.setShieldVisible(false);
              this.cameraShake = 0.35;
              sound.playShieldDeflect();
            } else {
              // Direct Hit! Game Over sequence
              this.isHit = true;
              this.hitTimer = 0;
              this.cameraShake = 0.6;
              sound.playCrash();
            }
          }
        }
      }

      // Mark passed once behind player
      if (obs.z > this.playerZ + 2.0) {
        obs.passed = true;
      }
    }
  }

  public activatePowerUp(type: PowerUpType) {
    const durations: Record<PowerUpType, number> = {
      SHIELD: 15.0,
      MAGNET: 12.0,
      DASH: 6.0,
      MULTIPLIER: 12.0,
    };
    const maxDur = durations[type];
    this.activePowerUps.set(type, { duration: maxDur, maxDuration: maxDur });

    if (type === 'SHIELD') {
      this.character.setShieldVisible(true);
    }
  }

  private updateCamera(delta: number, isDashActive: boolean) {
    // Dynamic FOV widening on Dash
    const targetFOV = isDashActive ? 74 : this.baseFOV;
    this.camera.fov += (targetFOV - this.camera.fov) * delta * 4.0;
    this.camera.updateProjectionMatrix();

    // Camera follow offsets:
    // Behind by 5.5m, above by 2.4m
    const targetCamX = this.currentLaneX * 0.65;
    const targetCamY = 2.4 + this.playerY * 0.45;
    const targetCamZ = this.playerZ + 5.5;

    // Smooth lerp
    this.camera.position.x += (targetCamX - this.camera.position.x) * delta * 12.0;
    this.camera.position.y += (targetCamY - this.camera.position.y) * delta * 12.0;
    this.camera.position.z = targetCamZ;

    // Camera Shake on collisions/impacts
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 1.5);
    }

    // Look target is ahead on the road
    const targetLookX = this.currentLaneX * 0.35;
    const targetLookY = 1.2 + this.playerY * 0.25;
    const targetLookZ = this.playerZ - 8.0;

    this.camera.lookAt(targetLookX, targetLookY, targetLookZ);
  }

  private triggerGameOver() {
    this.state = 'GAMEOVER';
    sound.stopMusic();

    // Save High Score
    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      try {
        localStorage.setItem('neon_runner_high_score', this.highScore.toString());
      } catch {
        // Ignore
      }
    }
    try {
      localStorage.setItem('neon_runner_total_coins', this.totalCoins.toString());
    } catch {
      // Ignore
    }
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    sound.stopMusic();
    window.removeEventListener('resize', this.onResize);
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
