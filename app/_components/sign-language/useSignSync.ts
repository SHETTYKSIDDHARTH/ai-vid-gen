"use client";
import { useEffect, useRef } from "react";
import type { AnimFrame, AvatarAnimatorRef } from "./useAvatarAnimator";
import type { ISLWordSegment } from "@/lib/sign-language/types";

export function useSignSync({
  videoRef,
  wordSegments,
  animatorRef,
  enqueueLetterFrames,
  clearQueue,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  wordSegments: ISLWordSegment[];
  animatorRef: React.MutableRefObject<AvatarAnimatorRef>;
  enqueueLetterFrames: (frames: AnimFrame[]) => void;
  clearQueue: () => void;
}) {
  const currentWordRef = useRef<string>("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || wordSegments.length === 0) return;

    const onTimeUpdate = async () => {
      const t = video.currentTime;
      const seg = wordSegments.find((s) => t >= s.startSec && t < s.endSec);

      if (seg && seg.word !== currentWordRef.current) {
        currentWordRef.current = seg.word;
        clearQueue();

        const { getLetterFrames } = await import(
          "@/lib/sign-language/animations/alphabets"
        );

        // Sign each letter of the word sequentially
        for (const letter of seg.word.split("")) {
          const frames = getLetterFrames(letter);
          if (frames) {
            enqueueLetterFrames(frames);
          }
        }
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      currentWordRef.current = "";
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoRef, wordSegments, enqueueLetterFrames, clearQueue]);
}
