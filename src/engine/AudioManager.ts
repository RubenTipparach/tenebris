// Audio Manager - Centralized audio system using Web Audio API
// Handles sound loading, playback, pooling, spatial audio, and volume control

import * as THREE from 'three';
import {
  SoundCategory,
  SOUND_DEFINITIONS,
  AUDIO_SETTINGS,
} from '../config/AudioConfig';
import { getAssetPath } from '../utils/assetPath';

/**
 * Options for playing a sound
 */
export interface PlayOptions {
  position?: THREE.Vector3; // For spatial audio
  volume?: number; // Override default volume (0-1)
  playbackRate?: number; // Pitch adjustment (1.0 = normal)
  loop?: boolean; // Override loop setting
}

/**
 * Active loop tracking
 */
interface ActiveLoop {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode: PannerNode | null;
  soundId: string;
}

/**
 * AudioManager Singleton
 * Manages all game audio using Web Audio API
 */
class AudioManagerSingleton {
  private static instance: AudioManagerSingleton | null = null;

  // Web Audio API
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Map<SoundCategory, GainNode> = new Map();

  // Sound buffers (preloaded)
  private soundBuffers: Map<string, AudioBuffer> = new Map();

  // Active loops
  private activeLoops: Map<string, ActiveLoop> = new Map();

  // Last play time per sound (for throttling)
  private lastPlayTime: Map<string, number> = new Map();

  // State
  private initialized: boolean = false;
  private unlocked: boolean = false;
  private muted: boolean = false;
  private previousMasterVolume: number = 1.0;

  // Volume settings
  private volumes: Map<SoundCategory, number> = new Map();

  // Listener position (for spatial audio)
  private listenerPosition: THREE.Vector3 = new THREE.Vector3();

  private constructor() {
    // Initialize volumes with defaults
    for (const [category, volume] of Object.entries(AUDIO_SETTINGS.DEFAULT_VOLUMES)) {
      this.volumes.set(category as SoundCategory, volume);
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): AudioManagerSingleton {
    if (!AudioManagerSingleton.instance) {
      AudioManagerSingleton.instance = new AudioManagerSingleton();
    }
    return AudioManagerSingleton.instance;
  }

  /**
   * Initialize the audio system
   */
  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create audio context
      this.audioContext = new AudioContext();

      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);

      // Create gain nodes for each category
      for (const category of Object.values(SoundCategory)) {
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.volumes.get(category) ?? 1.0;
        gainNode.connect(this.masterGain);
        this.categoryGains.set(category, gainNode);
      }

      // Set up autoplay unlock
      this.setupAutoplayUnlock();

      // Preload all sounds
      await this.preloadAllSounds();

      this.initialized = true;
      console.log('AudioManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
    }
  }

  /**
   * Set up autoplay unlock on first user interaction
   */
  private setupAutoplayUnlock(): void {
    const unlock = async () => {
      if (this.unlocked || !this.audioContext) return;

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play silent buffer to fully unlock
      const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioContext.destination);
      source.start();

      this.unlocked = true;
      console.log('Audio unlocked');

      // Remove listeners
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };

    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  /**
   * Preload all sounds defined in SOUND_DEFINITIONS
   */
  private async preloadAllSounds(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    for (const [soundId, config] of Object.entries(SOUND_DEFINITIONS)) {
      loadPromises.push(this.loadSound(soundId, config.path));
    }

    await Promise.allSettled(loadPromises);
    console.log(`Loaded ${this.soundBuffers.size}/${Object.keys(SOUND_DEFINITIONS).length} sounds`);
  }

  /**
   * Load a single sound file
   */
  private async loadSound(soundId: string, path: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Use getAssetPath to handle different deployment scenarios (itch.io, GitHub Pages, etc.)
      const resolvedPath = getAssetPath(path);
      const response = await fetch(resolvedPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.soundBuffers.set(soundId, audioBuffer);
    } catch (error) {
      console.warn(`Failed to load sound "${soundId}" from ${path}:`, error);
    }
  }

  /**
   * Play a sound
   */
  public play(soundId: string, options?: PlayOptions): void {
    if (!this.initialized || !this.audioContext || this.muted) return;

    // Ensure context is running (user interaction may not have happened yet)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const config = SOUND_DEFINITIONS[soundId];
    if (!config) {
      console.warn(`Unknown sound: ${soundId}`);
      return;
    }

    const buffer = this.soundBuffers.get(soundId);
    if (!buffer) {
      console.warn(`Sound buffer not loaded: ${soundId}`);
      return;
    }

    // Throttle rapid plays
    const now = performance.now();
    const lastPlay = this.lastPlayTime.get(soundId) ?? 0;
    if (now - lastPlay < AUDIO_SETTINGS.MIN_SOUND_INTERVAL * 1000) {
      return;
    }
    this.lastPlayTime.set(soundId, now);

    // Create source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Apply playback rate (pitch)
    if (options?.playbackRate) {
      source.playbackRate.value = options.playbackRate;
    }

    // Create gain node for this sound
    const gainNode = this.audioContext.createGain();
    const baseVolume = config.volume * (options?.volume ?? 1.0);
    gainNode.gain.value = baseVolume;

    // Get category gain
    const categoryGain = this.categoryGains.get(config.category);
    if (!categoryGain) return;

    // Set up audio routing
    if (config.spatial && options?.position) {
      // Spatial audio
      const panner = this.createPanner(options.position, config.falloffDistance ?? 50);
      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(categoryGain);
    } else {
      // Non-spatial audio
      source.connect(gainNode);
      gainNode.connect(categoryGain);
    }

    // Handle loop
    source.loop = options?.loop ?? config.loop ?? false;

    // Start playback
    source.start();

    // Debug log (temporary)
    console.log(`[Audio] Playing: ${soundId}, context state: ${this.audioContext.state}`);
  }

  /**
   * Play a sound with pitch variation (for footsteps, mining, etc.)
   */
  public playWithVariation(soundId: string, options?: PlayOptions): void {
    const pitchVariation =
      AUDIO_SETTINGS.PITCH_VARIATION_MIN +
      Math.random() * (AUDIO_SETTINGS.PITCH_VARIATION_MAX - AUDIO_SETTINGS.PITCH_VARIATION_MIN);

    this.play(soundId, {
      ...options,
      playbackRate: (options?.playbackRate ?? 1.0) * pitchVariation,
    });
  }

  /**
   * Start a looping sound
   */
  public playLoop(soundId: string, loopId: string, options?: PlayOptions): void {
    if (!this.initialized || !this.audioContext || this.muted) return;

    // Ensure context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // If loop already exists and is playing, just update position/volume/pitch
    if (this.activeLoops.has(loopId)) {
      const loop = this.activeLoops.get(loopId)!;
      // Update volume if provided
      if (options?.volume !== undefined) {
        const config = SOUND_DEFINITIONS[loop.soundId];
        loop.gainNode.gain.value = config.volume * options.volume;
      }
      // Update position if provided
      if (loop.pannerNode && options?.position) {
        loop.pannerNode.positionX.value = options.position.x;
        loop.pannerNode.positionY.value = options.position.y;
        loop.pannerNode.positionZ.value = options.position.z;
      }
      // Update playback rate (pitch) if provided
      if (options?.playbackRate !== undefined) {
        loop.source.playbackRate.value = options.playbackRate;
      }
      return;
    }

    const config = SOUND_DEFINITIONS[soundId];
    if (!config) {
      console.warn(`Unknown sound: ${soundId}`);
      return;
    }

    const buffer = this.soundBuffers.get(soundId);
    if (!buffer) return;

    // Create source
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Apply initial playback rate (pitch) if provided
    if (options?.playbackRate) {
      source.playbackRate.value = options.playbackRate;
    }

    // Create gain node
    const gainNode = this.audioContext.createGain();
    const baseVolume = config.volume * (options?.volume ?? 1.0);
    gainNode.gain.value = baseVolume;

    // Get category gain
    const categoryGain = this.categoryGains.get(config.category);
    if (!categoryGain) return;

    // Set up panner if spatial
    let pannerNode: PannerNode | null = null;
    if (config.spatial && options?.position) {
      pannerNode = this.createPanner(options.position, config.falloffDistance ?? 50);
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(categoryGain);
    } else {
      source.connect(gainNode);
      gainNode.connect(categoryGain);
    }

    // Track the loop
    this.activeLoops.set(loopId, {
      source,
      gainNode,
      pannerNode,
      soundId,
    });

    // Start playback
    source.start();
  }

  /**
   * Stop a looping sound
   */
  public stopLoop(loopId: string, fadeOutDuration?: number): void {
    const loop = this.activeLoops.get(loopId);
    if (!loop || !this.audioContext) return;

    const fadeDuration = fadeOutDuration ?? AUDIO_SETTINGS.LOOP_FADE_OUT_DURATION;

    if (fadeDuration > 0) {
      // Fade out
      const now = this.audioContext.currentTime;
      loop.gainNode.gain.setValueAtTime(loop.gainNode.gain.value, now);
      loop.gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);

      // Stop after fade
      setTimeout(() => {
        try {
          loop.source.stop();
        } catch {
          // Already stopped
        }
        this.activeLoops.delete(loopId);
      }, fadeDuration * 1000);
    } else {
      // Immediate stop
      try {
        loop.source.stop();
      } catch {
        // Already stopped
      }
      this.activeLoops.delete(loopId);
    }
  }

  /**
   * Update a loop's volume
   */
  public setLoopVolume(loopId: string, volume: number): void {
    const loop = this.activeLoops.get(loopId);
    if (!loop) return;

    const config = SOUND_DEFINITIONS[loop.soundId];
    if (!config) return;

    loop.gainNode.gain.value = config.volume * volume;
  }

  /**
   * Update a loop's position (for spatial audio)
   */
  public setLoopPosition(loopId: string, position: THREE.Vector3): void {
    const loop = this.activeLoops.get(loopId);
    if (!loop || !loop.pannerNode) return;

    loop.pannerNode.positionX.value = position.x;
    loop.pannerNode.positionY.value = position.y;
    loop.pannerNode.positionZ.value = position.z;
  }

  /**
   * Check if a loop is playing
   */
  public isLoopPlaying(loopId: string): boolean {
    return this.activeLoops.has(loopId);
  }

  /**
   * Stop all active loops
   */
  public stopAllLoops(fadeOut: boolean = true): void {
    for (const loopId of this.activeLoops.keys()) {
      this.stopLoop(loopId, fadeOut ? undefined : 0);
    }
  }

  /**
   * Create a panner node for spatial audio
   */
  private createPanner(position: THREE.Vector3, falloffDistance: number): PannerNode {
    const panner = this.audioContext!.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = falloffDistance;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 1;

    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;

    return panner;
  }

  /**
   * Update the audio listener position (call each frame from camera)
   */
  public setListenerPosition(
    position: THREE.Vector3,
    forward: THREE.Vector3,
    up: THREE.Vector3
  ): void {
    if (!this.audioContext) return;

    this.listenerPosition.copy(position);

    const listener = this.audioContext.listener;

    // Set position
    if (listener.positionX !== undefined) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
    }

    // Set orientation (forward and up vectors)
    if (listener.forwardX !== undefined) {
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = up.x;
      listener.upY.value = up.y;
      listener.upZ.value = up.z;
    }
  }

  /**
   * Get the current listener position
   */
  public getListenerPosition(): THREE.Vector3 {
    return this.listenerPosition.clone();
  }

  // === Volume Control ===

  /**
   * Set master volume
   */
  public setMasterVolume(volume: number): void {
    if (!this.masterGain) return;
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    this.volumes.set(SoundCategory.MASTER, volume);
  }

  /**
   * Get master volume
   */
  public getMasterVolume(): number {
    return this.volumes.get(SoundCategory.MASTER) ?? 1.0;
  }

  /**
   * Set category volume
   */
  public setCategoryVolume(category: SoundCategory, volume: number): void {
    const gainNode = this.categoryGains.get(category);
    if (!gainNode) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    gainNode.gain.value = clampedVolume;
    this.volumes.set(category, clampedVolume);
  }

  /**
   * Get category volume
   */
  public getCategoryVolume(category: SoundCategory): number {
    return this.volumes.get(category) ?? 1.0;
  }

  /**
   * Mute all audio
   */
  public mute(): void {
    if (this.muted) return;
    this.previousMasterVolume = this.getMasterVolume();
    this.setMasterVolume(0);
    this.muted = true;
  }

  /**
   * Unmute all audio
   */
  public unmute(): void {
    if (!this.muted) return;
    this.setMasterVolume(this.previousMasterVolume);
    this.muted = false;
  }

  /**
   * Toggle mute
   */
  public toggleMute(): void {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  /**
   * Check if muted
   */
  public isMuted(): boolean {
    return this.muted;
  }

  // === State ===

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if unlocked (autoplay restriction bypassed)
   */
  public isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.stopAllLoops(false);

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.masterGain = null;
    this.categoryGains.clear();
    this.soundBuffers.clear();
    this.activeLoops.clear();
    this.lastPlayTime.clear();
    this.initialized = false;
    this.unlocked = false;
  }
}

// Export singleton instance
export const AudioManager = AudioManagerSingleton.getInstance();
