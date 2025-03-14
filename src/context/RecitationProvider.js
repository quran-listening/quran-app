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

// Utilities

// Data
import quran_eng from "../data/quran_eng.json";
import {
  surahNameArray,
  dataForWholeQuranSearchAbleFormat,
} from "../data/static";

import { normalizeArabicText } from "../utils/normalizeArabicText";
import { calculateSimilarity } from "../utils/quranUtils";
import Fuse from "fuse.js";

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
  const [currentChunkStart] = useState(0);

  // Control flags
  const [flag, setFlag] = useState(false); // "live" mode UI

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

  // Update the ref whenever the state changes
  useEffect(() => {
    checkdCheckBoxRef.current = checkdCheckBox;
  }, [checkdCheckBox]);
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

    if (timeSinceLastTranscript >= 9000) {
      // 10 seconds
      console.log("No transcript for 9 seconds, resetting...");
      resetter();
    } else {
      // Schedule next check
      noTranscriptTimeoutRef.current = setTimeout(
        handleNoTranscriptTimeout,
        1000
      );
    }
  };

  const checkForMatches = (main_transcript) => {
    console.log("checkForMatches", main_transcript);
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

              autoReciteInProgressRef.current = true;
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
    }
    
  };


  // ---- The effect in the old style ----
  useEffect(() => {
    // Check your refs instead of props/state
    if (autoReciteInProgressRef.current && currentSurahData.current) {
      // We define the async function inside the effect
      const reciteEntireSurah = async () => {
        console.log("Auto reciting Surah:", currentSurahData.current);

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
            console.log("verse1", verse);
            if (!verse) continue;

            // Create rolling window of next 3 verses
            const rollingVerses = currentSurahData.current?.verses
              .slice(i, i + ROLLING_WINDOW_SIZE)
              .map((v, index) => ({
                text: normalizeArabicText(v.text),
                verseId: v.verseId,
                surahId: currentSurahData.current.surahId,
                index: index // Position in rolling window
              }));
            console.log("rollingVerses", rollingVerses);
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
            const checkTranscriptMatch = (transcript) => {
              // Clear existing silence timer
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
              }

              // Restart silence timer
              silenceTimerRef.current = setTimeout(() => {
                console.log(
                  "⚠️ Silence detected for 3 seconds during recitation - stopping"
                );
                if (recognitionRef.current) {
                  isListeningRef.current = false;
                  interruptFlagRef.current = true;
                  autoReciteInProgressRef.current = false;
                  currentSurahData.current = null;
                }
              }, RECITATION_SILENCE_TIMEOUT);

              // const normalizedTranscript = normalizeArabicText(transcript);

              // Get current rolling window verses
              const currentWindow = rollingWindowRef.current;
              console.log("currentWindow", currentWindow);
              
             
              
              // Prepare searchable format for current window only

              const searchableVerses = currentWindow?.map((verse) => ({
                ...verse,
                normalizedText: normalizeArabicText(verse?.text),
              }));
              console.log("searchableVerses", searchableVerses);
              const normalizedTranscript = normalizeArabicText(transcript);
              const fuseInstance = fuseInstanceFn(searchableVerses, 0.4);
              const results = findMultipleMatches(normalizedTranscript, fuseInstance);
              console.log("autorecitation results", results);


               // Check if window is empty
               if (!results || results.length === 0) {
                emptyResultsCounter.current++;
                console.log("Empty window detected. Counter:", emptyResultsCounter.current);
                
                if (emptyResultsCounter.current >= 4) {
                  console.log("Empty window detected 4 times - interrupting recitation");
                  interruptFlagRef.current = true;
                  emptyResultsCounter.current = 0; // Reset counter
                  autoReciteInProgressRef.current = false;
                  currentSurahData.current = null;
                  if (transcript?.length > 10) {
                    doSearchInWholeQuran(transcript);
                  }
                  return false;
                }
              } else {
                // Reset counter if window is not empty
                emptyResultsCounter.current = 0;
              }

              return true;
            };

            // Overwrite onresult with our matching logic
            if (recognitionRef.current) {
              const originalOnResult = recognitionRef.current.onresult;
              recognitionRef.current.onresult = (event) => {
                let transcript = "";
                for (
                  let j = event.resultIndex;
                  j < event.results.length;
                  j++
                ) {
                  transcript += event.results[j][0].transcript + " ";
                }

                checkTranscriptMatch(transcript);
                
                // Otherwise, call the original handler
                if (originalOnResult) {
                  originalOnResult(event);
                }
              };
            }

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
            await new Promise(resolve => {
              const checkSpeaking = setInterval(() => {
                if (!window.speechSynthesis.speaking) {
                  clearInterval(checkSpeaking);
                  resolve();
                }
              }, 100);
            });
            
            // If this was your last verse...
            if (i === currentSurahData.current?.verses?.length - 1) {
              console.log("last verse")
              interruptFlagRef.current = true;
              // Tidy up TTS speed, etc.
              ttsRate.current = 1;
              // e.g. setTtsRate(1);
            }
          }

          // Done reciting
          console.log("Done reciting Surah:", currentSurahData.current?.name);
          // setTranslationRecognizedText("");
          setTranslations([]);
          autoReciteInProgressRef.current = false;
          currentSurahData.current = null;
          resetter();
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

  // useEffect(() => {
  //   if (autoReciteInProgressRef.current && currentSurahData.current) {
  //     const reciteEntireSurah = async () => {
  //       console.log("Auto reciting Surah:", currentSurahData.current?.name);
  //       const startingVerseIndex = surahNameArrayFlag.current ? 
  //         currentVerseIndexRef.current - 1 : 
  //         currentVerseIndexRef.current;

  //       try {
  //         for (let i = startingVerseIndex; i < currentSurahData.current?.verses?.length; i++) {
  //           if (interruptFlagRef.current) {
  //             console.log("Interrupt detected. Stopping Surah recitation.");
  //             resetter();
  //             break;
  //           }

  //           const verse = currentSurahData.current?.verses[i];
  //           if (!verse) continue;

  //           // Create rolling window
  //           const rollingVerses = currentSurahData.current?.verses
  //             .slice(i, i + ROLLING_WINDOW_SIZE)
  //             .map((v) => normalizeArabicText(v.text));
  //           rollingWindowRef.current = rollingVerses;

  //           // Add these console logs
  //           console.log("\n--- Rolling Window Debug ---");
  //           console.log("Current verse index:", i);
  //           console.log("Rolling window verses:");
  //           rollingVerses.forEach((verse, index) => {
  //             console.log(
  //               `Window position ${index + 1}:`,
  //               verse.substring(0, 50) + "..."
  //             );
  //           });
  //           console.log("------------------------\n");


  //           const checkTranscriptMatch = (transcript) => {
  //             console.log("Checking transcript match for:", transcript);
  //             // Clear existing silence timer
  //             if (silenceTimerRef.current) {
  //               clearTimeout(silenceTimerRef.current);
  //             }

  //             // Start new silence timer specific for recitation
  //             silenceTimerRef.current = setTimeout(() => {
  //               console.log(
  //                 "⚠️ Silence detected for 9 seconds during recitation - stopping"
  //               );
  //               if (recognitionRef.current) {
  //                 // recognitionRef.current.abort();
  //                 interruptFlagRef.current = true;
  //                 autoReciteInProgressRef.current = false;
  //                 currentSurahData.current = null;
  //               }
  //             }, RECITATION_SILENCE_TIMEOUT);

  //             const normalizedTranscript = normalizeArabicText(transcript);

  //             // Check similarity with each verse in rolling window
  //             const similarities = rollingVerses.map((verse) =>
  //               calculateSimilarity(normalizedTranscript, verse)
  //             );

  //             console.log("\n--- Transcript Match Debug ---");
  //             console.log(
  //               "Received transcript:",
  //               normalizedTranscript.substring(0, 50) + "..."
  //             );
  //             console.log("Similarity scores:");
  //             rollingVerses.forEach((verse, index) => {
  //               console.log(
  //                 `Verse ${index + 1} similarity:`,
  //                 similarities[index].toFixed(3)
  //               );
  //             });

  //             // Get best match
  //             const bestMatch = Math.max(...similarities);
  //             console.log("Best match score:", bestMatch.toFixed(3));
  //             console.log("------------------------\n");

  //             const SIMILARITY_THRESHOLD = 0.6;

  //             if (bestMatch < SIMILARITY_THRESHOLD) {
  //               console.warn("❌ No matching verse found in rolling window!");
  //               console.warn("Threshold:", SIMILARITY_THRESHOLD);

  //               // Stop recognition
  //               if (recognitionRef.current) {
  //                 recognitionRef.current.abort();
  //               }
  //               interruptFlagRef.current = true;
  //               return false;
  //             }
  //             console.log("✅ Match found! Continuing...");
  //             return true;
  //           };

  //           if (recognitionRef.current) {
  //             const originalOnResult = recognitionRef.current.onresult;
  //             recognitionRef.current.onresult = (event) => {
  //               let transcript = "";
  //               for (let i = event.resultIndex; i < event.results.length; i++) {
  //                 transcript += event.results[i][0].transcript + " ";
  //               }

  //               // Check if transcript matches any verse in rolling window
  //               if (!checkTranscriptMatch(transcript)) {
  //                 return;
  //               }

  //               // Call original onresult handler if match found
  //               if (originalOnResult) {
  //                 originalOnResult(event);
  //               }
  //             };
  //           }

  //           // Process verse - Show current verse only
  //           matchesFoundRef.current = false;
  //           surahEndFlagRef.current = true;
  //           translationRecognizedTextRef.current = verse?.text;
  //           setTranslations([verse?.translation]); // Show only current verse translation
  //           lastAyahIdRef.current = i;

  //           // Update previous ayah list with only the current verse
  //           setPreviousAyaList((prev) => {
  //             const newVerse = {
  //               ...verse,
  //               surahId: currentSurahData.current?.surahId,
  //               verseId: verse?.verseId
  //             };

  //             // Keep only verses up to the current one
  //             const filteredPrev = prev.filter(v => 
  //               v.surahId !== currentSurahData.current?.surahId || 
  //               v.verseId < verse?.verseId
  //             );

  //             return [...filteredPrev, newVerse];
  //           });

  //           // Speak the translation
  //           speakTranslation(verse?.translation, { isMutedRef, ttsRate, language });

  //           // Wait for speech to complete before moving to next verse
  //           await new Promise(resolve => {
  //             const checkSpeaking = setInterval(() => {
  //               if (!window.speechSynthesis.speaking) {
  //                 clearInterval(checkSpeaking);
  //                 resolve();
  //               }
  //             }, 100);
  //           });

  //           if (i === currentSurahData.current.verses.length - 1) {
  //             surahEndFlagRef.current = true;
  //             ttsRate.current = 1;
  //           }
  //         }
  //         resetter();
  //       } catch (error) {
  //         console.error("Error in reciteEntireSurah:", error);
  //         resetter();
  //       }
  //     };

  //     reciteEntireSurah();
  //   }
  // }, [autoReciteInProgressRef.current, currentSurahData.current]);



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
  };

  return (
    <RecitationContext.Provider value={providerValue}>
      {children}
    </RecitationContext.Provider>
  );
};
