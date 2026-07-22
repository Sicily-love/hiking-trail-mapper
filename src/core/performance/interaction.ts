export type StudioPointerType = 'mouse' | 'touch' | 'pen';

export interface PointerTapSample {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elapsedMs: number;
  pointerType: StudioPointerType;
}

export interface ResetTransitionInput {
  gesture: boolean;
  currentZoom: number;
  targetZoom: number;
  reducedMotion?: boolean;
}

export interface ResetTransitionPlan {
  animate: boolean;
  duration: number;
  easeLinearity: number;
}

export function pointerTapThreshold(pointerType: StudioPointerType): {
  maxMovementPx: number;
  maxDurationMs: number;
} {
  if(pointerType === 'touch') return {maxMovementPx:18, maxDurationMs:900};
  if(pointerType === 'pen') return {maxMovementPx:12, maxDurationMs:800};
  return {maxMovementPx:8, maxDurationMs:700};
}

export function isPointerTap(sample: PointerTapSample): boolean {
  const policy = pointerTapThreshold(sample.pointerType);
  const dx = sample.endX - sample.startX;
  const dy = sample.endY - sample.startY;
  return sample.elapsedMs >= 0
    && sample.elapsedMs <= policy.maxDurationMs
    && dx * dx + dy * dy <= policy.maxMovementPx * policy.maxMovementPx;
}

export function interactionHitTargetSize(pointerType: StudioPointerType): number {
  if(pointerType === 'touch') return 44;
  if(pointerType === 'pen') return 36;
  return 24;
}

export function planResetTransition(input: ResetTransitionInput): ResetTransitionPlan {
  const zoomDelta = Math.abs(input.targetZoom - input.currentZoom);
  const animate = input.gesture && !input.reducedMotion && zoomDelta > 0.05 && zoomDelta <= 3.5;
  if(!animate) return {animate:false, duration:0, easeLinearity:0.4};
  return {
    animate:true,
    duration:Math.min(0.3, 0.16 + zoomDelta * 0.035),
    easeLinearity:0.4,
  };
}
