import { REACH_RADIUS_M } from '../config/Missions';
import { emitGameEvent } from '../engine/GameEvents';
import * as THREE from 'three';
import { NAVIGATION_CONFIG as C } from '../config/NavigationConfig';
import { CraftingSystem } from '../player/CraftingSystem';
import { CompassBar } from './CompassBar';
import { MapPanel, NavContext } from './MapPanel';
import { Waypoints } from './Waypoints';

/**
 * Maps, compass and waypoints wired into the game (openspec
 * navigation-and-orbits): the Map tab of the E panel, the compass bar, and
 * the player's waypoints. The game calls update() once a frame.
 */
export class Navigation {
  readonly waypoints = new Waypoints();
  private map: MapPanel;
  private compass = new CompassBar();
  private ctx: NavContext;

  constructor(base: Omit<NavContext, 'waypoints'>, crafting: CraftingSystem) {
    this.ctx = { ...base, waypoints: this.waypoints };
    this.map = new MapPanel(this.ctx);
    crafting.registerPanel('map', { show: (el) => this.map.show(el), hide: () => this.map.hide() });
  }

  /** A planet's map from the Map tab's renderer, scaled (MapPanel.mapImage). */
  mapImage(id: string, width: number, height: number): Promise<HTMLCanvasElement | null> {
    return this.map.mapImage(id, width, height);
  }

  update(): void {
    const me = this.ctx.player();
    const planet = me.planetId ? this.ctx.planets.get(me.planetId) : undefined;
    if (!planet) {
      this.compass.update({ up: null, forward: me.forward, altitudeRadii: Infinity, planetRadius: 1, waypoints: [] });
      return;
    }
    const up = me.position.clone().sub(planet.center);
    // Missions: a far waypoint on this world, walked to
    for (const w of this.waypoints.all()) {
      if (!w.far || w.body !== me.planetId) continue;
      const t = planet.getPolyhedron().tiles[w.tile];
      if (t && up.clone().normalize().angleTo(t.center.clone().normalize()) * planet.radius <= REACH_RADIUS_M) {
        this.waypoints.markReached(w.id);
        emitGameEvent('reached');
      }
    }
    const altitudeRadii = (up.length() - planet.radius) / planet.radius;
    const tiles = planet.getPolyhedron().tiles;
    const waypoints = this.waypoints.all()
      .filter(w => w.body === me.planetId && tiles[w.tile])
      .map(w => ({ up: tiles[w.tile].center.clone() as THREE.Vector3, colour: C.WAYPOINT_COLOURS[this.waypoints.indexOf(w.id) % C.WAYPOINT_COLOURS.length] }));
    this.compass.update({ up, forward: me.forward, altitudeRadii, planetRadius: planet.radius, waypoints });
  }
}
