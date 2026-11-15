"use client";
import { useRef, useCallback } from "react";
import * as THREE from "three";

export type Axis = "x" | "y" | "z";
export type Direction = "+" | "-";

// A single bone rotation step: boneName, "rotation", axis, target, direction
// Using a looser tuple type so literal arrays in animation files are assignable
export type BoneRotationStep = [string, string, string, number, string];

// One animation frame = array of bone steps forming a complete pose
export type AnimFrame = BoneRotationStep[];

export interface AvatarAnimatorRef {
  frameQueue: AnimFrame[];
  pending: boolean;
  speed: number;
  pause: number;
  bones: Record<string, THREE.Bone>;
}

export function useAvatarAnimator() {
  const stateRef = useRef<AvatarAnimatorRef>({
    frameQueue: [],
    pending: false,
    speed: 0.05,
    pause: 350,
    bones: {},
  });

  const animate = useCallback(() => {
    const state = stateRef.current;
    if (state.frameQueue.length === 0) {
      state.pending = false;
      return;
    }

    const currentFrame = state.frameQueue[0];
    let frameComplete = true;

    for (const step of currentFrame) {
      const boneName = step[0];
      const axis = step[2] as Axis;
      const target = step[3] as number;
      const direction = step[4];
      const bone = state.bones[boneName];
      if (!bone) continue;

      const diff = Math.abs(target - bone.rotation[axis]);
      if (diff > 0.01) {
        frameComplete = false;
        bone.rotation[axis] += direction === "+" ? state.speed : -state.speed;
        if (direction === "+" && bone.rotation[axis] > target) bone.rotation[axis] = target;
        if (direction === "-" && bone.rotation[axis] < target) bone.rotation[axis] = target;
      }
    }

    if (frameComplete) {
      state.frameQueue.shift();
      if (state.frameQueue.length > 0) {
        setTimeout(() => {
          if (state.pending) requestAnimationFrame(animate);
        }, state.pause);
      } else {
        state.pending = false;
      }
      return;
    }

    requestAnimationFrame(animate);
  }, []);

  const initAnimator = useCallback((bones: Record<string, THREE.Bone>) => {
    stateRef.current.bones = bones;
    stateRef.current.pending = false;
    stateRef.current.frameQueue = [];
  }, []);

  /** Enqueue all frames for one letter sign (sign pose + return-to-neutral) */
  const enqueueLetterFrames = useCallback(
    (frames: AnimFrame[]) => {
      const state = stateRef.current;
      state.frameQueue.push(...frames);
      if (!state.pending) {
        state.pending = true;
        requestAnimationFrame(animate);
      }
    },
    [animate]
  );

  const clearQueue = useCallback(() => {
    stateRef.current.frameQueue = [];
    stateRef.current.pending = false;
  }, []);

  return { stateRef, initAnimator, enqueueLetterFrames, clearQueue };
}
