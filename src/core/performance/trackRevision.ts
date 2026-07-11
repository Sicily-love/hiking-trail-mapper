import type { TrackTuple } from '../types.ts';

export type TrackRevision = {
  readonly revision: number;
  readonly signature: string;
  readonly pointCount: number;
};

export type TrackRevisionResult = TrackRevision & {
  readonly changed: boolean;
};

function updateHashes(
  hashes: [number, number],
  byte: number,
): void {
  hashes[0] = Math.imul(hashes[0] ^ byte, 0x01000193) >>> 0;
  hashes[1] = Math.imul(hashes[1] ^ byte, 0x5bd1e995) >>> 0;
  hashes[1] = (hashes[1] ^ (hashes[1] >>> 13)) >>> 0;
}

function updateUint32(hashes: [number, number], value: number): void {
  updateHashes(hashes, value & 0xff);
  updateHashes(hashes, (value >>> 8) & 0xff);
  updateHashes(hashes, (value >>> 16) & 0xff);
  updateHashes(hashes, (value >>> 24) & 0xff);
}

/** Produces a deterministic compact signature over every field of every tuple. */
export function createTrackSignature(track: ReadonlyArray<TrackTuple>): string {
  const hashes: [number, number] = [0x811c9dc5, 0x9747b28c];
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  updateUint32(hashes, track.length);

  for(let pointIndex = 0; pointIndex < track.length; pointIndex++) {
    const point = track[pointIndex];
    for(let fieldIndex = 0; fieldIndex < 6; fieldIndex++) {
      const value = point[fieldIndex];
      if(value === undefined) {
        updateHashes(hashes, 0);
        continue;
      }
      if(value === null) {
        updateHashes(hashes, 1);
        continue;
      }
      if(typeof value !== 'number') {
        throw new TypeError(`track point ${pointIndex} field ${fieldIndex} must be numeric, null, or undefined`);
      }
      updateHashes(hashes, 2);
      view.setFloat64(0, value, true);
      for(let byteIndex = 0; byteIndex < 8; byteIndex++) {
        updateHashes(hashes, view.getUint8(byteIndex));
      }
    }
  }

  const left = hashes[0].toString(16).padStart(8, '0');
  const right = hashes[1].toString(16).padStart(8, '0');
  return `track-v1:${track.length}:${left}${right}`;
}

export function createTrackRevision(
  track: ReadonlyArray<TrackTuple>,
  revision = 0,
): TrackRevision {
  if(!Number.isSafeInteger(revision) || revision < 0) {
    throw new RangeError('revision must be a non-negative safe integer');
  }
  return {
    revision,
    signature: createTrackSignature(track),
    pointCount: track.length,
  };
}

/** Advances revision exactly once when the complete track signature changes. */
export function nextTrackRevision(
  previous: TrackRevision,
  track: ReadonlyArray<TrackTuple>,
): TrackRevisionResult {
  if(!Number.isSafeInteger(previous.revision) || previous.revision < 0) {
    throw new RangeError('previous revision must be a non-negative safe integer');
  }
  const signature = createTrackSignature(track);
  const changed = signature !== previous.signature;
  if(changed && previous.revision === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('track revision overflow');
  }
  return {
    revision: changed ? previous.revision + 1 : previous.revision,
    signature,
    pointCount: track.length,
    changed,
  };
}
