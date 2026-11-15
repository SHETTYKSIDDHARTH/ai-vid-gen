import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type ISLWordSegment = {
  word: string;
  displayWord: string;
  startSec: number;
  endSec: number;
  sentenceText: string;
  wordIndexInSentence: number;
  totalWordsInSentence: number;
};

export type ISLChapterVideoProps = {
  title: string;
  wordSegments: ISLWordSegment[];
  durationInFrames: number;
};

// Renders highlighted text: active word gets gold highlight, rest are white/dim
function HighlightedSentence({
  sentenceText,
  activeWordIndex,
  totalWords,
}: {
  sentenceText: string;
  activeWordIndex: number;
  totalWords: number;
}) {
  const words = sentenceText.trim().split(/\s+/);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
      {words.map((word, i) => {
        const isActive = i === activeWordIndex;
        const isPast = i < activeWordIndex;
        return (
          <span
            key={i}
            style={{
              fontSize: 32,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? "#FFD700" : isPast ? "#888888" : "#ffffff",
              backgroundColor: isActive ? "rgba(255,215,0,0.15)" : "transparent",
              borderRadius: 6,
              padding: isActive ? "2px 8px" : "2px 4px",
              transition: "all 0.1s",
              lineHeight: 1.6,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

// Letter tracker at bottom: shows "M - A - C - H - I - N - E" with current letter highlighted
function LetterTracker({ word, frame, startFrame, endFrame, fps, secondsPerLetter }: {
  word: string;
  frame: number;
  startFrame: number;
  endFrame: number;
  fps: number;
  secondsPerLetter: number;
}) {
  const letters = word.split('');
  const elapsed = (frame - startFrame) / fps;
  const currentLetterIdx = Math.min(
    Math.floor(elapsed / secondsPerLetter),
    letters.length - 1
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 32 }}>
      {letters.map((letter, i) => {
        const isActive = i === currentLetterIdx;
        const isDone = i < currentLetterIdx;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <span style={{ color: "#555", fontSize: 20 }}>-</span>
            )}
            <span
              style={{
                fontSize: isActive ? 36 : 24,
                fontWeight: isActive ? 900 : 400,
                color: isActive ? "#7C3AED" : isDone ? "#555" : "#aaa",
                fontFamily: "monospace",
                transition: "all 0.1s",
              }}
            >
              {letter}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function ISLChapterVideo({ title, wordSegments, durationInFrames }: ISLChapterVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const SECONDS_PER_LETTER = 1.0;

  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Find active word segment
  const currentTimeSec = frame / fps;
  const activeSegment = wordSegments.find(
    (seg) => currentTimeSec >= seg.startSec && currentTimeSec < seg.endSec
  ) ?? wordSegments[wordSegments.length - 1];

  const activeStartFrame = activeSegment ? Math.round(activeSegment.startSec * fps) : 0;
  const activeEndFrame = activeSegment ? Math.round(activeSegment.endSec * fps) : durationInFrames;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: "60px 80px",
        fontFamily: "Arial, sans-serif",
        flexDirection: "column",
      }}
    >
      {/* ISL Badge */}
      <div style={{
        position: "absolute",
        top: 24,
        right: 32,
        backgroundColor: "#7C3AED",
        color: "#fff",
        fontSize: 16,
        fontWeight: 700,
        padding: "6px 14px",
        borderRadius: 20,
        letterSpacing: 1,
      }}>
        🤟 ISL MODE
      </div>

      {/* Chapter Title */}
      <div
        style={{
          opacity: titleOpacity,
          fontSize: 36,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          marginBottom: 48,
          marginTop: 20,
        }}
      >
        {title}
      </div>

      {/* Divider */}
      <div style={{ width: 120, height: 2, backgroundColor: "#7C3AED", marginBottom: 48, borderRadius: 1 }} />

      {/* Highlighted Sentence */}
      {activeSegment && (
        <div style={{ maxWidth: 1000, textAlign: "center" }}>
          <HighlightedSentence
            sentenceText={activeSegment.sentenceText}
            activeWordIndex={activeSegment.wordIndexInSentence}
            totalWords={activeSegment.totalWordsInSentence}
          />
        </div>
      )}

      {/* Letter Tracker */}
      {activeSegment && (
        <LetterTracker
          word={activeSegment.word}
          frame={frame}
          startFrame={activeStartFrame}
          endFrame={activeEndFrame}
          fps={fps}
          secondsPerLetter={SECONDS_PER_LETTER}
        />
      )}

      {/* Progress bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: "#1a1a1a",
      }}>
        <div style={{
          width: `${(frame / durationInFrames) * 100}%`,
          height: "100%",
          backgroundColor: "#7C3AED",
        }} />
      </div>
    </AbsoluteFill>
  );
}
