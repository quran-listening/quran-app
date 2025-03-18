// src/context/RecitationProvider.js

import React, { useState, useEffect, useRef } from "react";
import RecitationContext from "./RecitationContext";

// Custom hooks
import useSpeechRecognition from "../hooks/useSpeechRecognition";

// Helpers
import {
  searchInWholeQuran,
  speakTranslation,
  fuseInstanceFn,
  processRecognition,
  bismillahDetection,
  initRollingWindow,
  removeNonArabicWords,
  findMultipleMatches,
} from "../utils/recitationHelpers";

import {
  surahNameArray,
  dataForWholeQuranSearchAbleFormat,
} from "../data/static";
import surahLastAyah from "../data/surahLastAyah.json";


import { normalizeArabicText } from "../utils/normalizeArabicText";
import { calculateSimilarity } from "../utils/quranUtils";
import { languagesData } from "../utils/constant";

/**
 * The RecitationProvider manages all global states and methods
 * for real-time Quranic recitation & translation.
 */
export const RecitationProvider = ({ children }) => {
  // ------------------- Global States -------------------
  const [recognizedText, setRecognizedText] = useState("");
  const [translations, setTranslations] = useState([]);

  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem("language");
    return savedLanguage || "english"; // fallback to "english" if no saved preference
  });

  // Surah detection
  const [fuse, setFuse] = useState(null);

  const [surahName, setSurahName] = useState("");
  const [translationsArray, setTranslationsArray] = useState("");
  const [surahData] = useState(surahNameArray);
  // const [versesList, setVersesList] = useState([]);

  // References
  const isListeningRef = useRef(false);
  const translationRecognizedTextRef = useRef("");
  const versesList = useRef([]);
  const surahFlag = useRef(false);
  const surahId = useRef(0);
  const currentSurahData = useRef(null);
  const processedVersesRef = useRef(new Set());
  const lastAyahIdRef = useRef(0);
  const fuseRef = useRef(null);
  const isMutedRef = useRef(true);
  const rollingWindowRef = useRef([]);
  const bismillahFoundRef = useRef(false);
  const AllahoHoAkbarFoundRef = useRef(false);
  const ttsRate = useRef(1.0);
  const lastAyahProcessedRef = useRef(false);
  const noTranscriptTimeoutRef = useRef(null);
  const lastTranscriptTimeRef = useRef(Date.now());
  const emptyResultsCounter = useRef(0);
  const currentVerseIndexRef = useRef(0);
  const startTime = useRef(null);
  const autoReciteInProgressRef = useRef(false);
  const surahEndFlagRef = useRef(false);
  const surahNameArrayFlag = useRef(false);
  const silenceTimerRef = useRef(null);
  const interruptFlagRef = useRef(false);
  const matchesFoundRef = useRef(true);
  const wholeQuranDataRef = useRef(dataForWholeQuranSearchAbleFormat);
  const transcriptRef = useRef("");
  const autorecitationCheckRef = useRef(false);
  const quranDataRef = useRef(null);

  const checkdCheckBoxRef = useRef(true);

  // "Next verse" matching
  const [rollingWindow, setRollingWindow] = useState([]);
  const ROLLING_WINDOW_SIZE = 3;
  const RECITATION_SILENCE_TIMEOUT = 6500;

  // For displaying previously matched verses
  const [previousAyaList, setPreviousAyaList] = useState([]);

  // TTS speed and auto
  const [checkdCheckBox, setCheckdCheckBox] = useState(true);

  // Mute/unmute TTS

  // Control partial recognized text

  // Time tracking
  const [pauseStartTime, setPauseStartTime] = useState(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [totalArabicWords, setTotalArabicWords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChunkStart] = useState(0);

  // Control flags
  const [flag, setFlag] = useState(false); // "live" mode UI

  let debounceTimeout;

  // --------------- 1) Create Fuse for Surah detection ---------------

  useEffect(() => {
    if (!surahData || surahData.length === 0) return;
    const verses = [];

    // Changed from optional chaining to direct access since we checked for existence
    surahData.forEach((verse) => {
      const normalizedText = normalizeArabicText(verse.text);
      verses.push({
        name: verse.name,
        id: verse.surahId,
        text: verse.text,
        normalizedText,
        translation: verse.translation,
      });
    });

    versesList.current = verses;
  }, [surahData]);

  // Update the ref whenever the state changes
  useEffect(() => {
    checkdCheckBoxRef.current = checkdCheckBox;
  }, [checkdCheckBox]);

  // Fetch the quran data from the link
  useEffect(() => {
    setIsLoading(true);
    const jsonCdnlink =
    languagesData[language]?.jsonUrl ||
      "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_en.json";
    fetch(jsonCdnlink)
      .then((response) => response.json())
      .then((data) => {
        // Process each Surah
        const updatedData = data.map((surah, index) => {
          // Replace `id` with `surahId`
          const modifiedSurah = { ...surah, surahId: surah.id };
         

          if (index === 0) {
            // Remove only the first verse (id: 1)
            const filteredVerses = surah.verses.filter(
              (verse) => verse.id !== 1
            );

            // Reassign `verseId` starting from 1 for the remaining verses
            const reindexedVerses = filteredVerses.map((verse, i) => ({
              ...verse,
              verseId: i + 1, // New ID starts from 1
            }));

            return {
              ...modifiedSurah,
              verses: reindexedVerses,
              total_verses: reindexedVerses.length, // Update total_verses dynamically
            };
          }

          // Update verse keys for other Surahs as well
          return {
            ...modifiedSurah,
            verses: surah.verses.map((verse) => ({
              ...verse,
              verseId: verse.id, // Rename `id` to `verseId`
            })),
          };
        });

        quranDataRef.current = updatedData;
        setIsLoading(false);
      })
      .catch((error) => console.error("Error fetching Quran JSON:", error));
  }, [language]);

  // --------------- 2) Adjust TTS Speed ---------------
  const adjustTtsSpeed = (wordsCount, elapsedTimeMs) => {
    if (!wordsCount || elapsedTimeMs <= 0) {
      return;
    }

    const MIN_ELAPSED_TIME_MS = 1000; // Minimum 1 second
    if (elapsedTimeMs < MIN_ELAPSED_TIME_MS) {
      return;
    }

    if (!checkdCheckBoxRef.current) {
      return;
    }

    // Convert to minutes and ensure we don't divide by extremely small numbers
    const minutes = elapsedTimeMs / 60000;
    const wpm = wordsCount / minutes;

    let newRate = 1.0;
    if (wpm > 200) {
      newRate = 1.5;
    } else if (wpm > 100) {
      newRate = 1.5;
    } else if (wpm > 90) {
      newRate = 1.5;
    } else if (wpm > 80) {
      newRate = 1.25;
    } else if (wpm > 60) {
      newRate = 1.0;
    } else {
      newRate = 0.85;
    }

    ttsRate.current = newRate;
    console.log("Final values - WPM:", wpm, "New rate:", newRate);
  };

  // --------------- 4) Wrappers for recitationHelpers ---------------
  const doSearchInWholeQuran = (transcript) => {
    searchInWholeQuran(transcript, {
      quranDataRef,
      wholeQuranDataRef,
      surahFlag,
      setSurahName,
      surahId,
      currentSurahData,
      rollingWindowRef,
      currentVerseIndexRef,
      setRollingWindow,
      translationRecognizedTextRef,
      setTranslations,
      setPreviousAyaList,
      stopRecognitionAndReset,
      autoReciteInProgressRef,
    });
  };

  const doSpeakTranslation = (textToSpeak) => {
    speakTranslation(textToSpeak, {
      isMutedRef,
      ttsRate,
      language,
    });
  };

  const handleNoTranscriptTimeout = () => {
    const currentTime = Date.now();
    const timeSinceLastTranscript = currentTime - lastTranscriptTimeRef.current;
    
    if (timeSinceLastTranscript >= 6500) {
      if (autorecitationCheckRef.current === false) {
      console.log("No transcript for 6.5 seconds, resetting...");
      resetter();
      }
    } else {
      // Schedule next check
      noTranscriptTimeoutRef.current = setTimeout(
        handleNoTranscriptTimeout,
        1000
      );
    }
  };

  const checkForMatches = (main_transcript) => {
    transcriptRef.current = main_transcript;
    // Clean the transcript to only include Arabic words
    const transcript = removeNonArabicWords(main_transcript);
    // Update last transcript time
    lastTranscriptTimeRef.current = Date.now();
    // Clear existing timeout and set a new one
    if (noTranscriptTimeoutRef.current) {
      clearTimeout(noTranscriptTimeoutRef.current);
    }
    noTranscriptTimeoutRef.current = setTimeout(
      handleNoTranscriptTimeout,
      1000
    );

    // Get the last ayah of current surah if one is selected
    const currentSurahLastAyah = surahId.current > 0 
      ? surahLastAyah.find(ayah => ayah.surahId === surahId.current)
      : null;

    // Only check for last ayah if we're in a surah
    if (currentSurahLastAyah && surahFlag.current) {
      const normalizedTranscript = normalizeArabicText(transcript);
      const normalizedLastAyah = normalizeArabicText(currentSurahLastAyah.normalizedText);
      
      // Calculate similarity between transcript and last ayah
      const similarity = calculateSimilarity(normalizedTranscript, normalizedLastAyah);
      
      if (similarity > 0.8) { // You can adjust this threshold
        console.log("Last ayah of surah detected");
        resetter();
        return;
      }
    }

    const GairilMaghzobiTranscript = "غير المغضوب عليهم";
    
    if (transcript?.includes(GairilMaghzobiTranscript)) {
      resetter();
      return;
    }

    const AllahoakbarTranscript = "الله اكبر";
    const Allahoakbar = "اللّٰهُ أَكْبَرْ";
    const AllahoakbarTranslation = "Allah is the Greatest";

    if (
      transcript?.includes(AllahoakbarTranscript) &&
      !AllahoHoAkbarFoundRef.current
    ) {
      speakTranslation(AllahoakbarTranslation, {
        isMutedRef,
        ttsRate: ttsRate.current,
        language,
      });
      setPreviousAyaList((prev) => [
        ...prev,
        {
          surahId: 0,
          verseId: 0,
          text: Allahoakbar,
          translation: AllahoakbarTranslation,
        },
      ]);
      AllahoHoAkbarFoundRef.current = true;
      setTimeout(() => {
        resetter();
        AllahoHoAkbarFoundRef.current = false;
      }, [2000]);
      return;
    }

    if (autoReciteInProgressRef.current) {
      return;
    }
    // Split on any whitespace and remove empty entries
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) {
      startTime.current = new Date();
    } else {
      adjustTtsSpeed();
    }
    if (words.length < 3) {
      return;
    } else if (!surahFlag.current && surahId.current < 1) {
      // Initialize word queue for progressive matching
      let wordQueue = [];
      let matchFound = false;
      console.log("checkForMatches123", surahFlag.current, surahId.current);
      // Try matching with increasing number of words
      for (let i = 0; i < words.length && !matchFound; i++) {
        wordQueue.push(words[i]);
        const searchPhrase = wordQueue.join(" ");
        const fuseInstance = fuseInstanceFn(versesList.current, 0.2);
        const normalizedPhrase = normalizeArabicText(searchPhrase);
        const fuseResults = fuseInstance?.search(normalizedPhrase);
        if (fuseResults && fuseResults.length > 0) {
          if (fuseResults.length === 1) {
            // Unique match found
            matchFound = true;

            const foundItem = fuseResults[0].item;
            if (foundItem?.id === 0) {
              // bismillahDetection detected
              if (!bismillahFoundRef.current) {
                bismillahFoundRef.current = true;
                const bismillahTranscript =
                  "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ";
                bismillahDetection(bismillahTranscript, doSpeakTranslation, {
                  translationsArray,
                  lastAyahIdRef,
                  translationRecognizedTextRef,
                  setTranslations,
                  accumulatedTranscriptRef,
                  setPreviousAyaList,
                  isMutedRef,
                  ttsRate: ttsRate.current,
                  language,
                  recognitionRef,
                });
                wordQueue = [];
                recognitionRef.current.stop();
                return;
              }
            } else {
              AllahoHoAkbarFoundRef.current = false;
              bismillahFoundRef.current = false;
              const surahDataItem = quranDataRef.current[foundItem?.id - 1];
              currentSurahData.current = surahDataItem;

              setSurahName(foundItem?.name);
              surahId.current = foundItem?.id;

              autoReciteInProgressRef.current = true;
              lastAyahIdRef.current = surahDataItem?.verses?.[0]?.verseId;
              currentVerseIndexRef.current =
                surahDataItem?.verses?.[0]?.verseId;
              surahFlag.current = true;
              surahNameArrayFlag.current = true;
              
              break;
            }
            // Set states for the found surah
          } else {
            console.log(`Found ${fuseResults.length} matches, continuing...`);
          }
        } else if (i === words.length - 1 || fuseResults?.length === 0) {
          // No matches found after trying all words
          console.log("No surah match found, searching whole Quran...");
          doSearchInWholeQuran(transcript);
        }
      }
    }
  };

  // ---- The effect in the old style ----
  useEffect(() => {
    console.log("autoReciteInProgressRef");
    // Check your refs instead of props/state
    if (autoReciteInProgressRef.current && currentSurahData.current) {
      // We define the async function inside the effect
      const reciteEntireSurah = async () => {
        // If you used surahNameArrayFlagRef/currentVerseIdRef:
        lastAyahIdRef.current = surahNameArrayFlag.current
          ? currentVerseIndexRef.current - 1
          : currentVerseIndexRef.current;

        try {
          for (
            let i = lastAyahIdRef.current;
            i < currentSurahData.current?.verses?.length;
            i++
          ) {
            // Check interrupt
            if (interruptFlagRef.current) {
              console.log("Interrupt detected. Stopping Surah recitation.");
              resetter();
              break;
            }

            const verse = currentSurahData.current?.verses[i];
            if (!verse) continue;

            // Create rolling window of next 3 verses
            const rollingVerses = currentSurahData.current?.verses
              .slice(i, i + ROLLING_WINDOW_SIZE)
              .map((v, index) => ({
                text: normalizeArabicText(v.text),
                verseId: v.verseId,
                surahId: currentSurahData.current.surahId,
                index: index, // Position in rolling window
              }));
            rollingWindowRef.current = rollingVerses;

            console.log("\n--- Rolling Window Debug ---");
            console.log("Current verse index:", i);
            rollingVerses.forEach((rv, index) => {
              console.log(
                `Window position ${index + 1}:`,
                rv.text.substring(0, 50) + "..."
              );
            });
            console.log("------------------------\n");

            // The inline function to check transcripts
            const checkTranscriptMatch = () => {
              // Clear existing silence timer
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
              }

              // Restart silence timer
              if (autorecitationCheckRef.current === false) {
                silenceTimerRef.current = setTimeout(() => {
                  console.log(
                    "⚠️ Silence detected for 6.5 seconds during recitation - stopping"
                  );
                if (recognitionRef.current) {
                  isListeningRef.current = false;
                  interruptFlagRef.current = true;
                  autoReciteInProgressRef.current = false;
                  currentSurahData.current = null;
                }
              }, RECITATION_SILENCE_TIMEOUT);
            }

              // Get current rolling window verses
              const currentWindow = rollingWindowRef.current;

              // Prepare searchable format for current window only
              const searchableVerses = currentWindow?.map((verse) => ({
                ...verse,
                normalizedText: normalizeArabicText(verse?.text),
              }));
              const normalizedTranscript = normalizeArabicText(transcriptRef.current);
              const fuseInstance = fuseInstanceFn(searchableVerses, 0.4);
              const results = findMultipleMatches(normalizedTranscript, fuseInstance);
              console.log("autorecitation results", transcriptRef.current);

              // Check if window is empty
              if (!results || results.length === 0) {
                emptyResultsCounter.current++;

                if (emptyResultsCounter.current >= 4) {
                  recognitionRef.current.stop();
                  interruptFlagRef.current = true;
                  emptyResultsCounter.current = 0; // Reset counter
                  autoReciteInProgressRef.current = false;
                  currentSurahData.current = null;

                  return false;
                }
              } else {
                // Reset counter if window is not empty
                emptyResultsCounter.current = 0;
              }

              return true;
            };

            // "Process" the verse
            translationRecognizedTextRef.current = verse.text;
            setTranslations([verse.translation]);
            lastAyahIdRef.current++;
            console.log("lastAyahIdRef", lastAyahIdRef.current);
            // Speak translation (example TTS helper)
            await speakTranslation(verse.translation, {
              isMutedRef,
              ttsRate: ttsRate.current,
              language,
            });
            console.log("currentSurahDatadd", currentSurahData.current);
            setPreviousAyaList((prev) => [
              ...prev,
              {
                surahId: currentSurahData.current?.surahId,
                verseId: verse?.verseId,
                text: verse?.text,
                translation: verse?.translation,
              },
            ]);
            // Wait for speech to complete before moving to next verse
            await new Promise((resolve) => {
              const checkSpeaking = setInterval(() => {
                if (!window.speechSynthesis.speaking) {
                  clearInterval(checkSpeaking);
                  resolve();
                }
              }, 100);
            });
          }

          // Done reciting
          console.log("Done reciting Surah:", currentSurahData.current);
        } catch (error) {
          console.error("Error in reciteEntireSurah:", error);
          resetter();
        }
      };

      // Fire the async function
      reciteEntireSurah();
    }
    // Because these are refs, changes in `.current` won't re-run effect:
  }, [autoReciteInProgressRef.current, currentSurahData.current]);

  const stopRecognitionAndReset = () => {
    stopListening();
  };

  const resetter = () => {
    console.log("resetter called");
    // Clear the timeout
    if (noTranscriptTimeoutRef.current) {
      clearTimeout(noTranscriptTimeoutRef.current);
      noTranscriptTimeoutRef.current = null;
    }
    // stopRecognition();

    // Reset recognized text
    setRecognizedText("");

    currentVerseIndexRef.current = 0;
    // setRollingWindow([]);

    // Reset times
    startTime.current = null;
    setPauseStartTime(null);
    setTotalPausedTime(0);
    setTotalArabicWords(0);
    surahFlag.current = false;
    surahId.current = 0;
    accumulatedTranscriptRef.current = "";
    rollingWindowRef.current = [];
    currentSurahData.current = null;
    processedVersesRef.current = new Set();

    translationRecognizedTextRef.current = "";
    setTranslations([]);
    surahEndFlagRef.current = false;
    autoReciteInProgressRef.current = false;
    matchesFoundRef.current = true;
  };

  // --------------- 6) Mute/unmute TTS ---------------
  const handleMute = () => {
    isMutedRef.current = !isMutedRef.current;
  };

  // --------------- 7) Start + Stop Listening ---------------
  const startListening = () => {
    // Reset the last transcript time when starting
    lastTranscriptTimeRef.current = Date.now();

    // Start the timeout check
    noTranscriptTimeoutRef.current = setTimeout(
      handleNoTranscriptTimeout,
      1000
    );
    // small TTS to un-block on iOS
    doSpeakTranslation(" ");

    if (!isListeningRef.current) {
      isListeningRef.current = true;
      setFlag(true); // switch UI to "live" mode
      startRecognition(); // from our custom hook
    }
  };

  const stopListening = () => {
    // Clear the timeout
    if (noTranscriptTimeoutRef.current) {
      clearTimeout(noTranscriptTimeoutRef.current);
      noTranscriptTimeoutRef.current = null;
    }
    stopRecognition(); // from our custom hook
    isListeningRef.current = false;
    setFlag(false);
    window.speechSynthesis.cancel();
    window.location.reload();
  };

  // --------------- 8) Use the custom hook: useSpeechRecognition ---------------
  // This hook handles the actual browser speech recognition events

  const {
    startRecognition,
    stopRecognition,
    recognitionRef,
    accumulatedTranscriptRef,
  } = useSpeechRecognition({
    language,
    isListeningRef,
    recognizedText,
    setRecognizedText,
    pauseStartTime,
    setPauseStartTime,
    totalPausedTime,
    setTotalPausedTime,
    startTime,
    checkForMatches,
    adjustTtsSpeed,
    interruptFlagRef,
    matchesFoundRef,
    setTranslations,
    totalArabicWords,
    setTotalArabicWords,
    autorecitationCheckRef
  });

  // --------------- 9) Provide all states & methods ---------------
  const providerValue = {
    // States
    isListeningRef,
    recognizedText,
    translationRecognizedTextRef,
    translations,
    language,
    fuse,
    surahFlag,
    surahName,
    surahId,
    lastAyahIdRef,
    rollingWindow,
    currentSurahData,
    rollingWindowRef,
    currentVerseIndexRef,
    previousAyaList,
    ttsRate,
    isMutedRef,
    checkdCheckBox,
    matchesFoundRef,
    flag,
    startTime,
    totalPausedTime,
    totalArabicWords,
    interruptFlagRef,
    autorecitationCheckRef,

    // Constants
    ROLLING_WINDOW_SIZE,

    // Setters
    setLanguage,

    setCheckdCheckBox,

    // Methods
    checkForMatches,
    stopRecognitionAndReset,
    handleMute,
    startListening,
    stopListening,
    resetter,
    doSpeakTranslation, // if you need to speak a custom text anytime
    isLoading,
  };

  return (
    <RecitationContext.Provider value={providerValue}>
      {children}
    </RecitationContext.Provider>
  );
};
