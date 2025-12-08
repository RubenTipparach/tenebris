// Loading manager for tracking game initialization progress

export interface LoadingStep {
  name: string;
  weight: number;  // Relative weight for progress calculation
  completed: boolean;
}

class LoadingManagerImpl {
  private steps: Map<string, LoadingStep> = new Map();
  private totalWeight: number = 0;
  private completedWeight: number = 0;
  private onProgressCallbacks: Array<(progress: number, status: string) => void> = [];
  private onCompleteCallbacks: Array<() => void> = [];
  private currentStatus: string = 'Initializing...';

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

  // Update the current status message
  setStatus(status: string): void {
    this.currentStatus = status;
    this.notifyProgress();
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
      statusEl.textContent = this.currentStatus;
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
