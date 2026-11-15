// Removes emoji from model-written replies so everything Fuloozi sends stays
// plain text, even when the model ignores the "no emoji" instruction.
//
// Counts as emoji: pictographs (U+1F000-1FAFF), misc symbols and dingbats
// (U+2600-27BF), anything that renders as emoji by default, and any symbol
// forced into emoji style with U+FE0F, together with skin tones, keycaps,
// tag sequences and ZWJ joins. Typographic symbols such as bullets, arrows,
// (c) and (tm) signs are left alone.

const BASE = String.raw`[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F}`;
const SUFFIX = String.raw`[\u{FE0F}\u{20E3}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]|\u{200D}(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\p{Emoji_Presentation}|\p{Extended_Pictographic})\u{FE0F}?`;
const SEQUENCE = String.raw`(?:(?:${BASE})(?:${SUFFIX})*|[\u{FE0F}\u{20E3}])+`;

// An emoji that opens a line goes with the spaces after it ("<emoji> Done" -> "Done");
// anywhere else it goes with the spaces before it ("Done <emoji>!" -> "Done!").
const AT_LINE_START = new RegExp(String.raw`^[ \t]*${SEQUENCE}[ \t]*`, 'gmu');
const INLINE = new RegExp(String.raw`[ \t]*${SEQUENCE}`, 'gu');

export function stripEmoji(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(AT_LINE_START, '')
    .replace(INLINE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
