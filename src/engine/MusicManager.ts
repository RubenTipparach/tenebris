// Music Manager - Background music system with timed playback
// Tracks time since last song in save file
// Automatically plays random songs after 500-600 seconds of silence

import { MUSIC_TRACKS, MUSIC_SETTINGS } from '../config/AudioConfig';
import { getAssetPath } from '../utils/assetPath';
import { showMusicToast } from '../utils/toast';

/**
 * Music playback state
 */
export interface MusicState {
  /** Timestamp (ms) when a song was last played */
  lastPlayTime: number;
  /** Whether music is enabled */
  enabled: boolean;
  /** Currently playing track ID (null if none) */
  currentTrack: string | null;
}

/**
 * Callback to persist music state to game storage
 */
type PersistCallback = (state: MusicState) => void;

/**
 * MusicManager - Singleton for background music management
 *
 * Features:
 * - Loads and plays background music tracks
 * - Tracks time since last song played (persisted to save file)
 * - Automatically plays random song after configurable delay
 * - Toggle to enable/disable music
 * - Manual "play random song" button support
 */
class MusicManagerClass {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackBuffers: Map<string, AudioBuffer> = new Map();
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;

  private state: MusicState = {
    lastPlayTime: 0,
    enabled: true,
    currentTrack: null,
  };

  private persistCallback: PersistCallback | null = null;
  private initialized: boolean = false;
  private volume: number = MUSIC_SETTINGS.DEFAULT_VOLUME;

  /**
   * Initialize the music manager
   * @param savedState Optional saved state from game storage
   */
  public async init(savedState?: Partial<MusicState>): Promise<void> {
    if (this.initialized) return;

    try {
      // Create audio context
      this.audioContext = new AudioContext();

      // Create master gain node for music volume
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);

      // Restore saved state
      if (savedState) {
        if (savedState.lastPlayTime !== undefined) {
          this.state.lastPlayTime = savedState.lastPlayTime;
        }
        if (savedState.enabled !== undefined) {
          this.state.enabled = savedState.enabled;
        }
      }

      // Preload music tracks
      await this.loadTracks();

      this.initialized = true;
      console.log(`[MusicManager] Initialized with ${this.trackBuffers.size} tracks`);
    } catch (error) {
      console.warn('[MusicManager] Failed to initialize:', error);
    }
  }

  /**
   * Load all music tracks
   */
  private async loadTracks(): Promise<void> {
    if (!this.audioContext) return;

    const loadPromises = Object.entries(MUSIC_TRACKS).map(async ([id, config]) => {
      try {
        const resolvedPath = getAssetPath(config.path);
        const response = await fetch(resolvedPath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.trackBuffers.set(id, audioBuffer);
        console.log(`[MusicManager] Loaded track: ${id}`);
      } catch (error) {
        console.warn(`[MusicManager] Failed to load track "${id}":`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Set callback for persisting music state to game storage
   */
  public setPersistCallback(callback: PersistCallback): void {
    this.persistCallback = callback;
  }

  /**
   * Get current music state for saving
   */
  public getState(): MusicState {
    return { ...this.state };
  }

  /**
   * Play a random music track
   */
  public playRandomSong(): void {
    if (!this.initialized || !this.audioContext || !this.state.enabled) return;

    // Ensure context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Get available tracks (excluding currently playing)
    const availableTracks = Array.from(this.trackBuffers.keys())
      .filter(id => id !== this.state.currentTrack);

    if (availableTracks.length === 0) {
      // If only one track, still play it
      if (this.trackBuffers.size > 0) {
        const onlyTrack = Array.from(this.trackBuffers.keys())[0];
        this.playTrack(onlyTrack);
      }
      return;
    }

    // Pick random track
    const randomIndex = Math.floor(Math.random() * availableTracks.length);
    const trackId = availableTracks[randomIndex];

    this.playTrack(trackId);
  }

  /**
   * Play a specific track by ID
   */
  public playTrack(trackId: string): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const buffer = this.trackBuffers.get(trackId);
    if (!buffer) {
      console.warn(`[MusicManager] Track not found: ${trackId}`);
      return;
    }

    // Stop current track if playing
    this.stopCurrentTrack(false);

    // Ensure context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Create source and gain for this track
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gain = this.audioContext.createGain();
    const trackConfig = MUSIC_TRACKS[trackId];
    gain.gain.value = trackConfig?.volume ?? 1.0;

    // Connect: source -> track gain -> master gain -> destination
    source.connect(gain);
    gain.connect(this.masterGain);

    // Handle track ending
    source.onended = () => {
      if (this.currentSource === source) {
        this.state.currentTrack = null;
        this.currentSource = null;
        this.currentGain = null;
      }
    };

    // Start playback
    source.start();

    this.currentSource = source;
    this.currentGain = gain;
    this.state.currentTrack = trackId;
    this.state.lastPlayTime = Date.now();

    // Persist state
    this.persist();

    // Show toast with track name
    const trackName = trackConfig?.name ?? trackId;
    showMusicToast(trackName);

    console.log(`[MusicManager] Playing track: ${trackId}`);
  }

  /**
   * Stop the currently playing track
   */
  public stopCurrentTrack(updateTimer: boolean = true): void {
    if (this.currentSource) {
      // Capture references before clearing them
      const sourceToStop = this.currentSource;
      const gainToFade = this.currentGain;

      // Clear references immediately so new track can start
      this.currentSource = null;
      this.currentGain = null;
      this.state.currentTrack = null;

      try {
        // Fade out over 500ms
        if (gainToFade && this.audioContext) {
          const now = this.audioContext.currentTime;
          gainToFade.gain.setValueAtTime(gainToFade.gain.value, now);
          gainToFade.gain.linearRampToValueAtTime(0, now + 0.5);

          // Stop the captured source after fade (not this.currentSource which may be new)
          setTimeout(() => {
            try {
              sourceToStop.stop();
            } catch (e) {
              // Ignore if already stopped
            }
          }, 500);
        } else {
          sourceToStop.stop();
        }
      } catch (e) {
        // Ignore if already stopped
      }

      if (updateTimer) {
        this.state.lastPlayTime = Date.now();
        this.persist();
      }
    }
  }

  /**
   * Check if it's time to play a new song and play one if so
   * Call this from the game update loop
   */
  public update(): void {
    if (!this.initialized || !this.state.enabled) return;
    if (this.state.currentTrack !== null) return; // Already playing
    if (this.trackBuffers.size === 0) return; // No tracks loaded

    const timeSinceLastPlay = Date.now() - this.state.lastPlayTime;
    const minDelay = MUSIC_SETTINGS.MIN_DELAY_SECONDS * 1000;
    const maxDelay = MUSIC_SETTINGS.MAX_DELAY_SECONDS * 1000;

    // Random delay between min and max
    const targetDelay = minDelay + Math.random() * (maxDelay - minDelay);

    if (timeSinceLastPlay >= targetDelay) {
      this.playRandomSong();
    }
  }

  /**
   * Set whether music is enabled
   */
  public setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;

    if (!enabled) {
      this.stopCurrentTrack();
    }

    this.persist();
  }

  /**
   * Check if music is enabled
   */
  public isEnabled(): boolean {
    return this.state.enabled;
  }

  /**
   * Check if a track is currently playing
   */
  public isPlaying(): boolean {
    return this.state.currentTrack !== null;
  }

  /**
   * Get the ID of the currently playing track
   */
  public getCurrentTrack(): string | null {
    return this.state.currentTrack;
  }

  /**
   * Set master music volume
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * Get current volume
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * Reset the last play timer (used when manually playing a song)
   */
  public resetTimer(): void {
    this.state.lastPlayTime = Date.now();
    this.persist();
  }

  /**
   * Persist state to game storage
   */
  private persist(): void {
    if (this.persistCallback) {
      this.persistCallback(this.getState());
    }
  }

  /**
   * Get time in seconds until next automatic song (estimate)
   */
  public getTimeUntilNextSong(): number {
    if (!this.state.enabled || this.state.currentTrack !== null) {
      return -1;
    }

    const timeSinceLastPlay = Date.now() - this.state.lastPlayTime;
    const avgDelay = (MUSIC_SETTINGS.MIN_DELAY_SECONDS + MUSIC_SETTINGS.MAX_DELAY_SECONDS) / 2 * 1000;
    const remaining = avgDelay - timeSinceLastPlay;

    return Math.max(0, remaining / 1000);
  }
}

// Export singleton instance
export const MusicManager = new MusicManagerClass();
