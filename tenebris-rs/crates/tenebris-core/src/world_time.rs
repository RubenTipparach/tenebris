//! Global simulation clock - the single source of "what time is it" for
//! the on-rails orbit + day/night sim.
//!
//! CLAUDE.md (time-compression-on-server-resume) asks for a `world_time`
//! module in `core/` that owns the sim-time field and the central
//! catch-up dispatch so SP and MP share one code path. This is that
//! module. Today it owns the running clock that drives:
//!
//!   - planet rotation (day / night terminator via the sun direction),
//!   - on-rails orbits (each body's apparent sky position over time).
//!
//! The clock is plain elapsed *simulation* seconds since the world epoch.
//! The client advances it each frame by `dt * time_scale` (the scale is a
//! `time.yaml` knob). Persistence of the epoch + catch-up of long-running
//! subsystems (plant growth, populations, ...) plug in here later via a
//! `catch_up(dt)` dispatch; none of those subsystems exist yet, so for now
//! this is just the authoritative clock.

use std::sync::Mutex;

/// Elapsed simulation time in seconds since the world epoch.
static S_SIM_TIME_S: Mutex<f64> = Mutex::new(0.0);

/// Current simulation time in seconds.
pub fn seconds() -> f64 {
    *S_SIM_TIME_S.lock().unwrap()
}

/// Jump the clock to an absolute time (world load / dev time-of-day).
pub fn set_seconds(t: f64) {
    *S_SIM_TIME_S.lock().unwrap() = t.max(0.0);
}

/// Advance the clock by `dt_sim` simulation seconds (already time-scaled
/// by the caller). Negative deltas are ignored so the clock never runs
/// backwards.
pub fn advance(dt_sim: f64) {
    if dt_sim > 0.0 {
        let mut t = S_SIM_TIME_S.lock().unwrap();
        *t += dt_sim;
    }
}

/// Reset to the epoch (new world / test isolation).
pub fn reset() {
    *S_SIM_TIME_S.lock().unwrap() = 0.0;
}

/// Phase in `0.0..1.0` through a cycle of `period_s` at the current time
/// (e.g. fraction of the day). `period_s <= 0` returns 0.
pub fn cycle_fraction(period_s: f64) -> f64 {
    if period_s <= 0.0 {
        return 0.0;
    }
    let f = (seconds() / period_s).rem_euclid(1.0);
    f
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn advance_and_set() {
        reset();
        assert_eq!(seconds(), 0.0);
        advance(2.5);
        advance(1.0);
        assert_eq!(seconds(), 3.5);
        advance(-5.0); // ignored
        assert_eq!(seconds(), 3.5);
        set_seconds(100.0);
        assert_eq!(seconds(), 100.0);
        set_seconds(-9.0); // clamped to 0
        assert_eq!(seconds(), 0.0);
    }

    #[test]
    fn cycle_fraction_wraps() {
        set_seconds(30.0);
        assert!((cycle_fraction(120.0) - 0.25).abs() < 1e-9);
        set_seconds(120.0 + 60.0);
        assert!((cycle_fraction(120.0) - 0.5).abs() < 1e-9);
        assert_eq!(cycle_fraction(0.0), 0.0);
    }
}
