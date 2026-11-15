import type { AnimFrame } from "@/app/_components/sign-language/useAvatarAnimator";
import { A } from "./alphabets/A";
import { B } from "./alphabets/B";
import { C } from "./alphabets/C";
import { D } from "./alphabets/D";
import { E } from "./alphabets/E";
import { F } from "./alphabets/F";
import { G } from "./alphabets/G";
import { H } from "./alphabets/H";
import { I } from "./alphabets/I";
import { J } from "./alphabets/J";
import { K } from "./alphabets/K";
import { L } from "./alphabets/L";
import { M } from "./alphabets/M";
import { N } from "./alphabets/N";
import { O } from "./alphabets/O";
import { P } from "./alphabets/P";
import { Q } from "./alphabets/Q";
import { R } from "./alphabets/R";
import { S } from "./alphabets/S";
import { T } from "./alphabets/T";
import { U } from "./alphabets/U";
import { V } from "./alphabets/V";
import { W } from "./alphabets/W";
import { X } from "./alphabets/X";
import { Y } from "./alphabets/Y";
import { Z } from "./alphabets/Z";

type LetterAnimFn = () => AnimFrame[];

const letterMap: Record<string, LetterAnimFn> = {
  A, B, C, D, E, F, G, H, I, J, K, L, M,
  N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
};

export function getLetterFrames(letter: string): AnimFrame[] | null {
  const fn = letterMap[letter.toUpperCase()];
  return fn ? fn() : null;
}
