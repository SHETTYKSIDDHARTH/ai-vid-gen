import { AbsoluteFill, Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type ChapterVideoSegment = {
  text: string;
  startFrame: number;
  endFrame: number;
};

export type ChapterVideoProps = {
  title: string;
  segments: ChapterVideoSegment[];
  audioUrl: string;
  durationInFrames: number;
};

export function ChapterVideo({ title, segments, audioUrl }: ChapterVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const activeSegment =
    segments.find((segment) => frame >= segment.startFrame && frame < segment.endFrame) ??
    segments[segments.length - 1];

  const fadeFrames = Math.min(fps * 0.35, activeSegment ? (activeSegment.endFrame - activeSegment.startFrame) / 3 : fps);

  const segmentOpacity = activeSegment
    ? interpolate(
        frame,
        [
          activeSegment.startFrame,
          activeSegment.startFrame + fadeFrames,
          activeSegment.endFrame - fadeFrames,
          activeSegment.endFrame,
        ],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <Audio src={audioUrl} />
      <div
        style={{
          opacity: titleOpacity,
          fontSize: 44,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          marginBottom: 70,
        }}
      >
        {title}
      </div>
      {activeSegment && (
        <div
          style={{
            opacity: segmentOpacity,
            fontSize: 30,
            lineHeight: 1.5,
            color: "#d6d6ff",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          {activeSegment.text}
        </div>
      )}
    </AbsoluteFill>
  );
}
