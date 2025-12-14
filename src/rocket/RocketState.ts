// Rocket State Machine
// Manages rocket states and transitions

export enum RocketState {
  DOCKED = 'DOCKED',                     // On launch pad, not boarded
  BOARDED_GROUNDED = 'BOARDED_GROUNDED', // Player in rocket, on ground
  LAUNCHING = 'LAUNCHING',               // Actively thrusting upward from ground
  IN_FLIGHT = 'IN_FLIGHT',               // Flying (in gravity well or space)
  LANDING = 'LANDING',                   // Descending toward surface
  LANDED = 'LANDED',                     // On ground after flight (not at launch pad)
  CRASHED = 'CRASHED',                   // Destroyed
  CAPSULE_EJECTED = 'CAPSULE_EJECTED',   // Only command module remains, rest destroyed/detached
}

// Valid state transitions
const VALID_TRANSITIONS: Record<RocketState, RocketState[]> = {
  [RocketState.DOCKED]: [
    RocketState.BOARDED_GROUNDED,  // Player boards rocket
  ],
  [RocketState.BOARDED_GROUNDED]: [
    RocketState.DOCKED,            // Player exits
    RocketState.LAUNCHING,         // Thrust activated
    RocketState.CAPSULE_EJECTED,   // Emergency eject
  ],
  [RocketState.LAUNCHING]: [
    RocketState.IN_FLIGHT,         // Lifted off
    RocketState.BOARDED_GROUNDED,  // Thrust disabled before liftoff
    RocketState.CRASHED,           // Explosion
    RocketState.CAPSULE_EJECTED,   // Emergency eject
  ],
  [RocketState.IN_FLIGHT]: [
    RocketState.LANDING,           // Descending toward surface
    RocketState.CRASHED,           // Collision or out of fuel crash
    RocketState.CAPSULE_EJECTED,   // Emergency eject
  ],
  [RocketState.LANDING]: [
    RocketState.LANDED,            // Safe touchdown
    RocketState.IN_FLIGHT,         // Aborted landing (thrust up)
    RocketState.CRASHED,           // Impact too fast
    RocketState.CAPSULE_EJECTED,   // Emergency eject
  ],
  [RocketState.LANDED]: [
    RocketState.BOARDED_GROUNDED,  // Still in rocket, can take off again
    RocketState.DOCKED,            // Player exits (becomes "landed rocket" in world)
    RocketState.LAUNCHING,         // Taking off again
    RocketState.CAPSULE_EJECTED,   // Emergency eject (why though?)
  ],
  [RocketState.CRASHED]: [
    // Terminal state - no transitions out
  ],
  [RocketState.CAPSULE_EJECTED]: [
    // Capsule has its own physics, handled separately
    // This is effectively a terminal state for the rocket
  ],
};

// State metadata for UI and behavior
export interface RocketStateInfo {
  displayName: string;
  canThrust: boolean;
  canSteer: boolean;
  canExit: boolean;
  canFuel: boolean;
  showFlightHUD: boolean;
  physicsActive: boolean;
}

export const STATE_INFO: Record<RocketState, RocketStateInfo> = {
  [RocketState.DOCKED]: {
    displayName: 'Docked',
    canThrust: false,
    canSteer: false,
    canExit: false,  // Player not in rocket
    canFuel: false,  // Player not in rocket
    showFlightHUD: false,
    physicsActive: false,
  },
  [RocketState.BOARDED_GROUNDED]: {
    displayName: 'Grounded',
    canThrust: true,
    canSteer: false,  // Locked to surface normal
    canExit: true,
    canFuel: true,
    showFlightHUD: true,
    physicsActive: false,  // Attached to ground
  },
  [RocketState.LAUNCHING]: {
    displayName: 'Launching',
    canThrust: true,
    canSteer: false,  // Locked to surface normal during launch
    canExit: false,   // Too dangerous
    canFuel: false,
    showFlightHUD: true,
    physicsActive: true,
  },
  [RocketState.IN_FLIGHT]: {
    displayName: 'In Flight',
    canThrust: true,
    canSteer: true,
    canExit: false,
    canFuel: false,
    showFlightHUD: true,
    physicsActive: true,
  },
  [RocketState.LANDING]: {
    displayName: 'Landing',
    canThrust: true,
    canSteer: true,
    canExit: false,
    canFuel: false,
    showFlightHUD: true,
    physicsActive: true,
  },
  [RocketState.LANDED]: {
    displayName: 'Landed',
    canThrust: true,
    canSteer: false,  // Locked to surface
    canExit: true,
    canFuel: true,    // Can refuel if fuel source nearby
    showFlightHUD: true,
    physicsActive: false,  // Resting on ground
  },
  [RocketState.CRASHED]: {
    displayName: 'Crashed',
    canThrust: false,
    canSteer: false,
    canExit: false,
    canFuel: false,
    showFlightHUD: false,
    physicsActive: false,
  },
  [RocketState.CAPSULE_EJECTED]: {
    displayName: 'Ejected',
    canThrust: false,
    canSteer: false,
    canExit: false,
    canFuel: false,
    showFlightHUD: true,  // Still show HUD for capsule
    physicsActive: true,   // Capsule falls
  },
};

/**
 * State machine manager for rocket states
 */
export class RocketStateMachine {
  private currentState: RocketState;
  private stateChangeCallbacks: ((from: RocketState, to: RocketState) => void)[] = [];

  constructor(initialState: RocketState = RocketState.DOCKED) {
    this.currentState = initialState;
  }

  /**
   * Get the current state
   */
  public getState(): RocketState {
    return this.currentState;
  }

  /**
   * Get info about the current state
   */
  public getStateInfo(): RocketStateInfo {
    return STATE_INFO[this.currentState];
  }

  /**
   * Check if a transition to the given state is valid
   */
  public canTransitionTo(newState: RocketState): boolean {
    return VALID_TRANSITIONS[this.currentState].includes(newState);
  }

  /**
   * Attempt to transition to a new state
   * Returns true if transition was successful
   */
  public transitionTo(newState: RocketState): boolean {
    if (!this.canTransitionTo(newState)) {
      console.warn(`Invalid rocket state transition: ${this.currentState} -> ${newState}`);
      return false;
    }

    const oldState = this.currentState;
    this.currentState = newState;

    // Notify callbacks
    for (const callback of this.stateChangeCallbacks) {
      callback(oldState, newState);
    }

    console.log(`Rocket state: ${oldState} -> ${newState}`);
    return true;
  }

  /**
   * Force a state change (bypasses validation, use carefully)
   */
  public forceState(newState: RocketState): void {
    const oldState = this.currentState;
    this.currentState = newState;

    for (const callback of this.stateChangeCallbacks) {
      callback(oldState, newState);
    }

    console.log(`Rocket state forced: ${oldState} -> ${newState}`);
  }

  /**
   * Register a callback for state changes
   */
  public onStateChange(callback: (from: RocketState, to: RocketState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Remove a state change callback
   */
  public removeStateChangeCallback(callback: (from: RocketState, to: RocketState) => void): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index >= 0) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Check various state conditions
   */
  public isGrounded(): boolean {
    return this.currentState === RocketState.DOCKED ||
           this.currentState === RocketState.BOARDED_GROUNDED ||
           this.currentState === RocketState.LANDED;
  }

  public isFlying(): boolean {
    return this.currentState === RocketState.LAUNCHING ||
           this.currentState === RocketState.IN_FLIGHT ||
           this.currentState === RocketState.LANDING;
  }

  public isDestroyed(): boolean {
    return this.currentState === RocketState.CRASHED ||
           this.currentState === RocketState.CAPSULE_EJECTED;
  }

  public hasPlayer(): boolean {
    return this.currentState !== RocketState.DOCKED &&
           this.currentState !== RocketState.CRASHED;
  }
}
