import stringSimilarity, { compareTwoStrings } from "string-similarity";
import { normalizeArabicText } from "./normalizeArabicText";
import surahLastAyah from "../data/surahLastAyah.json"

/** Calculate similarity using string-similarity library */
// export const  calculateSimilarity = (str1, str2)=> {
//     return stringSimilarity.compareTwoStrings(str1, str2);
//   }


function levenshtein(a, b) {
  const alen = a.length, blen = b.length;
  if (!alen) return blen;
  if (!blen) return alen;

  let prev = new Uint16Array(blen + 1);
  let curr = new Uint16Array(blen + 1);

  for (let j = 0; j <= blen; j++) prev[j] = j;

  for (let i = 1; i <= alen; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);

    for (let j = 1; j <= blen; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,         // deletion
        curr[j - 1] + 1,     // insertion
        prev[j - 1] + cost   // substitution
      );
    }
    [prev, curr] = [curr, prev];  // swap rows
  }
  return prev[blen];
}

/* ------------------------------------------------------------------
   Public helper: 0 … 1 similarity score
   ------------------------------------------------------------------ */
export function calculateSimilarity(rawA = "", rawB = "") {
  // 1) normalise Arabic, NFC fold, collapse whitespace
  const a = normalizeArabicText(rawA).normalize("NFC").replace(/\s+/g, " ").trim();
  const b = normalizeArabicText(rawB).normalize("NFC").replace(/\s+/g, " ").trim();

  if (!a || !b) return 0;
  if (a === b)  return 1;

  const dist   = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist / maxLen;          // 0 … 1
}
  
  /** Count Arabic words. Just splits on whitespace for simplicity. */
  // export function countArabicWords(transcript) {
  //   return transcript.trim().split(/\s+/).length;
  // }
  export function countArabicWords(transcript) {
    const words = transcript.match(/\p{Script=Arabic}+/gu);
    return words ? words.length : 0;
  }

  export const normatlizedData  = (currentWindow)=>{
    const   searchableVerses  = currentWindow?.map((verse) => ({
        ...verse,
        normalizedText: normalizeArabicText(verse.text),
      }));
      return searchableVerses;
  }


  // Pre-index by surahId for O(1) look-ups
const LAST_AYAH_TABLE = {};
surahLastAyah.forEach((item, i) => {
  LAST_AYAH_TABLE[i + 1] = normalizeArabicText(item.normalizedText);
});

/**
 * Returns true when `transcript` is (almost) the final āyah of the current sûrah.
 * We allow a small fuzzy window so minor pronunciation differences don’t stop the match.
 */
export function isLastAyahSpoken({ transcript, currentSurahId, threshold = 0.85 }) {
  if (!currentSurahId || currentSurahId < 1) return false;
  const candidate = normalizeArabicText(transcript);
  const gold      = LAST_AYAH_TABLE[currentSurahId];
  if (!gold) return false;

  // exact substring is cheapest; fall back to a similarity check
  if (gold && candidate.includes(gold)) return true;
  return calculateSimilarity(candidate, gold) >= threshold;
}

 
