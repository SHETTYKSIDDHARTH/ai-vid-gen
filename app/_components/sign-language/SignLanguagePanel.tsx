"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAvatarAnimator } from "./useAvatarAnimator";
import { useSignSync } from "./useSignSync";
import type { ISLWordSegment } from "@/lib/sign-language/types";

const AvatarScene = dynamic(
  () => import("./AvatarScene").then((m) => ({ default: m.AvatarScene })),
  { ssr: false, loading: () => (
    <div style={{ width: 260, height: 360 }} className="rounded-xl bg-[#111] border border-violet-500/20 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="size-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-violet-400">Loading 3D...</span>
      </div>
    </div>
  )}
);

export default function SignLanguagePanel({
  videoRef,
  wordSegments,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  wordSegments: ISLWordSegment[];
}) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { stateRef, initAnimator, enqueueLetterFrames, clearQueue } = useAvatarAnimator();

  useSignSync({
    videoRef,
    wordSegments,
    animatorRef: stateRef,
    enqueueLetterFrames,
    clearQueue,
  });

  return (
    <div className="flex flex-col items-center gap-3" style={{ flexShrink: 0 }}>
      {/* Avatar viewport */}
      <div className="relative rounded-xl overflow-hidden border border-violet-500/30 bg-[#111] shadow-lg shadow-violet-900/20"
        style={{ width: 260, height: 360 }}>

        {/* Loading overlay */}
        {!loaded && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111] z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-violet-400">Loading avatar...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111] z-10">
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <span className="text-2xl">⚠️</span>
              <span className="text-xs text-red-400">Avatar failed to load</span>
              <span className="text-xs text-muted-foreground">Check browser console</span>
            </div>
          </div>
        )}

        <AvatarScene
          modelUrl="/models/xbot.glb"
          animatorRef={stateRef}
          onLoaded={(bones) => {
            initAnimator(bones);
            setLoaded(true);
          }}
          width={260}
          height={360}
        />
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
        <span className="text-sm font-semibold">ISL</span>
        <span className="text-xs text-violet-400 font-medium">Indian Sign Language</span>
      </div>

      {/* Word count info */}
      {wordSegments.length > 0 && loaded && (
        <span className="text-xs text-muted-foreground">
          {wordSegments.length} words to sign
        </span>
      )}
    </div>
  );
}
