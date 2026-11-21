// Loading manager for tracking game initialization progress

export interface LoadingStep {
  name: string;
  weight: number;  // Relative weight for progress calculation
  completed: boolean;
}

// A step running this long shows its elapsed time; this long, says it looks stuck
const SLOW_STEP_S = 8;
const STUCK_STEP_S = 60;

class LoadingManagerImpl {
  private steps: Map<string, LoadingStep> = new Map();
  private totalWeight: number = 0;
  private completedWeight: number = 0;
  private onProgressCallbacks: Array<(progress: number, status: string) => void> = [];
  private onCompleteCallbacks: Array<() => void> = [];
  private currentStatus: string = 'Initializing...';
  // Stuck detection: when the status last changed, and anything that went
  // wrong (shown under the bar so a stall is never silent)
  private statusSince = performance.now();
  private problems: string[] = [];
  private watchdog: number | null = null;

  // Register a loading step with a weight
  registerStep(name: string, weight: number = 1): void {
    if (this.steps.has(name)) return;

    this.steps.set(name, {
      name,
      weight,
      completed: false
    });
    this.totalWeight += weight;
  }

  // Mark a step as complete
  completeStep(name: string): void {
    const step = this.steps.get(name);
    if (!step || step.completed) return;

    step.completed = true;
    this.completedWeight += step.weight;

    this.notifyProgress();

    // Check if all steps are complete
    if (this.completedWeight >= this.totalWeight) {
      this.notifyComplete();
    }
  }

  // Update partial progress within a step (0-1 range)
  // This allows smoother progress bar updates during long operations
  setStepProgress(name: string, progress: number): void {
    const step = this.steps.get(name);
    if (!step || step.completed) return;

    // Calculate partial weight contribution (progress is 0-1)
    const partialWeight = step.weight * Math.min(1, Math.max(0, progress));

    // Temporarily adjust completed weight for display
    const baseWeight = this.completedWeight;
    this.completedWeight = baseWeight + partialWeight;
    this.notifyProgress();
    this.completedWeight = baseWeight; // Reset to actual completed weight
  }

  // Update the current status message
  setStatus(status: string): void {
    if (status !== this.currentStatus) this.statusSince = performance.now();
    this.currentStatus = status;
    this.startWatchdog();
    this.notifyProgress();
  }

  // Something failed but loading carries on (e.g. a missing texture)
  reportProblem(problem: string): void {
    if (this.problems.length < 5 && !this.problems.includes(problem)) this.problems.push(problem);
    this.updateDOM();
  }

  // Once a second while loading: a step that takes long says so, with how
  // long it has been on it, so a slow load is told apart from a stuck one
  private startWatchdog(): void {
    if (this.watchdog !== null || typeof window === 'undefined') return;
    this.watchdog = window.setInterval(() => {
      if (this.isComplete()) {
        window.clearInterval(this.watchdog!);
        this.watchdog = null;
        return;
      }
      this.updateDOM();
    }, 1000);
  }

  // Get current progress (0-100)
  getProgress(): number {
    if (this.totalWeight === 0) return 0;
    return Math.min(100, Math.round((this.completedWeight / this.totalWeight) * 100));
  }

  // Check if loading is complete
  isComplete(): boolean {
    return this.completedWeight >= this.totalWeight && this.totalWeight > 0;
  }

  // Register a callback for progress updates
  onProgress(callback: (progress: number, status: string) => void): void {
    this.onProgressCallbacks.push(callback);
    // Immediately call with current state
    callback(this.getProgress(), this.currentStatus);
  }

  // Register a callback for when loading completes
  onComplete(callback: () => void): void {
    this.onCompleteCallbacks.push(callback);
    // If already complete, call immediately
    if (this.isComplete()) {
      callback();
    }
  }

  // Update the DOM loading elements
  updateDOM(): void {
    const progressBar = document.getElementById('loading-progress-bar');
    const statusEl = document.getElementById('loading-status');
    const percentageEl = document.getElementById('loading-percentage');

    const progress = this.getProgress();

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    if (statusEl) {
      const secs = Math.floor((performance.now() - this.statusSince) / 1000);
      let text = this.currentStatus;
      if (secs >= SLOW_STEP_S) text += ` (${secs}s - still working)`;
      if (secs >= STUCK_STEP_S) text += ' - this looks stuck; try reloading';
      if (this.problems.length) text += `\n${this.problems.join('\n')}`;
      statusEl.textContent = text;
      statusEl.style.whiteSpace = 'pre-line';
    }
    if (percentageEl) {
      percentageEl.textContent = `${progress}%`;
    }
  }

  // Hide the loading screen with fade animation and show the main menu
  hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      // Remove from DOM after animation completes
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }

    // Show the instructions/main menu after loading is complete
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'block';
    }
  }

  private notifyProgress(): void {
    const progress = this.getProgress();
    this.updateDOM();
    for (const callback of this.onProgressCallbacks) {
      callback(progress, this.currentStatus);
    }
  }

  private notifyComplete(): void {
    for (const callback of this.onCompleteCallbacks) {
      callback();
    }
  }

  // Reset the loading manager (for testing or reloading)
  reset(): void {
    this.steps.clear();
    this.totalWeight = 0;
    this.completedWeight = 0;
    this.currentStatus = 'Initializing...';
  }
}

// Export singleton instance
export const loadingManager = new LoadingManagerImpl();
