/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameMetrics } from './game/engine';
import { GameState, CHARACTER_SKINS, CharacterSkin } from './game/types';
import { sound } from './game/audio';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  Zap,
  Flame,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Trophy,
  Coins,
  Square,
  Home,
} from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [metrics, setMetrics] = useState<GameMetrics>({
    score: 0,
    distance: 0,
    coins: 0,
    multiplier: 1,
    speed: 24,
    activePowerUps: [],
    highScore: 0,
    totalCoins: 0,
  });

  const [selectedSkin, setSelectedSkin] = useState<CharacterSkin>(CHARACTER_SKINS[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [showTouchButtons, setShowTouchButtons] = useState(false);

  // Initialize Three.js Game Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    engine.setOnStateChange((newMetrics, state) => {
      setMetrics(newMetrics);
      setGameState(state);
    });

    // Detect mobile touch screen for default virtual controls
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setShowTouchButtons(true);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
      setGameState('PLAYING');
    }
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pauseGame();
    }
  }, []);

  const handleStopGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stopGame(true);
      setGameState('MENU');
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.restartGame();
      setGameState('PLAYING');
    }
  }, []);

  const handleSelectSkin = useCallback((skin: CharacterSkin) => {
    setSelectedSkin(skin);
    if (engineRef.current) {
      engineRef.current.setSkin(skin);
    }
  }, []);

  const toggleSound = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  }, [isMuted]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Top Bar Navigation & Controls */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-8 py-4 pointer-events-auto bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <span className="font-display font-black text-lg sm:text-xl tracking-wider text-cyan-400 neon-text-cyan uppercase">
            Neon Runner
          </span>
          <span className="text-xs font-semibold text-slate-400 tracking-wider hidden sm:inline">
            CYBERPUNK 2099
          </span>
        </div>

        {/* In-Game Telemetry / Metrics (when playing or paused) */}
        {gameState !== 'MENU' && (
          <div className="flex items-center gap-4 sm:gap-8 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-cyan-500/20 shadow-lg">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Distance</span>
              <span className="font-display text-sm sm:text-base font-bold text-white tabular-nums">
                {metrics.distance} <span className="text-xs text-cyan-400 font-normal">m</span>
              </span>
            </div>

            <div className="w-[1px] h-6 bg-slate-700/60" />

            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Score</span>
              <span className="font-display text-sm sm:text-base font-bold text-amber-400 tabular-nums">
                {metrics.score.toLocaleString()}
              </span>
            </div>

            <div className="w-[1px] h-6 bg-slate-700/60" />

            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-display text-sm sm:text-base font-bold text-yellow-300 tabular-nums">
                {metrics.coins}
              </span>
            </div>

            {metrics.multiplier > 1 && (
              <div className="hidden xs:flex items-center px-2 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-500 text-fuchsia-300 text-xs font-bold font-display">
                {metrics.multiplier}X
              </div>
            )}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
            <>
              <button
                onClick={handlePauseToggle}
                className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                title={gameState === 'PAUSED' ? 'Resume Game (P)' : 'Pause Game (P)'}
              >
                {gameState === 'PAUSED' ? <Play className="w-4 h-4 text-cyan-400" /> : <Pause className="w-4 h-4" />}
                <span className="hidden sm:inline">{gameState === 'PAUSED' ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={handleStopGame}
                className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/50 shadow-sm transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Stop Game (Quit to Menu)"
              >
                <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                <span className="hidden sm:inline">Stop Game</span>
              </button>
            </>
          )}

          <button
            onClick={() => setShowTouchButtons(!showTouchButtons)}
            className={`p-2 rounded-lg border transition-colors ${
              showTouchButtons
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-400'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
            title="Toggle On-screen Touch Controls"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Active Power-Ups Banner */}
      {gameState === 'PLAYING' && metrics.activePowerUps.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 pointer-events-none">
          {metrics.activePowerUps.map((p) => {
            const pct = Math.max(0, Math.min(100, (p.duration / p.maxDuration) * 100));
            return (
              <div
                key={p.type}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 shadow-lg text-xs"
              >
                {p.type === 'SHIELD' && <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />}
                {p.type === 'MAGNET' && <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />}
                {p.type === 'DASH' && <Flame className="w-4 h-4 text-amber-400 animate-bounce" />}
                {p.type === 'MULTIPLIER' && <Zap className="w-4 h-4 text-violet-400" />}
                <span className="font-semibold text-white tracking-wider">{p.type}</span>
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-100 ease-linear"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* START MENU OVERLAY */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-md bg-slate-950/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl pointer-events-auto flex flex-col items-center">
            {/* Title */}
            <div className="mb-2">
              <span className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">Endless 3D Runner</span>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wider mt-1 neon-text-cyan">
                NEON RUNNER
              </h1>
              <p className="text-sm text-slate-400 mt-2">
                Sprint across the cyberpunk mega-highway. Dodge barriers, slide under scanners, and collect cyber credits.
              </p>
            </div>

            {/* High Score & Total Coins Stats */}
            <div className="grid grid-cols-2 gap-3 w-full my-5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] uppercase text-slate-400 font-medium">Record Score</div>
                  <div className="font-display text-sm font-bold text-white tabular-nums">
                    {metrics.highScore.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <Coins className="w-5 h-5 text-yellow-400 shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] uppercase text-slate-400 font-medium">Banked Credits</div>
                  <div className="font-display text-sm font-bold text-white tabular-nums">
                    {metrics.totalCoins.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Character Suit Customization */}
            <div className="w-full mb-6 text-left">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Cyber Suit Accent
              </div>
              <div className="grid grid-cols-4 gap-2">
                {CHARACTER_SKINS.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => handleSelectSkin(skin)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                      selectedSkin.id === skin.id
                        ? 'border-cyan-400 bg-cyan-950/50 shadow-md shadow-cyan-950'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: skin.accentColor }}
                    />
                    <span className="text-[10px] font-medium text-slate-300 truncate w-full px-1">
                      {skin.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-black text-base uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Start Run
            </button>

            {/* Controls Guide */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 w-full flex items-center justify-around text-[11px] text-slate-400 font-medium">
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">A/D</span>
                <span>or</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">← →</span>
                <span>Lanes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">W / ↑</span>
                <span>Jump</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">S / ↓</span>
                <span>Slide</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
            <h2 className="font-display font-bold text-2xl text-white tracking-wider mb-2">RUN PAUSED</h2>
            <p className="text-xs text-slate-400 mb-6">Take a breather, Runner. The city waits for no one.</p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handlePauseToggle}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" /> Resume
              </button>
              <button
                onClick={handleRestart}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Restart Run
              </button>
              <button
                onClick={handleStopGame}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-500/40 font-display font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" /> Stop & Exit to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-950/90 border border-rose-500/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-rose-400">Critical Collision</span>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wider mt-1">
              RUN TERMINATED
            </h2>

            {metrics.score >= metrics.highScore && metrics.score > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-semibold">
                <Trophy className="w-3.5 h-3.5" /> NEW RECORD SCORE!
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 w-full my-6 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Distance</div>
                <div className="font-display text-lg font-bold text-white tabular-nums mt-0.5">
                  {metrics.distance} <span className="text-xs text-cyan-400">m</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Score</div>
                <div className="font-display text-lg font-bold text-amber-400 tabular-nums mt-0.5">
                  {metrics.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-medium">Credits</div>
                <div className="font-display text-lg font-bold text-yellow-300 tabular-nums mt-0.5">
                  +{metrics.coins}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={handleRestart}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-black text-base uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" /> Run Again
              </button>
              <button
                onClick={handleStopGame}
                className="py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-display font-bold text-sm tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4 text-cyan-400" /> Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ON-SCREEN TOUCH BUTTONS (For Mobile / Tablet or Optional Touch Play) */}
      {showTouchButtons && gameState === 'PLAYING' && (
        <div className="absolute inset-x-0 bottom-4 z-20 px-6 flex items-end justify-between pointer-events-none">
          {/* Left / Right Steering */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current?.moveLeft();
              }}
              onClick={() => engineRef.current?.moveLeft()}
              className="w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-cyan-600 backdrop-blur-md border border-cyan-500/40 text-cyan-300 active:text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 touch-none"
              aria-label="Move Left"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current?.moveRight();
              }}
              onClick={() => engineRef.current?.moveRight()}
              className="w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-cyan-600 backdrop-blur-md border border-cyan-500/40 text-cyan-300 active:text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 touch-none"
              aria-label="Move Right"
            >
              <ArrowRight className="w-7 h-7" />
            </button>
          </div>

          {/* Jump / Slide Controls */}
          <div className="flex flex-col gap-3 pointer-events-auto">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current?.jump();
              }}
              onClick={() => engineRef.current?.jump()}
              className="w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-cyan-600 backdrop-blur-md border border-cyan-500/40 text-cyan-300 active:text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 touch-none"
              aria-label="Jump"
            >
              <ArrowUp className="w-7 h-7" />
            </button>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                engineRef.current?.slide();
              }}
              onClick={() => engineRef.current?.slide()}
              className="w-14 h-14 rounded-2xl bg-slate-900/80 active:bg-cyan-600 backdrop-blur-md border border-cyan-500/40 text-cyan-300 active:text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 touch-none"
              aria-label="Slide"
            >
              <ArrowDown className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
