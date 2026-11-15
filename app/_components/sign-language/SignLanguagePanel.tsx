"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { useAvatarAnimator } from "./useAvatarAnimator";
import { useSignSync } from "./useSignSync";
import type { ISLWordSegment } from "@/lib/sign-language/types";

const AvatarScene = dynamic(
  () => import("./AvatarScene").then((m) => ({ default: m.AvatarScene })),
  { ssr: false }
);

export default function SignLanguagePanel({
  videoRef,
  wordSegments,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  wordSegments: ISLWordSegment[];
}) {
  const [loaded, setLoaded] = useState(false);
  const { stateRef, initAnimator, enqueueLetterFrames, clearQueue } = useAvatarAnimator();

  useSignSync({
    videoRef,
    wordSegments,
    animatorRef: stateRef,
    enqueueLetterFrames,
    clearQueue,
  });

  return (
    <div className="flex flex-col items-center gap-3 h-full">
      {/* Avatar viewport */}
      <div className="relative rounded-xl overflow-hidden border border-violet-500/30 bg-[#0a0a0a] shadow-lg shadow-violet-900/20">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] z-10 rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-violet-400">Loading avatar...</span>
            </div>
          </div>
        )}
        <AvatarScene
          modelUrl="/models/xbot.glb"
          animatorRef={stateRef}
          onLoaded={(bones: Record<string, THREE.Bone>) => {
            initAnimator(bones);
            setLoaded(true);
          }}
          width={260}
          height={360}
        />
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
        <span className="text-base">🤟</span>
        <span className="text-xs text-violet-400 font-medium">Indian Sign Language</span>
      </div>
    </div>
  );
}
