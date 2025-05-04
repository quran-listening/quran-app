// src/utils/recitationHelpers.js

import { languagesData } from "./constant";
import { normalizeArabicText } from "./normalizeArabicText";
import { calculateSimilarity, normatlizedData } from "./quranUtils"; // or wherever you keep it
import Fuse from "fuse.js";

/**
 * Search the entire Quran data to find a surah & verse match for the given transcript.
 *
 * @param {string} transcript - The recognized text in normalized Arabic.
 * @param {object} params - All relevant state setters and data from context.
 */
export function searchInWholeQuran(
  transcript,
  {
    quranDataRef,
    wholeQuranDataRef,
    surahFlag,
    surahId,
    setSurahName,
    currentSurahData,
    currentVerseIndexRef,
    rollingWindowRef,
    translationRecognizedTextRef,
    setTranslations,
    autoReciteInProgressRef,
  }
) {
  if (autoReciteInProgressRef.current) return;

  const searchableVerses = normatlizedData(wholeQuranDataRef.current);
  console.log("searchableVerses", searchableVerses);
  const fuse = new Fuse(searchableVerses, {
    keys: ["normalizedText"],
    threshold: 0.3,
    includeScore: true,
  });

  const normalizedTranscript = normalizeArabicText(transcript);

  const results = fuse?.search(normalizedTranscript);

  if (results?.length > 0) {
    const bestMatch = results[0];

    const foundSurahName = bestMatch?.item?.name;
    const foundSurahId = bestMatch?.item?.surahId;
    const verseIndexFound = bestMatch?.item?.verseId;

    // Set all state at once
    surahFlag.current = true;
    surahId.current = foundSurahId;
    setSurahName(foundSurahName);
    const surahDataItem = quranDataRef.current[foundSurahId - 1];

    currentSurahData.current = surahDataItem;
    console.log("verseIndexFound", verseIndexFound);
    currentVerseIndexRef.current = verseIndexFound;
    autoReciteInProgressRef.current = true;
  } else {
    console.log("No matches found in whole Quran search");
  }
}

/**
 * Creates and returns a new Fuse.js instance for a given list, threshold, etc.
 *
 * @param {Array} list             - The array of items to be searched.
 * @param {number} thresholdValue  - The threshold for fuzzy searching.
 * @returns {Fuse}                 - A Fuse.js instance.
 */
export function fuseInstanceFn(list, thresholdValue) {
  return new Fuse(list, {
    keys: ["normalizedText"],
    threshold: thresholdValue,
    includeScore: true,
    includeMatches: true,
  });
}

/**
 * Detects if the transcript starts with "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ" and handles the translation.
 *
 * @param {string} transcript - The recognized text in normalized Arabic.
 * @param {object} params - All relevant state setters and data from context.
 */
export const bismillahDetection = (transcript, speakTranslation, params) => {
  // Check if params is defined and has the required properties
  const {
    translationsArray = { current: new Set() }, // Default to an empty Set if undefined
    lastAyahIdRef,
    accumulatedTranscriptRef,
    setPreviousAyaList,
    isMutedRef,
    ttsRate,
    language,
    recognitionRef,
  } = params || {}; // Fallback to an empty object if params is undefined

  const bismillahTranslation =
    "In the name of Allah, the Entirely Merciful, the Especially Merciful";
  if (!translationsArray.current?.has(bismillahTranslation)) {
    translationsArray.current?.add(bismillahTranslation);
    lastAyahIdRef.current = 0; // Ensure setLastAyahId is a valid function
    // translationRecognizedTextRef.current = transcript;
    // setTranslations([bismillahTranslation]);
    accumulatedTranscriptRef.current = bismillahTranslation;
    setPreviousAyaList((prev) => [
      ...prev,
      {
        surahId: 0,
        verseId: 0,
        text: transcript,
        translation: bismillahTranslation,
      },
    ]);
    speakTranslation(bismillahTranslation, {
      isMutedRef,
      ttsRate: ttsRate.current,
      language,
    });
  }
};

/**
 * Speak out text (translation) using browser's SpeechSynthesis
 *
 * @param {string} textToSpeak
 * @param {object} params
 * @returns Promise that resolves when TTS finishes
 */
export function speakTranslation(text, { isMutedRef, ttsRate, language }) {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.error("Speech synthesis not supported");
    return;
  }
  // Ensure voices are loaded (browsers may load them asynchronously)
  setTimeout(() => {
    const voices = synth.getVoices();
    if (voices.length === 0) {
      console.log("No voices available. Try reloading the page.");
      return;
    }

    const supportedLanguages = voices.map((voice) => ({
      name: voice.name,
      lang: voice.lang,
    }));

    console.log("Supported TTS Languages:", supportedLanguages);
  }, 1000);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = isMutedRef.current ? 0 : 1;
  utterance.lang = languagesData[language]?.code || "en-US"; // Use correct language code

  const finalRate =
    typeof ttsRate === "object" && ttsRate.current ? ttsRate.current : ttsRate;

  utterance.rate = Number(finalRate);
  utterance.pitch = 1.0; // Normal pitch

  console.log("==> Speaking with TTS rate:", utterance.rate);

  utterance.onstart = () => console.log("Started speaking");
  utterance.onend = () => {
    console.log("Finished speaking");
  };
  utterance.onerror = (e) => console.error("Speech error:", e);
  utterance.onboundary = (event) => {
    if (event.name === "word") {
      const charIndex = event.charIndex;
      const beforeText = text.substring(0, charIndex);
      const words = beforeText.trim().split(/\s+/);
      const currentIndex = words.length;
      console.log("currentIndex>>>", currentIndex)
      // setCurrentWordIndex(currentIndex);
    }
  };

  synth.speak(utterance);
}

export const initRollingWindow = (surahData, startIndex) => {
  const firstTwo = surahData?.verses?.slice(startIndex, startIndex + 2);
  return firstTwo;
};

// Update processRecognition to use the rolling window

export const updateRollingWindow = (surahData, verseId) => {
  // Calculate remaining verses
  const remainingVerses = surahData?.verses?.length - verseId;

  const nextOne = surahData?.verses?.slice(verseId, verseId + 1);
  console.log("surahData?.verses", nextOne);
  console.log("surahDataverses", nextOne, verseId);

  return nextOne;
};

// export const processRecognition = (transcript, resetter, params) => {
//   const {
//     processedVersesRef,
//     translationsArray,
//     setTranslations,
//     emptyResultsCounter,
//     translationRecognizedTextRef,
//     rollingWindowRef,
//     lastAyahIdRef,
//     currentSurahData,
//     setPreviousAyaList,
//     isMutedRef,
//     ttsRate,
//     language,
//     previousAyaList,
//     recognitionRef,
//     lastAyahProcessedRef,
//   } = params;

//   if (!currentSurahData?.current?.verses) {
//     console.log("No valid surah data available");
//     return;
//   }

//   // Get current rolling window verses
//   const currentWindow = rollingWindowRef.current;
//   console.log("currentWindow", currentWindow);
//   // Prepare searchable format for current window only

//   const searchableVerses = currentWindow?.map((verse) => ({
//     ...verse,
//     normalizedText: normalizeArabicText(verse.text),
//   }));
//   console.log("searchableVerses", searchableVerses);
//   const normalizedTranscript = normalizeArabicText(transcript);
//   const fuseInstance = fuseInstanceFn(searchableVerses, 0.3);
//   const results = findMultipleMatches(normalizedTranscript, fuseInstance);
//   console.log("emptyResultsCounter.current", emptyResultsCounter.current);

//   for (const el of results || []) {
//     if (processedVersesRef.current?.has(el?.verseId)) {
//       continue;
//     }

//     // Update the processed verses set with the new verseId
//     processedVersesRef.current = new Set(processedVersesRef.current).add(
//       el?.verseId
//     );

//     if (!translationsArray?.current?.has(el?.translation)) {
//       translationRecognizedTextRef.current = normalizeArabicText(el?.text);
//       setTranslations([el?.translation]);
//       translationsArray.current?.add(el?.translation);

//       // Check for repeated verses
//       const isRepeatedVerse =
//         previousAyaList.length > 0 &&
//         previousAyaList[previousAyaList.length - 1].verseId === el?.verseId &&
//         previousAyaList[previousAyaList.length - 1].surahId ===
//         currentSurahData?.current?.surahId;

//       // Only speak if it's not the last verse and not a repeated verse
//       if (
//         el?.verseId !== currentSurahData?.current?.verses?.length &&
//         !isRepeatedVerse
//       ) {
//         console.log("calling speak translation function");
//         speakTranslation(el?.translation, {
//           isMutedRef,
//           ttsRate: ttsRate.current,
//           language,
//         });
//       }
//       setPreviousAyaList((prev) => [
//         ...prev,
//         { ...el, surahId: currentSurahData?.current?.surahId },
//       ]);
//     }

//     lastAyahIdRef.current = el?.verseId;
//     // Slide window forward after processing verse
//     rollingWindowRef.current = updateRollingWindow(
//       // currentWindow,
//       currentSurahData.current,
//       el?.verseId
//     );

//     // Early exit: break the loop if the last verse is reached
//     if (lastAyahIdRef.current === currentSurahData?.current?.verses?.length) {
//       lastAyahProcessedRef.current = true;
//       // setTimeout(() => {
//       //   resetter();
//       // }, 4000);
//       break;
//     }
//   }

//   if (lastAyahProcessedRef.current) {
//     const synth = window.speechSynthesis;
//     const lastTranslation =
//       currentSurahData?.current?.verses[lastAyahIdRef.current - 1]?.translation;
//     if (synth && lastTranslation) {
//       const utterance = new SpeechSynthesisUtterance(lastTranslation);
//       utterance.lang = language === "english" ? "en-US" : "ar";
//       utterance.rate = ttsRate.current;
//       utterance.pitch = 1.0;
//       utterance.volume = isMutedRef.current ? 0 : 1;
//       utterance.onend = () => {
//         lastAyahProcessedRef.current = false;
//         resetter();
//       };

//       synth.speak(utterance);

//       recognitionRef.current.stop();
//       rollingWindowRef.current = [];

//     } else {
//       recognitionRef.current.stop();
//       rollingWindowRef.current = [];
//       resetter();
//     }
//   }
// };

export const findMultipleMatches = (transcript, fuseInstance) => {
  const words = transcript.split(" ").filter((word) => word.trim() !== "");
  const matches = [];
  let i = 0;
  while (i < words.length) {
    let matchFound = false;
    // Try to match from longest to shortest phrases starting at index i
    for (let j = words.length; j > i; j--) {
      const phrase = words.slice(i, j).join(" ");
      const normalizedPhrase = normalizeArabicText(phrase);
      const results = fuseInstance?.search(normalizedPhrase) || [];
      // Check for a match with a low enough score (high confidence)
      if (results?.length > 0 && results[0]?.score <= 0.3) {
        const matchedVerse = results[0]?.item;
        // Avoid duplicates by checking if the verse ID is already added
        if (
          !matches?.some((match) => match?.verseId === matchedVerse?.verseId)
        ) {
          matches.push(matchedVerse);
        }
        i = j; // Move past the matched words in the phrase
        matchFound = true;
        break;
      }
    }
    if (!matchFound) {
      // Move to the next word if no match found for this starting word
      i += 1;
    }
  }
  return matches;
};

export const removeNonArabicWords = (text) => {
  // This regex matches Arabic characters, diacritics, and Arabic numerals
  const arabicRegex =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0660-\u0669\u06F0-\u06F9\u064B-\u065F\u0670]+/g;

  // Find all Arabic words
  const arabicWords = text.match(arabicRegex);

  // Return Arabic words joined by spaces, or empty string if no Arabic words found
  return arabicWords ? arabicWords.join(" ") : "";
};
