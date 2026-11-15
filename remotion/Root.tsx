import React from "react";
import { Composition } from "remotion";
import { ChapterVideo, ChapterVideoProps } from "./ChapterVideo";
import { ISLChapterVideo, ISLChapterVideoProps } from "./ISLChapterVideo";

export const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ChapterVideo"
        component={ChapterVideo}
        durationInFrames={300}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{
          title: "",
          segments: [],
          audioUrl: "",
          durationInFrames: 300,
        } satisfies ChapterVideoProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: props.durationInFrames,
        })}
      />
      <Composition
        id="ISLChapterVideo"
        component={ISLChapterVideo}
        durationInFrames={300}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{
          title: "",
          wordSegments: [],
          durationInFrames: 300,
        } satisfies ISLChapterVideoProps}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: props.durationInFrames,
        })}
      />
    </>
  );
};
