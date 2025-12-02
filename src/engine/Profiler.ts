// Performance profiler for measuring game loop timing
import * as THREE from 'three';

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
  private lastUpdateTime: number = 0;
  private updateInterval: number = 200; // Update display every 200ms

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

  // Start timing a section
  public begin(name: string): void {
    if (!this.enabled) return;

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
    if (!this.enabled) return;

    const section = this.sections.get(name);
    if (!section || section.startTime === 0) return;

    const elapsed = performance.now() - section.startTime;
    section.samples.push(elapsed);
    section.callCount++;

    // Keep only the last N samples
    if (section.samples.length > this.sampleWindow) {
      section.samples.shift();
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
      pointer-events: none;
    `;

    document.body.appendChild(this.displayElement);
  }

  // Update the display
  public updateDisplay(): void {
    if (!this.enabled || !this.displayElement) return;

    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = now;

    const metrics = this.getMetrics();
    if (metrics.length === 0) {
      this.displayElement.innerHTML = '<b>PROFILER</b><br>No data yet...';
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

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          meshCount++;
          if (obj.visible) visibleMeshCount++;
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

    this.displayElement.innerHTML = html;
  }

  // Reset all metrics
  public reset(): void {
    this.sections.clear();
  }
}

// Convenience singleton export
export const profiler = Profiler.getInstance();
