// Converts a word string to an array of uppercase letter characters to sign
// Strips punctuation, uppercases, keeps only A-Z
export function wordToLetters(word: string): string[] {
  return word
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('');
}

// Converts a full text string to ISLWordSegment array with timing
// SECONDS_PER_LETTER: how long each letter takes to sign (default 1.0s)
export function textToWordSegments(
  script: string,
  secondsPerLetter = 1.0
): import('./types').ISLWordSegment[] {
  // Split script into sentences (by . ! ?)
  const sentenceMatches = script.match(/[^.!?]+[.!?]+(\s+|$)/g) ?? [];
  const remainder = script.slice(sentenceMatches.join('').length).trim();
  const sentences = remainder
    ? [...sentenceMatches, remainder]
    : sentenceMatches.length
    ? sentenceMatches
    : [script];

  const segments: import('./types').ISLWordSegment[] = [];
  let elapsed = 0;

  for (const sentence of sentences) {
    const sentenceText = sentence.trim();
    // Split sentence into words, filter empty
    const rawWords = sentenceText.split(/\s+/).filter(Boolean);
    const totalWordsInSentence = rawWords.length;

    for (let i = 0; i < rawWords.length; i++) {
      const rawWord = rawWords[i];
      const letters = wordToLetters(rawWord);
      if (letters.length === 0) continue;

      const duration = letters.length * secondsPerLetter;
      segments.push({
        word: letters.join(''),           // e.g. "MACHINE"
        displayWord: rawWord,            // e.g. "Machine"
        startSec: elapsed,
        endSec: elapsed + duration,
        sentenceText,
        wordIndexInSentence: i,
        totalWordsInSentence,
      });
      elapsed += duration;
    }
  }

  return segments;
}

// Total ISL video duration in seconds for a script
export function getISLDuration(script: string, secondsPerLetter = 1.0): number {
  const segs = textToWordSegments(script, secondsPerLetter);
  return segs.length > 0 ? segs[segs.length - 1].endSec : 0;
}
