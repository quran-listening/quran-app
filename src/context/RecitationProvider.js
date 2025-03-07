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
} from "../utils/recitationHelpers";

// Utilities

// Data
import quran_eng from "../data/quran_eng.json";
import {
  surahNameArray,
  dataForWholeQuranSearchAbleFormat,
} from "../data/static";

import { normalizeArabicText } from "../utils/normalizeArabicText";
/**
 * The RecitationProvider manages all global states and methods
 * for real-time Quranic recitation & translation.
 */
export const RecitationProvider = ({ children }) => {
  // ------------------- Global States -------------------
  const [recognizedText, setRecognizedText] = useState("");
  const [translations, setTranslations] = useState([]);
  const [language, setLanguage] = useState("english");

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
  const emptyResultsCounter = useRef(0);
  const currentVerseIndexRef = useRef(0);
  const startTime = useRef(null);


  // "Next verse" matching
  const [rollingWindow, setRollingWindow] = useState([]);
  const ROLLING_WINDOW_SIZE = 2;

  // For displaying previously matched verses
  const [previousAyaList, setPreviousAyaList] = useState([]);

  // TTS speed and auto
  const [checkdCheckBox, setCheckdCheckBox] = useState(true);

  // Mute/unmute TTS

  // Control partial recognized text
  const [matchesFound, setMatchesFound] = useState(true);

  // Time tracking
  const [pauseStartTime, setPauseStartTime] = useState(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [totalArabicWords, setTotalArabicWords] = useState(0);
  const [currentChunkStart] = useState(0);

  // Control flags
  const [flag, setFlag] = useState(false); // "live" mode UI
  const [interruptFlag, setInterruptFlag] = useState(false);

  // Quran data
  const [quranData] = useState(quran_eng);

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

  // --------------- 2) Adjust TTS Speed ---------------
  const adjustTtsSpeed = (wordsCount, elapsedTimeMs) => {
    if (!wordsCount || elapsedTimeMs <= 0) {
      return;
    }

    const MIN_ELAPSED_TIME_MS = 1000; // Minimum 1 second
    if (elapsedTimeMs < MIN_ELAPSED_TIME_MS) {
      return;
    }

    // Convert to minutes and ensure we don't divide by extremely small numbers
    const minutes = elapsedTimeMs / 60000;
    const wpm = wordsCount / minutes;
    console.log("wpm", wpm);

    if (!checkdCheckBox) {
      return;
    }

    let newRate = 1.0;
    if (wpm > 200) {
      newRate = 2.0;
    } else if (wpm > 100) {
      newRate = 1.75;
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
      quranData,
      dataForWholeQuranSearchAbleFormat,
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
    });
  };

  const doProcessRecognition = (transcript) => {
    processRecognition(transcript, resetter, {
      processedVersesRef,
      translationsArray,
      setTranslationsArray,
      emptyResultsCounter,
      accumulatedTranscriptRef,
      setTranslations,
      translationRecognizedTextRef,
      rollingWindowRef,
      recognitionRef,
      lastAyahIdRef,
      currentSurahData,
      setRollingWindow, // Add this to access the rolling window setter
      currentChunkStart, // Assuming this is also provided
      quranData, // Assuming this is also provided
      ROLLING_WINDOW_SIZE,
      setPreviousAyaList,
      previousAyaList,
      isMutedRef,
      ttsRate,
      language,
      lastAyahProcessedRef,
    });
  };

  const doSpeakTranslation = (textToSpeak) => {
    speakTranslation(textToSpeak,{
      isMutedRef,
      ttsRate,
      language,
    });
  };

  const checkForMatches = (transcript) => {
    
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


      
      // Split on any whitespace and remove empty entries
      const words = transcript.trim().split(/\s+/).filter(Boolean);
      if (words.length < 3) {
        startTime.current = new Date();
      } else {
        adjustTtsSpeed();
      }
      if (words.length < 3) {
        return;
      }else if (!surahFlag.current && surahId.current < 1) {
        // Initialize word queue for progressive matching
        let wordQueue = [];
        let matchFound = false;

        // Try matching with increasing number of words
        for (let i = 0; i < words.length && !matchFound; i++) {
          wordQueue.push(words[i]);
          const searchPhrase = wordQueue.join(" ");
          const fuseInstance = fuseInstanceFn(versesList.current, 0.2);
          const normalizedPhrase = normalizeArabicText(searchPhrase);
          const fuseResults = fuseInstance?.search(normalizedPhrase);
          console.log("fuseResults", fuseResults);
          if (fuseResults && fuseResults.length > 0) {
            if (fuseResults.length === 1) {
              // Unique match found
              matchFound = true;

              const foundItem = fuseResults[0].item;
              console.log("foundItem", foundItem);
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
                const surahDataItem = quranData[foundItem?.id - 1];
                console.log("surahDataItem", surahDataItem);
                currentSurahData.current = surahDataItem;

                setSurahName(foundItem?.name);
                surahId.current = foundItem?.id;

                // Initialize rolling window
                const newWindow = initRollingWindow(surahDataItem, 0);
                rollingWindowRef.current = newWindow;
                lastAyahIdRef.current = surahDataItem?.verses?.[0]?.verseId;
                surahFlag.current = true;
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
      } else {
        // We already have a Surah => check rolling window for next verse
        console.log("Surah already detected, proceeding to process");
        doProcessRecognition(transcript);
      }
  };

  const stopRecognitionAndReset = () => {
    stopListening();
  };

  const resetter = () => {
    console.log("resetter called")
    // stopRecognition();
    isListeningRef.current = false;
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
   
  };

  // --------------- 6) Mute/unmute TTS ---------------
  const handleMute = () => {
    isMutedRef.current = !isMutedRef.current;
  };

  // --------------- 7) Start + Stop Listening ---------------
  const startListening = () => {
    // small TTS to un-block on iOS
    doSpeakTranslation(" ");

    if (!isListeningRef.current) {
      isListeningRef.current = true;
      setFlag(true); // switch UI to "live" mode
      startRecognition(); // from our custom hook
    }
  };

  const stopListening = () => {
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
    matchesFound,
    setInterruptFlag,
    setMatchesFound,
    setTranslations,
    totalArabicWords,
    setTotalArabicWords,
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
    matchesFound,
    flag,
    startTime,
    totalPausedTime,
    totalArabicWords,
    interruptFlag,

    // Constants
    ROLLING_WINDOW_SIZE,

    // Setters
    setLanguage,

    setCheckdCheckBox,
    setMatchesFound,

    // Methods
    checkForMatches,
    stopRecognitionAndReset,
    handleMute,
    startListening,
    stopListening,
    resetter,
    doSpeakTranslation, // if you need to speak a custom text anytime
  };

  return (
    <RecitationContext.Provider value={providerValue}>
      {children}
    </RecitationContext.Provider>
  );
};
