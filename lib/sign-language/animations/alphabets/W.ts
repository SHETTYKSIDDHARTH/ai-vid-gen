import type { AnimFrame } from "@/app/_components/sign-language/useAvatarAnimator";

export function W(): AnimFrame[] {
  const frame1: AnimFrame = [
    ["mixamorigRightHandIndex1", "rotation", "y", Math.PI / 16, "+"],
    ["mixamorigRightHandRing1", "rotation", "y", -Math.PI / 12, "-"],
    ["mixamorigRightHandPinky1", "rotation", "y", -Math.PI / 8, "-"],
    ["mixamorigRightHandThumb1", "rotation", "y", Math.PI / 5, "+"],
    ["mixamorigRightHandThumb2", "rotation", "z", -Math.PI / 6, "-"],
    ["mixamorigRightHandThumb3", "rotation", "y", Math.PI / 6, "+"],
    ["mixamorigRightHand", "rotation", "x", -Math.PI / 6, "-"],
    ["mixamorigRightForeArm", "rotation", "z", Math.PI / 6, "+"],
    ["mixamorigRightArm", "rotation", "z", Math.PI / 2.4, "+"],
    ["mixamorigLeftHandIndex1", "rotation", "y", -Math.PI / 16, "-"],
    ["mixamorigLeftHandRing1", "rotation", "y", Math.PI / 8, "+"],
    ["mixamorigLeftHandPinky1", "rotation", "y", Math.PI / 8, "+"],
    ["mixamorigLeftHandThumb1", "rotation", "y", -Math.PI / 5, "-"],
    ["mixamorigLeftHandThumb2", "rotation", "z", Math.PI / 6, "+"],
    ["mixamorigLeftHandThumb3", "rotation", "y", -Math.PI / 6, "-"],
    ["mixamorigLeftHand", "rotation", "y", -Math.PI / 24, "-"],
    ["mixamorigLeftHand", "rotation", "x", -Math.PI / 6, "-"],
    ["mixamorigLeftForeArm", "rotation", "z", -Math.PI / 6, "-"],
    ["mixamorigLeftArm", "rotation", "z", -Math.PI / 2.4, "-"],
  ];

  const frame2: AnimFrame = [
    ["mixamorigRightHandIndex1", "rotation", "y", 0, "-"],
    ["mixamorigRightHandRing1", "rotation", "y", 0, "+"],
    ["mixamorigRightHandPinky1", "rotation", "y", 0, "+"],
    ["mixamorigRightHandThumb1", "rotation", "y", 0, "-"],
    ["mixamorigRightHandThumb2", "rotation", "z", 0, "+"],
    ["mixamorigRightHandThumb3", "rotation", "y", 0, "-"],
    ["mixamorigRightHand", "rotation", "x", 0, "+"],
    ["mixamorigRightForeArm", "rotation", "z", 0, "-"],
    ["mixamorigRightArm", "rotation", "z", Math.PI / 3, "-"],
    ["mixamorigLeftHandIndex1", "rotation", "y", 0, "+"],
    ["mixamorigLeftHandRing1", "rotation", "y", 0, "-"],
    ["mixamorigLeftHandPinky1", "rotation", "y", 0, "-"],
    ["mixamorigLeftHandThumb1", "rotation", "y", 0, "+"],
    ["mixamorigLeftHandThumb2", "rotation", "z", 0, "-"],
    ["mixamorigLeftHandThumb3", "rotation", "y", 0, "+"],
    ["mixamorigLeftHand", "rotation", "y", 0, "+"],
    ["mixamorigLeftHand", "rotation", "x", 0, "+"],
    ["mixamorigLeftForeArm", "rotation", "z", 0, "+"],
    ["mixamorigLeftArm", "rotation", "z", -Math.PI / 3, "+"],
  ];

  return [frame1, frame2];
}
