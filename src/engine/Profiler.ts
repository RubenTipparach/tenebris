// Performance profiler for measuring game loop timing
import * as THREE from 'three';
import { showToast } from '../utils/toast';

export interface ProfilerMetrics {
  name: string;
  lastTime: number;      // Last frame time in ms
  avgTime: number;       // Rolling average time in ms
  maxTime: number;       // Max time in last window
  minTime: number;       // Min time in last window
  callCount: number;     // Number of calls in last window
}

interface ProfilerSection {
  startTime: number;
  samples: number[];
  callCount: number;
}

export class Profiler {
  private static instance: Profiler;
  private sections: Map<string, ProfilerSection> = new Map();
  private enabled: boolean = false;
  private sampleWindow: number = 60; // Rolling average over 60 frames
  private displayElement: HTMLElement | null = null;
  private statsContainer: HTMLElement | null = null; // Inner container for dynamic stats (doesn't include button)
  private copyButton: HTMLButtonElement | null = null; // Persistent copy button
  private lastUpdateTime: number = 0;
  private updateInterval: number = 200; // Update display every 200ms

  // Spike detection settings
  private spikeLoggingEnabled: boolean = true;
  private frameSpikeThresholdMs: number = 50; // Log frame breakdown if total > 50ms
  private lastFrameStartTime: number = 0;
  private frameSections: Map<string, number> = new Map(); // Section times for current frame

  // One-time heavy operations (shown separately in F3 display)
  private oneTimeOperations: { name: string; time: number; timestamp: number }[] = [];
  private readonly ONE_TIME_DISPLAY_DURATION = 5000; // Show one-time ops for 5 seconds

  private constructor() {}

  public static getInstance(): Profiler {
    if (!Profiler.instance) {
      Profiler.instance = new Profiler();
    }
    return Profiler.instance;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.displayElement) {
      this.displayElement.style.display = enabled ? 'block' : 'none';
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): void {
    this.setEnabled(!this.enabled);
  }

  public setSpikeLogging(enabled: boolean): void {
    this.spikeLoggingEnabled = enabled;
  }

  public setFrameSpikeThreshold(ms: number): void {
    this.frameSpikeThresholdMs = ms;
  }

  // Call at the start of each frame
  public beginFrame(): void {
    this.lastFrameStartTime = performance.now();
    this.frameSections.clear();
  }

  // Call at the end of each frame to check for spikes
  public endFrame(): void {
    if (!this.spikeLoggingEnabled) return;

    const frameTime = performance.now() - this.lastFrameStartTime;
    if (frameTime > this.frameSpikeThresholdMs) {
      // Sort sections by time descending
      const sortedSections = Array.from(this.frameSections.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, time]) => `  ${name}: ${time.toFixed(2)}ms`)
        .join('\n');

      console.warn(
        `[FRAME SPIKE] Total: ${frameTime.toFixed(2)}ms (threshold: ${this.frameSpikeThresholdMs}ms)\n` +
        `Breakdown:\n${sortedSections}`
      );
    }
  }

  // Log a one-time heavy operation (shows in F3 display separately)
  public logOneTimeOperation(name: string, timeMs: number): void {
    this.oneTimeOperations.push({
      name,
      time: timeMs,
      timestamp: performance.now()
    });
    console.log(`[ONE-TIME] ${name}: ${timeMs.toFixed(2)}ms`);
  }

  // Helper to measure and log a one-time operation
  public measureOneTime<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const elapsed = performance.now() - start;
    this.logOneTimeOperation(name, elapsed);
    return result;
  }

  // Async version for promises
  public async measureOneTimeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const elapsed = performance.now() - start;
    this.logOneTimeOperation(name, elapsed);
    return result;
  }

  // Start timing a section
  public begin(name: string): void {
    // Always track for spike detection
    if (!this.sections.has(name)) {
      this.sections.set(name, {
        startTime: 0,
        samples: [],
        callCount: 0,
      });
    }

    const section = this.sections.get(name)!;
    section.startTime = performance.now();
  }

  // End timing a section
  public end(name: string): void {
    const section = this.sections.get(name);
    if (!section || section.startTime === 0) return;

    const elapsed = performance.now() - section.startTime;

    // Track for spike detection (always)
    if (this.spikeLoggingEnabled) {
      const existing = this.frameSections.get(name) ?? 0;
      this.frameSections.set(name, existing + elapsed);
    }

    // Track for display (only when enabled)
    if (this.enabled) {
      section.samples.push(elapsed);
      section.callCount++;

      // Keep only the last N samples
      if (section.samples.length > this.sampleWindow) {
        section.samples.shift();
      }
    }

    section.startTime = 0;
  }

  // Helper to wrap a function with profiling
  public wrap<T>(name: string, fn: () => T): T {
    this.begin(name);
    const result = fn();
    this.end(name);
    return result;
  }

  // Get metrics for all sections
  public getMetrics(): ProfilerMetrics[] {
    const metrics: ProfilerMetrics[] = [];

    for (const [name, section] of this.sections) {
      if (section.samples.length === 0) continue;

      const samples = section.samples;
      const lastTime = samples[samples.length - 1];
      const avgTime = samples.reduce((a, b) => a + b, 0) / samples.length;
      const maxTime = Math.max(...samples);
      const minTime = Math.min(...samples);

      metrics.push({
        name,
        lastTime,
        avgTime,
        maxTime,
        minTime,
        callCount: section.callCount,
      });
    }

    // Sort by average time descending
    metrics.sort((a, b) => b.avgTime - a.avgTime);

    return metrics;
  }

  // Create and attach display overlay
  public createDisplay(): void {
    if (this.displayElement) return;

    this.displayElement = document.createElement('div');
    this.displayElement.id = 'profiler-display';
    this.displayElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      min-width: 280px;
      max-height: 80vh;
      overflow-y: auto;
      display: none;
      pointer-events: auto;
    `;

    // Create inner stats container (this gets updated, not the whole display)
    this.statsContainer = document.createElement('div');
    this.statsContainer.id = 'profiler-stats';
    this.displayElement.appendChild(this.statsContainer);

    // Create persistent copy button (doesn't get replaced on updates)
    const buttonContainer = document.createElement('div');
    buttonContainer.innerHTML = '<span style="color:#888">─────────────────────────────</span>';
    this.copyButton = document.createElement('button');
    this.copyButton.id = 'profiler-copy-btn';
    this.copyButton.textContent = 'Copy to Clipboard';
    this.copyButton.onclick = () => this.copyToClipboard();
    buttonContainer.appendChild(document.createElement('br'));
    buttonContainer.appendChild(this.copyButton);
    this.displayElement.appendChild(buttonContainer);

    document.body.appendChild(this.displayElement);

    // Add copy button styles
    const style = document.createElement('style');
    style.textContent = `
      #profiler-copy-btn {
        background: #333;
        color: #0f0;
        border: 1px solid #0f0;
        padding: 4px 8px;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        cursor: pointer;
        border-radius: 3px;
        margin-top: 8px;
      }
      #profiler-copy-btn:hover {
        background: #0f0;
        color: #000;
      }
      #profiler-copy-btn.copied {
        background: #080;
        border-color: #080;
      }
    `;
    document.head.appendChild(style);
  }

  // Update the display
  public updateDisplay(): void {
    if (!this.enabled || !this.statsContainer) return;

    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = now;

    const metrics = this.getMetrics();
    if (metrics.length === 0) {
      this.statsContainer.innerHTML = '<b>PROFILER</b><br>No data yet...';
      return;
    }

    // Calculate total frame time
    const totalSection = metrics.find(m => m.name === 'Frame Total');
    const totalTime = totalSection?.avgTime ?? 0;

    let html = '<b>PROFILER (F3 to toggle)</b><br>';
    html += '<span style="color:#888">─────────────────────────────</span><br>';

    for (const m of metrics) {
      // Color code based on time (green < 1ms, yellow < 5ms, red > 5ms)
      let color = '#0f0';
      if (m.avgTime > 5) color = '#f44';
      else if (m.avgTime > 1) color = '#ff0';

      // Calculate percentage of frame
      const percent = totalTime > 0 ? (m.avgTime / totalTime * 100).toFixed(0) : '0';

      const avgStr = m.avgTime.toFixed(2).padStart(6);
      const maxStr = m.maxTime.toFixed(2).padStart(6);
      const percentStr = percent.padStart(3);

      html += `<span style="color:${color}">${m.name.padEnd(20)}</span>`;
      html += `<span style="color:#aaa">${avgStr}ms</span>`;
      html += `<span style="color:#666"> max:${maxStr}ms</span>`;
      if (m.name !== 'Frame Total') {
        html += `<span style="color:#888"> ${percentStr}%</span>`;
      }
      html += '<br>';
    }

    // Add GPU memory info if available
    const renderer = (window as unknown as { __gameRenderer?: THREE.WebGLRenderer }).__gameRenderer;
    const scene = (window as unknown as { __gameScene?: THREE.Scene }).__gameScene;

    if (renderer?.info) {
      html += '<span style="color:#888">─────────────────────────────</span><br>';
      html += '<b style="color:#88f">GPU Stats</b><br>';

      // Color code draw calls (green < 100, yellow < 500, red > 500)
      const drawCalls = renderer.info.render.calls;
      let drawColor = '#0f0';
      if (drawCalls > 500) drawColor = '#f44';
      else if (drawCalls > 100) drawColor = '#ff0';

      // Color code triangles (green < 100k, yellow < 500k, red > 500k)
      const triangles = renderer.info.render.triangles;
      let triColor = '#0f0';
      if (triangles > 500000) triColor = '#f44';
      else if (triangles > 100000) triColor = '#ff0';

      html += `<span style="color:${drawColor}">Draw Calls: ${drawCalls}</span><br>`;
      html += `<span style="color:${triColor}">Triangles: ${triangles.toLocaleString()}</span><br>`;
      html += `<span style="color:#88f">Geometries: ${renderer.info.memory.geometries}</span><br>`;
      html += `<span style="color:#88f">Textures: ${renderer.info.memory.textures}</span><br>`;

      // Programs (shaders) can also affect performance
      if (renderer.info.programs) {
        html += `<span style="color:#88f">Shader Programs: ${renderer.info.programs.length}</span><br>`;
      }
    }

    // Scene object counts
    if (scene) {
      let meshCount = 0;
      let visibleMeshCount = 0;
      let groupCount = 0;
      let lightCount = 0;

      // Helper to check if object is truly visible (all ancestors visible too)
      const isActuallyVisible = (obj: THREE.Object3D): boolean => {
        let current: THREE.Object3D | null = obj;
        while (current) {
          if (!current.visible) return false;
          current = current.parent;
        }
        return true;
      };

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          meshCount++;
          if (isActuallyVisible(obj)) visibleMeshCount++;
        }
        if ((obj as THREE.Group).isGroup) groupCount++;
        if ((obj as THREE.Light).isLight) lightCount++;
      });

      html += '<span style="color:#888">─────────────────────────────</span><br>';
      html += '<b style="color:#a8f">Scene Stats</b><br>';
      html += `<span style="color:#a8f">Total Meshes: ${meshCount}</span><br>`;
      html += `<span style="color:#a8f">Visible Meshes: ${visibleMeshCount}</span><br>`;
      html += `<span style="color:#a8f">Groups: ${groupCount}</span><br>`;
      html += `<span style="color:#a8f">Lights: ${lightCount}</span><br>`;
    }

    // Show recent one-time operations (remove expired ones)
    const currentTime = performance.now();
    this.oneTimeOperations = this.oneTimeOperations.filter(
      op => currentTime - op.timestamp < this.ONE_TIME_DISPLAY_DURATION
    );

    if (this.oneTimeOperations.length > 0) {
      html += '<span style="color:#888">─────────────────────────────</span><br>';
      html += '<b style="color:#f80">Recent One-Time Operations</b><br>';

      for (const op of this.oneTimeOperations) {
        const age = ((currentTime - op.timestamp) / 1000).toFixed(1);
        let color = '#f80';
        if (op.time > 100) color = '#f44';
        else if (op.time > 50) color = '#ff0';

        html += `<span style="color:${color}">${op.name.padEnd(20)}</span>`;
        html += `<span style="color:#aaa">${op.time.toFixed(2).padStart(8)}ms</span>`;
        html += `<span style="color:#666"> (${age}s ago)</span><br>`;
      }
    }

    // Update only the stats container, leaving the copy button untouched
    this.statsContainer.innerHTML = html;
  }

  // Generate plain text version of profiler data for clipboard
  private generatePlainText(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    lines.push(`=== TENEBRIS PROFILER DATA ===`);
    lines.push(`Timestamp: ${timestamp}`);
    lines.push('');

    // Metrics
    const totalSection = metrics.find(m => m.name === 'Frame Total');
    const totalTime = totalSection?.avgTime ?? 0;

    lines.push('--- TIMING METRICS ---');
    for (const m of metrics) {
      const percent = totalTime > 0 ? (m.avgTime / totalTime * 100).toFixed(0) : '0';
      lines.push(`${m.name.padEnd(22)} avg: ${m.avgTime.toFixed(2).padStart(6)}ms  max: ${m.maxTime.toFixed(2).padStart(6)}ms  ${percent.padStart(3)}%`);
    }

    // GPU stats
    const renderer = (window as unknown as { __gameRenderer?: THREE.WebGLRenderer }).__gameRenderer;
    const scene = (window as unknown as { __gameScene?: THREE.Scene }).__gameScene;

    if (renderer?.info) {
      lines.push('');
      lines.push('--- GPU STATS ---');
      lines.push(`Draw Calls: ${renderer.info.render.calls}`);
      lines.push(`Triangles: ${renderer.info.render.triangles.toLocaleString()}`);
      lines.push(`Geometries: ${renderer.info.memory.geometries}`);
      lines.push(`Textures: ${renderer.info.memory.textures}`);
      if (renderer.info.programs) {
        lines.push(`Shader Programs: ${renderer.info.programs.length}`);
      }
    }

    // Scene stats
    if (scene) {
      let meshCount = 0;
      let visibleMeshCount = 0;
      let groupCount = 0;
      let lightCount = 0;

      // Helper to check if object is truly visible (all ancestors visible too)
      const isActuallyVisible = (obj: THREE.Object3D): boolean => {
        let current: THREE.Object3D | null = obj;
        while (current) {
          if (!current.visible) return false;
          current = current.parent;
        }
        return true;
      };

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          meshCount++;
          if (isActuallyVisible(obj)) visibleMeshCount++;
        }
        if ((obj as THREE.Group).isGroup) groupCount++;
        if ((obj as THREE.Light).isLight) lightCount++;
      });

      lines.push('');
      lines.push('--- SCENE STATS ---');
      lines.push(`Total Meshes: ${meshCount}`);
      lines.push(`Visible Meshes: ${visibleMeshCount}`);
      lines.push(`Groups: ${groupCount}`);
      lines.push(`Lights: ${lightCount}`);
    }

    // One-time operations
    if (this.oneTimeOperations.length > 0) {
      const currentTime = performance.now();
      lines.push('');
      lines.push('--- RECENT OPERATIONS ---');
      for (const op of this.oneTimeOperations) {
        const age = ((currentTime - op.timestamp) / 1000).toFixed(1);
        lines.push(`${op.name.padEnd(22)} ${op.time.toFixed(2).padStart(8)}ms  (${age}s ago)`);
      }
    }

    lines.push('');
    lines.push('=== END PROFILER DATA ===');

    return lines.join('\n');
  }

  // Copy profiler data to clipboard
  private copyToClipboard(): void {
    const text = this.generatePlainText();
    navigator.clipboard.writeText(text).then(() => {
      showToast('Profiler data copied to clipboard!', { duration: 2000 });
      if (this.copyButton) {
        this.copyButton.textContent = 'Copied!';
        this.copyButton.classList.add('copied');
        setTimeout(() => {
          if (this.copyButton) {
            this.copyButton.textContent = 'Copy to Clipboard';
            this.copyButton.classList.remove('copied');
          }
        }, 2000);
      }
    }).catch(err => {
      console.error('Failed to copy profiler data:', err);
      showToast('Failed to copy - try again', { duration: 2000 });
    });
  }

  // Reset all metrics
  public reset(): void {
    this.sections.clear();
  }
}

// Convenience singleton export
export const profiler = Profiler.getInstance();
