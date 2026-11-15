import * as THREE from 'three';

export type Axis = 'x' | 'y' | 'z';
export type Direction = '+' | '-';

// One step in an animation: rotate a specific bone toward a target value
export type BoneRotationStep = [
  boneName: string,
  property: 'rotation',
  axis: Axis,
  targetValue: number,
  direction: Direction
];

export type AnimFrame = BoneRotationStep[];

export interface AnimatorState {
  animations: AnimFrame[][];  // queue of pending animation frame groups
  characters: string[];       // history of characters signed (for dedup prevention)
  pending: boolean;           // whether the animate loop is running
  speed: number;             // interpolation step per frame (default: 0.05)
  pause: number;             // ms between signs (default: 300)
  bones: Record<string, THREE.Bone>;  // bone name → THREE.Bone from loaded GLB
  animate: () => void;        // kick off the animation loop
}

// One word segment from the ISL video timeline
export type ISLWordSegment = {
  word: string;           // cleaned word (uppercase, no punctuation)
  displayWord: string;    // original casing for display
  startSec: number;
  endSec: number;
  sentenceText: string;   // the full sentence this word belongs to
  wordIndexInSentence: number;  // 0-indexed position within sentence words array
  totalWordsInSentence: number;
};
