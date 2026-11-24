import { REACH_SET_FAR_M } from '../config/Missions';
import * as THREE from 'three';
import { Planet } from '../planet/Planet';
import { HexBlockType } from '../shared/blockTypes';
import { NAVIGATION_CONFIG as C } from '../config/NavigationConfig';
import { getBodyConfig, GAS_GIANTS, CelestialBodyType, bodyEnvironment } from '../config/SolarSystemConfig';
import { environmentCard } from '../player/Survival';
import { allOrbits, gameTimeS, positionAt } from '../world/Orbits';
import { BlockColours } from './blockColours';
import { compassHeading, fromLatLon, mapUV, V3 } from './compass';
import { Waypoints } from './Waypoints';

/**
 * The Map tab of the E panel (specs world-map, system-map, waypoints):
 * - a planet map: every tile a flat hexagon coloured by its top block,
 *   equirectangular, north up, kept in step with edits, with the players and
 *   waypoints on it; right click sets a waypoint, a click on one removes it;
 * - a system map: every body from above at its live position on its orbit.
 */

export interface NavContext {
  planets: Map<string, Planet>;
  /** The player: the body they're on (null in space), world position, look direction. */
  player(): { planetId: string | null; position: THREE.Vector3; forward: THREE.Vector3 };
  /** Other players online. */
  remotes(): Array<{ name: string; planet: string; position: THREE.Vector3 }>;
  /** Bodies the player has visited (space exploration): ringed on the system map */
  visited?(bodyId: string): boolean;
  waypoints: Waypoints;
}

// ---- one planet's map raster --------------------------------------------

class PlanetRaster {
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private top: Uint16Array | null = null;
  private ground: Uint8Array | null = null;
  private lightFrom: Int32Array = new Int32Array(0);   // each tile's neighbour toward the light
  private centres: Float32Array = new Float32Array(0);
  private polys: Float32Array[] = [];
  private wraps: Uint8Array = new Uint8Array(0);
  private colours: BlockColours;
  ready = false;
  private building: Promise<void> | null = null;
  private stale = false;
  readonly width: number;
  readonly height: number;

  constructor(private planet: Planet) {
    const tiles = planet.getPolyhedron().tiles.length;
    this.width = Math.round(Math.min(C.MAP_MAX_WIDTH, Math.max(C.MAP_MIN_WIDTH, Math.sqrt(tiles) * C.MAP_PX_PER_TILE_ROOT)));
    this.height = this.width / 2;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;
    this.colours = new BlockColours(planet);
    planet.onBlockEdit((tile) => this.onEdit(tile));
  }

  /** Raster px of a direction on the planet. */
  project(dir: V3): { x: number; y: number } {
    const { u, v } = mapUV(dir);
    return { x: u * this.width, y: v * this.height };
  }

  /** The direction under a raster px. */
  unproject(x: number, y: number): V3 {
    const lon = (x / this.width) * 2 * Math.PI - Math.PI;
    const lat = Math.PI / 2 - (y / this.height) * Math.PI;
    return fromLatLon(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat)), lon);
  }

  build(): Promise<void> {
    if (this.building && !this.stale) return this.building;
    this.stale = false;
    this.building = (async () => {
      this.ctx.fillStyle = C.UNKNOWN_TILE_COLOUR;
      this.ctx.fillRect(0, 0, this.width, this.height);
      const { top, ground } = await this.planet.getMapTiles();
      this.top = top;
      this.ground = ground;
      if (!this.polys.length) this.buildPolys();
      this.ctx.fillStyle = C.UNKNOWN_TILE_COLOUR;
      this.ctx.fillRect(0, 0, this.width, this.height);
      for (let i = 0; i < this.polys.length; i++) this.drawTile(i);
      this.ready = true;
    })();
    return this.building;
  }

  private buildPolys(): void {
    const tiles = this.planet.getPolyhedron().tiles;
    this.polys = new Array(tiles.length);
    this.wraps = new Uint8Array(tiles.length);
    for (const tile of tiles) {
      const pts = new Float32Array(tile.vertices.length * 2);
      tile.vertices.forEach((v, k) => {
        const p = this.project(v);
        pts[k * 2] = p.x;
        pts[k * 2 + 1] = p.y;
      });
      // A tile across the antimeridian: shift its west part a world right
      // and draw it at both edges
      let minX = Infinity, maxX = -Infinity;
      for (let k = 0; k < pts.length; k += 2) { minX = Math.min(minX, pts[k]); maxX = Math.max(maxX, pts[k]); }
      if (maxX - minX > this.width / 2) {
        for (let k = 0; k < pts.length; k += 2) if (pts[k] < this.width / 2) pts[k] += this.width;
        this.wraps[tile.index] = 1;
      }
      // A polar tile: its corners go all the way round; fill the cap
      const c = this.project(tile.center);
      if (c.y < this.height * C.MAP_POLAR_SHARE || c.y > this.height * (1 - C.MAP_POLAR_SHARE)) {
        const edge = c.y < this.height / 2 ? 0 : this.height;
        let far = c.y;
        for (let k = 1; k < pts.length; k += 2) far = edge === 0 ? Math.max(far, pts[k]) : Math.min(far, pts[k]);
        this.polys[tile.index] = new Float32Array([0, edge, this.width, edge, this.width, far, 0, far]);
        this.wraps[tile.index] = 2;
        continue;
      }
      this.polys[tile.index] = pts;
    }
    // each tile's neighbour toward the light (up-left on the map), for the hillshade
    this.centres = new Float32Array(tiles.length * 2);
    for (const tile of tiles) {
      const p = this.project(tile.center);
      this.centres[tile.index * 2] = p.x;
      this.centres[tile.index * 2 + 1] = p.y;
    }
    this.lightFrom = new Int32Array(tiles.length).fill(-1);
    for (const tile of tiles) {
      let best = -1, bestDot = 0;
      const cx = this.centres[tile.index * 2], cy = this.centres[tile.index * 2 + 1];
      for (const n of tile.neighbors) {
        let dx = this.centres[n * 2] - cx;
        const dy = this.centres[n * 2 + 1] - cy;
        if (dx > this.width / 2) dx -= this.width; else if (dx < -this.width / 2) dx += this.width;
        const d = (-dx - dy) / (Math.hypot(dx, dy) || 1);   // toward up-left
        if (d > bestDot) { bestDot = d; best = n; }
      }
      this.lightFrom[tile.index] = best;
    }
  }

  private drawTile(i: number): void {
    const pts = this.polys[i];
    if (!pts || !this.top) return;
    const ctx = this.ctx;
    ctx.fillStyle = this.shaded(this.colours.colourOf(this.top[i]), i);
    const shifts = this.wraps[i] === 1 ? [0, -this.width] : [0];
    for (const dx of shifts) {
      ctx.beginPath();
      ctx.moveTo(pts[0] + dx, pts[1]);
      for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k] + dx, pts[k + 1]);
      ctx.closePath();
      ctx.fill();
      // closes the anti-aliased hairline between neighbours: no cell edges
      if (this.wraps[i] !== 2 && C.TILE_SEAM_PX > 0) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = C.TILE_SEAM_PX;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }
  }

  /**
   * A tile's colour with relief: brighter the higher its ground stands over
   * sea level, darker the deeper the water over it, and lit or shaded by its
   * rise toward the light (its neighbour up-left on the map).
   */
  private shaded(hex: string, i: number): string {
    if (!this.ground || !this.top || this.top[i] === 0) return hex;
    const sea = this.planet.getSeaLevelDepth();
    const h = this.ground[i];
    let k = 1;
    if (this.top[i] === HexBlockType.WATER) k -= Math.min(C.RELIEF_MAX_DOWN, Math.max(0, sea - h) * C.RELIEF_PER_BLOCK_DOWN);
    else k += Math.min(C.RELIEF_MAX_UP, Math.max(0, h - sea) * C.RELIEF_PER_BLOCK_UP);
    const n = this.lightFrom[i];
    if (n >= 0) {
      const rise = h - this.ground[n];
      k += Math.max(-C.HILLSHADE_MAX, Math.min(C.HILLSHADE_MAX, rise * C.HILLSHADE_PER_BLOCK));
    }
    const v = parseInt(hex.slice(1), 16);
    const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((v >> s) & 255) * k)));
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }

  private onEdit(tile: number): void {
    if (!this.top) return;
    if (this.planet.isTileLoaded(tile)) {
      const next = this.planet.topBlockOf(tile);
      const ground = this.planet.groundDepthOf(tile);
      if (next !== this.top[tile] || (this.ground && ground !== this.ground[tile])) {
        this.top[tile] = next;
        if (this.ground) this.ground[tile] = ground;
        // its shade and its neighbours' (their slope toward it) change
        this.drawTile(tile);
        for (const n of this.planet.getTileNeighbors(tile)) if (this.lightFrom[n] === tile) this.drawTile(n);
      }
    } else {
      // an edit on terrain that isn't loaded (another player's): re-map on next look
      this.stale = true;
    }
  }

  needsRebuild(): boolean {
    return this.stale;
  }
}

// ---- the panel -------------------------------------------------------------

type Mode = { kind: 'planet'; id: string } | { kind: 'system' };

export class MapPanel {
  private root: HTMLElement | null = null;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private select!: HTMLSelectElement;
  private status!: HTMLElement;
  private rasters = new Map<string, PlanetRaster>();
  private mode: Mode = { kind: 'system' };
  private frame: number | null = null;
  // view: zoom and the centre of the view, in map units (raster px, or
  // world units for the system map)
  private zoom = 1;
  private centre = { x: 0, y: 0 };
  private drag: { x: number; y: number; cx: number; cy: number; moved: number } | null = null;

  constructor(private nav: NavContext) {}

  /** Show the map in its tab container: the player's planet, else the system. */
  show(el: HTMLElement): void {
    if (!this.root) this.build(el);
    const here = this.nav.player().planetId;
    this.setMode(here && this.nav.planets.has(here) ? { kind: 'planet', id: here } : { kind: 'system' });
    const tick = () => { this.draw(); this.frame = requestAnimationFrame(tick); };
    if (this.frame === null) this.frame = requestAnimationFrame(tick);
  }

  hide(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private build(el: HTMLElement): void {
    injectStyle();
    el.innerHTML = `
      <div class="map-bar">
        <select class="map-body" aria-label="World"></select>
        <button class="map-system">Solar system</button>
        <span class="map-status"></span>
      </div>
      <canvas class="map-canvas"></canvas>`;
    this.root = el;
    this.canvas = el.querySelector('.map-canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
    this.select = el.querySelector('.map-body')!;
    this.status = el.querySelector('.map-status')!;
    for (const id of this.nav.planets.keys()) {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = getBodyConfig(id)?.name ?? id;
      this.select.appendChild(o);
    }
    this.select.addEventListener('change', () => this.setMode({ kind: 'planet', id: this.select.value }));
    el.querySelector('.map-system')!.addEventListener('click', () => this.setMode({ kind: 'system' }));
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onRightClick(e); });
    // System map: hovering a body names it and its environment (space-exploration)
    c.addEventListener('mousemove', (e) => {
      if (this.mode.kind !== 'system') { c.title = ''; return; }
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const hit = this.systemHits.filter(h => Math.hypot(h.x - x, h.y - y) <= h.r + C.WAYPOINT_HIT_PX / 2).sort((a, b) => a.r - b.r)[0];
      if (!hit) { c.title = ''; return; }
      const name = getBodyConfig(hit.id)?.name ?? GAS_GIANTS.find(g => g.id === hit.id)?.name ?? hit.id;
      const visited = this.nav.visited?.(hit.id) ? ' (visited)' : '';
      c.title = `${name}${visited} - ${environmentCard(bodyEnvironment(hit.id))}`;
    });
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.drag = { x: e.clientX, y: e.clientY, cx: this.centre.x, cy: this.centre.y, moved: 0 };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      this.drag.moved = Math.max(this.drag.moved, Math.hypot(dx, dy));
      const s = this.scale();
      this.centre.x = this.drag.cx - dx / s;
      this.centre.y = this.drag.cy - dy / s;
    });
    c.addEventListener('pointerup', (e) => {
      const d = this.drag;
      this.drag = null;
      if (d && d.moved < C.CLICK_SLOP_PX) this.onClick(e);
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const before = this.toMap(e);
      const lo = this.mode.kind === 'system' ? C.SYSTEM_MIN_ZOOM : C.MAP_MIN_ZOOM;
      const hi = this.mode.kind === 'system' ? C.SYSTEM_MAX_ZOOM : C.MAP_MAX_ZOOM;
      this.zoom = Math.max(lo, Math.min(hi, this.zoom * (e.deltaY < 0 ? C.ZOOM_STEP : 1 / C.ZOOM_STEP)));
      const after = this.toMap(e);
      this.centre.x += before.x - after.x;
      this.centre.y += before.y - after.y;
    }, { passive: false });
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.zoom = 1;
    if (mode.kind === 'planet') {
      this.select.value = mode.id;
      const r = this.raster(mode.id);
      this.centre = { x: r.width / 2, y: r.height / 2 };
      // centre on the player when they're on it
      const p = this.nav.player();
      if (p.planetId === mode.id) {
        const planet = this.nav.planets.get(mode.id)!;
        this.centre = r.project(p.position.clone().sub(planet.center));
        this.zoom = C.MAP_START_ZOOM;
      }
      if (!r.ready || r.needsRebuild()) {
        this.status.textContent = 'Mapping...';
        r.build().then(() => { if (this.mode.kind === 'planet' && this.mode.id === mode.id) this.status.textContent = HINT; });
      } else {
        this.status.textContent = HINT;
      }
    } else {
      this.select.value = '';
      this.centre = { x: 0, y: 0 };
      this.status.textContent = 'Click a world to open its map';
    }
  }

  /**
   * A planet's map - the raster this tab shows, built if it isn't yet -
   * scaled to `width` x `height` (the admin portal's map upload, openspec
   * admin-monitor). Null for a body that isn't a planet here.
   */
  async mapImage(id: string, width: number, height: number): Promise<HTMLCanvasElement | null> {
    if (!this.nav.planets.has(id)) return null;
    const r = this.raster(id);
    if (!r.ready || r.needsRebuild()) await r.build();
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    c.getContext('2d')!.drawImage(r.canvas, 0, 0, width, height);
    return c;
  }

  private raster(id: string): PlanetRaster {
    let r = this.rasters.get(id);
    if (!r) {
      r = new PlanetRaster(this.nav.planets.get(id)!);
      this.rasters.set(id, r);
    }
    return r;
  }

  // Screen px per map unit
  private scale(): number {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.mode.kind === 'planet') {
      const r = this.raster(this.mode.id);
      return Math.min(w / r.width, h / r.height) * this.zoom;
    }
    return (Math.min(w, h) * (1 - 2 * C.SYSTEM_FIT_MARGIN)) / (2 * systemExtent()) * this.zoom;
  }

  private toScreen(x: number, y: number): { x: number; y: number } {
    const s = this.scale();
    return { x: this.canvas.clientWidth / 2 + (x - this.centre.x) * s, y: this.canvas.clientHeight / 2 + (y - this.centre.y) * s };
  }

  private toMap(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const s = this.scale();
    return { x: this.centre.x + (e.clientX - rect.left - rect.width / 2) / s, y: this.centre.y + (e.clientY - rect.top - rect.height / 2) / s };
  }

  // ---- drawing ----

  private draw(): void {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, w, h);
    if (this.mode.kind === 'planet') this.drawPlanet(this.mode.id);
    else this.drawSystem();
  }

  private drawPlanet(id: string): void {
    const ctx = this.ctx;
    const r = this.raster(id);
    const planet = this.nav.planets.get(id)!;
    const s = this.scale();
    // wrap east-west: draw the raster at its neighbours too
    const o = this.toScreen(0, 0);
    ctx.imageSmoothingEnabled = false;
    for (const k of [-1, 0, 1]) ctx.drawImage(r.canvas, o.x + k * r.width * s, o.y, r.width * s, r.height * s);

    const at = (world: THREE.Vector3) => {
      const p = r.project(world.clone().sub(planet.center));
      // the copy nearest the view centre
      while (p.x - this.centre.x > r.width / 2) p.x -= r.width;
      while (this.centre.x - p.x > r.width / 2) p.x += r.width;
      return this.toScreen(p.x, p.y);
    };
    // waypoints
    for (const wp of this.nav.waypoints.all()) {
      if (wp.body !== id) continue;
      const tile = planet.getPolyhedron().tiles[wp.tile];
      if (!tile) continue;
      const p = at(tile.center.clone().add(planet.center));
      drawWaypoint(ctx, p.x, p.y, this.nav.waypoints.indexOf(wp.id));
    }
    // other players
    for (const rp of this.nav.remotes()) {
      if (rp.planet !== id) continue;
      const p = at(rp.position);
      drawDot(ctx, p.x, p.y, '#ffffff', rp.name);
    }
    // the player, an arrow along their heading
    const me = this.nav.player();
    if (me.planetId === id) {
      const up = me.position.clone().sub(planet.center);
      const p = at(me.position);
      drawArrow(ctx, p.x, p.y, compassHeading(up, me.forward));
    }
  }

  private drawSystem(): void {
    const ctx = this.ctx;
    const t = gameTimeS();
    const s = this.scale();
    const orbits = allOrbits();
    const pos = new Map<string, { x: number; y: number }>();
    // top-down from north (+Y): screen right = +X, screen up = -Z
    for (const id of orbits.keys()) {
      const p = positionAt(id, t);
      pos.set(id, { x: p.x, y: p.z });
    }
    // orbit paths
    ctx.lineWidth = 1;
    for (const o of orbits.values()) {
      if (!o.parent || !Number.isFinite(o.periodS)) continue;
      const c = this.toScreen(pos.get(o.parent)!.x, pos.get(o.parent)!.y);
      if (o.radius * s < 2) continue;
      ctx.strokeStyle = o.parent === 'sun' ? 'rgba(160,180,210,0.22)' : 'rgba(160,180,210,0.14)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, o.radius * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    // bodies
    const hits: Array<{ id: string; x: number; y: number; r: number }> = [];
    for (const [id, p] of pos) {
      const cfg = getBodyConfig(id);
      const giant = GAS_GIANTS.find(g => g.id === id);
      const radius = cfg?.radius ?? giant?.radius ?? 0;
      const q = this.toScreen(p.x, p.y);
      const rr = Math.max(C.SYSTEM_MIN_BODY_PX, radius * s);
      ctx.fillStyle = cfg?.visual?.distantColor ?? (id === 'sun' ? '#ffec27' : giant ? '#c8a070' : '#9aa4b2');
      ctx.beginPath();
      ctx.arc(q.x, q.y, rr, 0, Math.PI * 2);
      ctx.fill();
      if (this.nav.visited?.(id)) {
        // surveyed: a cyan ring round the body
        ctx.strokeStyle = C.VISITED_RING_COLOR;
        ctx.lineWidth = C.VISITED_RING_W;
        ctx.beginPath();
        ctx.arc(q.x, q.y, rr + C.VISITED_RING_GAP, 0, Math.PI * 2);
        ctx.stroke();
      }
      hits.push({ id, x: q.x, y: q.y, r: rr });
      const o = orbits.get(id)!;
      const isMoon = o.parent && o.parent !== 'sun';
      const spacing = isMoon ? o.radius * s : Infinity;
      if (!isMoon || spacing >= C.SYSTEM_MOON_LABEL_PX) {
        ctx.fillStyle = '#c8d2e0';
        ctx.font = '11px monospace';
        ctx.fillText(cfg?.name ?? giant?.name ?? id, q.x + rr + 3, q.y + 4);
      }
    }
    this.systemHits = hits;
    // waypoints beside their bodies
    for (const wp of this.nav.waypoints.all()) {
      const p = pos.get(wp.body);
      if (!p) continue;
      const q = this.toScreen(p.x, p.y);
      // side by side above their body
      const k = this.nav.waypoints.indexOf(wp.id);
      drawWaypoint(ctx, q.x + (k - 1.5) * C.WAYPOINT_MARKER_PX * 2.2, q.y - C.WAYPOINT_MARKER_PX * 2.5, k);
    }
    // players: their body's live position plus their offset from it
    const live = (planetId: string | null, world: THREE.Vector3) => {
      const planet = planetId ? this.nav.planets.get(planetId) : null;
      if (!planet) return this.toScreen(world.x, world.z);
      const bp = pos.get(planetId!) ?? { x: planet.center.x, y: planet.center.z };
      return this.toScreen(bp.x + world.x - planet.center.x, bp.y + world.z - planet.center.z);
    };
    for (const rp of this.nav.remotes()) {
      const q = live(rp.planet, rp.position);
      drawDot(ctx, q.x, q.y, '#ffffff', rp.name);
    }
    const me = this.nav.player();
    const q = live(me.planetId ?? nearestPlanet(this.nav.planets, me.position), me.position);
    drawArrow(ctx, q.x, q.y, null);
  }

  private systemHits: Array<{ id: string; x: number; y: number; r: number }> = [];

  // ---- clicks ----

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (this.mode.kind === 'system') {
      // the smallest body under the pointer (a moon over its planet)
      const hit = this.systemHits.filter(h => Math.hypot(h.x - x, h.y - y) <= h.r + C.WAYPOINT_HIT_PX / 2)
        .sort((a, b) => a.r - b.r)[0];
      if (hit && this.nav.planets.has(hit.id)) this.setMode({ kind: 'planet', id: hit.id });
      return;
    }
    const wp = this.waypointAt(x, y);
    if (wp) this.nav.waypoints.remove(wp);
  }

  private onRightClick(e: MouseEvent): void {
    if (this.mode.kind !== 'planet') return;
    const rect = this.canvas.getBoundingClientRect();
    const near = this.waypointAt(e.clientX - rect.left, e.clientY - rect.top);
    if (near) { this.nav.waypoints.remove(near); return; }
    const r = this.raster(this.mode.id);
    const m = this.toMap(e);
    const x = ((m.x % r.width) + r.width) % r.width;
    if (m.y < 0 || m.y > r.height) return;
    const planet = this.nav.planets.get(this.mode.id)!;
    const dir = r.unproject(x, m.y);
    const tile = planet.getTileAtPoint(new THREE.Vector3(dir.x, dir.y, dir.z).multiplyScalar(planet.radius).add(planet.center));
    if (!tile) return;
    // Missions count reaching a waypoint set far away (PBD G3): far if on
    // another world, or REACH_SET_FAR_M or more over the surface from here
    const me = this.nav.player();
    let far = me.planetId !== this.mode.id;
    if (!far) {
      const a = me.position.clone().sub(planet.center).normalize();
      far = a.angleTo(tile.center.clone().normalize()) * planet.radius >= REACH_SET_FAR_M;
    }
    this.nav.waypoints.add(this.mode.id, tile.index, far);
  }

  private waypointAt(x: number, y: number): string | null {
    if (this.mode.kind !== 'planet') return null;
    const id = this.mode.id;
    const planet = this.nav.planets.get(id)!;
    const r = this.raster(id);
    for (const wp of this.nav.waypoints.all()) {
      if (wp.body !== id) continue;
      const tile = planet.getPolyhedron().tiles[wp.tile];
      if (!tile) continue;
      const p = r.project(tile.center);
      while (p.x - this.centre.x > r.width / 2) p.x -= r.width;
      while (this.centre.x - p.x > r.width / 2) p.x += r.width;
      const q = this.toScreen(p.x, p.y);
      if (Math.hypot(q.x - x, q.y - y) <= C.WAYPOINT_HIT_PX) return wp.id;
    }
    return null;
  }
}

const HINT = 'Right-click: set a waypoint (up to 4). Click one: remove it. Drag: pan. Wheel: zoom';

// ---- helpers ---------------------------------------------------------------

let extent = 0;
// Half the system's width: the farthest body from the Sun plus its orbit
function systemExtent(): number {
  if (extent) return extent;
  for (const o of allOrbits().values()) {
    if (o.parent !== 'sun') continue;
    extent = Math.max(extent, o.radius);
  }
  for (const o of allOrbits().values()) {
    if (o.parent && o.parent !== 'sun') {
      const parent = allOrbits().get(o.parent);
      if (parent?.parent === 'sun') extent = Math.max(extent, parent.radius + o.radius);
    }
  }
  return extent || 1;
}

function nearestPlanet(planets: Map<string, Planet>, at: THREE.Vector3): string | null {
  let best: string | null = null, d = Infinity;
  for (const [id, p] of planets) {
    const dd = p.center.distanceTo(at) - p.radius;
    if (dd < d) { d = dd; best = id; }
  }
  return best;
}

function drawWaypoint(ctx: CanvasRenderingContext2D, x: number, y: number, index: number): void {
  const r = C.WAYPOINT_MARKER_PX;
  ctx.fillStyle = C.WAYPOINT_COLOURS[Math.max(0, index) % C.WAYPOINT_COLOURS.length];
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(index + 1), x, y + 3.5);
  ctx.textAlign = 'start';
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, colour: string, name: string): void {
  ctx.fillStyle = colour;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.arc(x, y, C.PLAYER_MARKER_PX / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = '11px monospace';
  ctx.fillText(name, x + C.PLAYER_MARKER_PX, y + 4);
}

// The player: an arrow along the heading (degrees from north, screen up),
// or a ring when there is no heading (the system map)
function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, headingDeg: number | null): void {
  const r = C.PLAYER_MARKER_PX;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#3ee0ff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  if (headingDeg === null) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.rotate((headingDeg * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3); ctx.lineTo(r * 0.8, r); ctx.lineTo(0, r * 0.45); ctx.lineTo(-r * 0.8, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function injectStyle(): void {
  if (document.getElementById('map-panel-style')) return;
  const style = document.createElement('style');
  style.id = 'map-panel-style';
  style.textContent = `
    #panel-map { display: flex; flex-direction: column; gap: 8px; }
    #panel-map[hidden] { display: none; }
    #panel-map .map-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    #panel-map select, #panel-map button { background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 6px 10px; font-family: var(--game-font); font-size: 14px; cursor: pointer; }
    #panel-map button:hover { border-color: #4CAF50; }
    #panel-map .map-status { color: #9fb3c8; font-size: 12px; }
    #panel-map .map-canvas { flex: 1; width: 100%; min-height: 0; border: 1px solid #444; border-radius: 4px; cursor: grab; touch-action: none; }
  `;
  document.head.appendChild(style);
}

// Not every body in the orbit list is in the config (the gas giants): a
// body's type, for code that wants it
export function bodyTypeOf(id: string): CelestialBodyType | 'gasGiant' | undefined {
  return getBodyConfig(id)?.type ?? (GAS_GIANTS.some(g => g.id === id) ? 'gasGiant' : undefined);
}
