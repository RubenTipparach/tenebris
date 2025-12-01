// Worker pool for managing tile mesh generation workers
import type { GeometryArrays, WorkerTileRequest, WorkerTileResponse, TileVertexData } from './TileMeshWorker';

export interface PendingTileWork {
  tileIndex: number;
  resolve: (response: WorkerTileResponse) => void;
  reject: (error: Error) => void;
}

export class TileMeshWorkerPool {
  private workers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private pendingWork: Map<number, PendingTileWork> = new Map(); // tileIndex -> pending work
  private workQueue: WorkerTileRequest[] = [];
  private workerTileMap: Map<Worker, number> = new Map(); // worker -> tileIndex being processed

  constructor(numWorkers: number = navigator.hardwareConcurrency || 4) {
    // Cap at 4 workers to avoid too much overhead
    numWorkers = Math.min(numWorkers, 4);

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(
        new URL('./TileMeshWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent<WorkerTileResponse>) => {
        this.handleWorkerResponse(worker, e.data);
      };

      worker.onerror = (e) => {
        console.error('Worker error:', e);
        const tileIndex = this.workerTileMap.get(worker);
        if (tileIndex !== undefined) {
          const pending = this.pendingWork.get(tileIndex);
          if (pending) {
            pending.reject(new Error('Worker error'));
            this.pendingWork.delete(tileIndex);
          }
          this.workerTileMap.delete(worker);
        }
        this.busyWorkers.delete(worker);
        this.processQueue();
      };

      this.workers.push(worker);
    }
  }

  private handleWorkerResponse(worker: Worker, response: WorkerTileResponse): void {
    const tileIndex = this.workerTileMap.get(worker);
    this.workerTileMap.delete(worker);
    this.busyWorkers.delete(worker);

    if (tileIndex !== undefined) {
      const pending = this.pendingWork.get(tileIndex);
      if (pending) {
        pending.resolve(response);
        this.pendingWork.delete(tileIndex);
      }
    }

    // Process next item in queue
    this.processQueue();
  }

  private processQueue(): void {
    while (this.workQueue.length > 0) {
      const availableWorker = this.workers.find(w => !this.busyWorkers.has(w));
      if (!availableWorker) break;

      const work = this.workQueue.shift()!;

      // Skip if this tile is already being processed or no longer pending
      if (!this.pendingWork.has(work.tileIndex)) continue;

      this.busyWorkers.add(availableWorker);
      this.workerTileMap.set(availableWorker, work.tileIndex);

      // Serialize neighbor blocks for transfer
      const neighborBlocksObj: Record<number, number[]> = {};
      if (work.neighborBlocks) {
        for (const [key, value] of work.neighborBlocks) {
          neighborBlocksObj[key] = value;
        }
      }

      const serializedWork = {
        ...work,
        neighborBlocks: neighborBlocksObj
      };

      availableWorker.postMessage(serializedWork);
    }
  }

  public buildTileAsync(
    tileIndex: number,
    tile: TileVertexData,
    blocks: number[],
    planetCenter: { x: number; y: number; z: number },
    radius: number,
    blockHeight: number,
    seaLevel: number,
    deepThreshold: number,
    maxDepth: number,
    neighborBlocks: Map<number, number[]>
  ): Promise<WorkerTileResponse> {
    // Cancel any existing work for this tile
    this.cancelTile(tileIndex);

    return new Promise((resolve, reject) => {
      const pending: PendingTileWork = { tileIndex, resolve, reject };
      this.pendingWork.set(tileIndex, pending);

      const request: WorkerTileRequest = {
        type: 'buildTile',
        tileIndex,
        tile,
        blocks,
        planetCenter,
        radius,
        blockHeight,
        seaLevel,
        deepThreshold,
        maxDepth,
        neighborBlocks
      };

      this.workQueue.push(request);
      this.processQueue();
    });
  }

  public cancelTile(tileIndex: number): void {
    // Remove from pending work
    this.pendingWork.delete(tileIndex);

    // Remove from queue
    const queueIndex = this.workQueue.findIndex(w => w.tileIndex === tileIndex);
    if (queueIndex >= 0) {
      this.workQueue.splice(queueIndex, 1);
    }
  }

  public cancelAllTiles(): void {
    this.pendingWork.clear();
    this.workQueue.length = 0;
  }

  public getPendingCount(): number {
    return this.pendingWork.size;
  }

  public getQueueLength(): number {
    return this.workQueue.length;
  }

  public dispose(): void {
    this.cancelAllTiles();
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers.length = 0;
    this.busyWorkers.clear();
    this.workerTileMap.clear();
  }
}
