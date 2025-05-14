// src/components/RecitationContainer.js
import React, { useContext, useRef, useEffect, useState } from "react";
import RecitationContext from "../context/RecitationContext";
import {
  Box,
  Button,
  Grid,
  Option,
  Select,
  selectClasses,
  Typography,
  Checkbox,
  Input,
} from "@mui/joy";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import { Link, useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

import kalima from "../assets/img/kalima.svg";
import mosque from "../assets/img/mosque2.svg";
import start from "../assets/img/start-icon.svg";
import muteIcon from "../assets/img/mute1.png";
import unmuteIcon from "../assets/img/unmute1.png";
import microphone from "../assets/img/microphone.png";
import micMute from "../assets/img/mic_mute.png";
import CircularProgress from "@mui/material/CircularProgress";
// Styles
import {
  AyatBox,
  backgroundBg,
  bodyXs,
  contentWrapper,
  dateDouble,
  h2,
  timeStyle,
  welcomeCard,
  mosqueImg,
  stopRecordingBtn,
} from "../styles/VerseTranslationStyle.js";

import MuiAlert from "@mui/material/Alert";

// Hooks & components
import useMicrophone from "../hooks/useMicrophones";
import LiveMicVisualizer from "./LiveMicVisualizer";
import FeedbackForm from "./FeedbackForm";
import { ClickAwayListener, Snackbar, Tooltip, Popover } from "@mui/material";
import { languagesData } from "../utils/constant.js";
import GaDashboard from "./GaDashboard.jsx";

const RecitationContainer = () => {
  const {
    // States
    recognizedText,
    translationRecognizedTextRef,
    language,
    previousAyaList,
    currentSurahData,
    ttsRate,
    isMutedRef,
    checkdCheckBox,
    matchesFoundRef,
    flag,
    isMicMutedRef,
    handleMicMute,

    // Setters
    setLanguage,
    setCheckdCheckBox,

    // Methods
    startListening,
    stopListening,
    handleMute,
    autorecitationCheckRef,
    quranDataRef,
    isLoading,
    speechEngine,
    setSpeechEngine,
    isListeningRef,
    jumpToVerse,
    resetter,
  } = useContext(RecitationContext);

  const {
    microphones,
    selectedMic,
    setSelectedMic,
    speakers,
    selectedSpeaker,
    setSelectedSpeaker,
  } = useMicrophone();

  const viewWidth = window.innerWidth;
  const ayatListRef = useRef(null);
  const [ttsRateState, setTtsRateState] = useState(ttsRate.current);
  // const [ttsRateState, setTtsRateState] = useState(1.00);

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent); // Detect iOS

  // Add new state for start text visibility
  const [showStartText, setShowStartText] = useState(true);
  const [displayLines, setDisplayLines] = useState([]);

  const [arabicRecognizedText, setArabicRecognizedText] = useState("");

  const [whisperKey, setWhisperKey] = useState(() =>
    localStorage.getItem("whisperKey") || ""
  );
  const [loading, setLoading] = useState(false); // For API call loading state
  const [apiResponse, setApiResponse] = useState({}); // For API call loading state
  const [snackbarOpen, setSnackbarOpen] = useState(false); // For Snackbar visibility
  const [snackbarMessage, setSnackbarMessage] = useState(""); // For Snackbar message
  const [isMuted, setIsMuted] = useState(true);
  // Add timer state near other state declarations
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [matchesFound, setMatchesFound] = useState(true);
  const [surahData, setSurahData] = useState(currentSurahData);

  const [autoRecitation, setAutoRecitation] = useState(true);
  // Add these state declarations near other useState declarations
  const [surahNumber, setSurahNumber] = useState("");
  const [verseNumber, setVerseNumber] = useState("");
  // Add these new state variables near other useState declarations
  const [surahError, setSurahError] = useState("");
  const [verseError, setVerseError] = useState("");

  const navigate = useNavigate();

  const [textLines, setTextLines] = useState([]);

  const [keyAnchorEl, setKeyAnchorEl] = useState(null);
  const [keyInfo, setKeyInfo] = useState(() => {
    const storedKey = localStorage.getItem("whisperKey");
    const storedDate = localStorage.getItem("whisperKeyDate");
    return storedKey ? {
      lastFour: storedKey.slice(-4),
      date: storedDate || new Date().toISOString()
    } : null;
  });

  // useEffect(() => {
  //   if (recognizedText) {
  //     setTextLines(prevLines => {
  //       const newLines = [...prevLines, recognizedText];
  //       // Keep only the last 3 lines
  //       return newLines.slice(-3);
  //     });
  //   }
  // }, [recognizedText]);


  useEffect(() => {
    if (!recognizedText) return;

    const lines = recognizedText
      .split(/\r?\n|\r|\\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    setDisplayLines(viewWidth <= 800 ? lines.slice(-3) : lines);
  }, [recognizedText, viewWidth]);

  useEffect(() => {
    if (ayatListRef.current) {
      ayatListRef.current.scrollTo({
        top: ayatListRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [previousAyaList]);

  useEffect(() => {
    setMatchesFound(matchesFoundRef.current);
  }, [matchesFoundRef.current]);

  useEffect(() => {
    setSurahData(currentSurahData.current);
  }, [currentSurahData.current]);

  // For date/time display
  const date = new Date();
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const day = date.toLocaleDateString("en-US", { day: "numeric" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.toLocaleDateString("en-US", { year: "numeric" });
  const formattedDate = `${weekday}, ${day} ${month} ${year}`;

  const [tooltipOpen, setTooltipOpen] = useState(false);

  const handleLanguageChange = (event, value) => {
    setLanguage(value);
    localStorage.setItem("language", value);
  };

  const handleCheckBoxChange = () => {
    console.log("Checkbox clicked, current value:", checkdCheckBox);

    setCheckdCheckBox((prev) => !prev);
  };

  const handleTooltipClose = () => {
    setTooltipOpen(false);
  };

  const handleMuteChange = () => {
    if (language === "urdu") {
      setTooltipOpen(true);
      return;
    }
    handleMute();
    setIsMuted((prev) => !prev);
  };

  useEffect(() => {
    setArabicRecognizedText(translationRecognizedTextRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationRecognizedTextRef.current]);

  useEffect(() => {
    setIsMuted(isMutedRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMutedRef.current]);

  useEffect(() => {
    if (checkdCheckBox) {
      setTtsRateState(ttsRate.current);
    } else {
      setTtsRateState(1.0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsRate.current]);

  useEffect(() => {
    if (checkdCheckBox) {
      setTtsRateState(1.0);
    } else {
      setTtsRateState(1.0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkdCheckBox]);

  useEffect(() => {
    ttsRate.current = ttsRateState;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsRateState]);

  // Add effect to hide start text when Arabic is detected
  useEffect(() => {
    if (recognizedText && showStartText) {
      setShowStartText(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognizedText]);

  useEffect(() => {
    if (autoRecitation) {
      autorecitationCheckRef.current = true;
    } else {
      autorecitationCheckRef.current = false;
    }
  }, [autoRecitation]);

  // Format time function
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Add useEffect for timer management
  useEffect(() => {
    if (flag) {
      // Start timer when listening begins
      const interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } else {
      // Clear timer when listening stops
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setElapsedTime(0);
    }
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [flag]);

  const handleDevClick = () => {
    navigate(`/dev`);
  };

  // Add handler for TTS rate changes
  const handleTTSRateChange = (change) => {
    const newRate = Math.max(0.7, Math.min(1.5, ttsRateState + change));
    setTtsRateState(newRate);
    // ttsRate.current = newRate;
  };

  // Add this validation function
  const validateInputs = () => {
    let isValid = true;

    // Validate surah number (1-114)
    if (!surahNumber) {
      setSurahError("Surah number is required");
      isValid = false;
    } else if (surahNumber < 1 || surahNumber > 114) {
      setSurahError("Surah number must be between 1 and 114");
      isValid = false;
    } else {
      setSurahError("");
    }

    const total_verses = quranDataRef.current[surahNumber - 1]?.verses.length;

    // Validate verse number (positive number)
    if (!verseNumber) {
      setVerseError("Verse number is required");
      isValid = false;
    } else if (verseNumber < 1 || verseNumber > total_verses) {
      setVerseError("Verse number must be positive");
      isValid = false;
    } else {
      setVerseError("");
    }

    return isValid;
  };

  // Update the handleJumpToVerse function
  const handleJumpToVerse = () => {
    if (validateInputs()) {
      resetter();
      jumpToVerse(parseInt(surahNumber), parseInt(verseNumber));
    }
  };

  // Update the input handlers to clear errors on change
  const handleSurahChange = (e) => {
    setSurahNumber(e.target.value);
    setSurahError("");
  };

  const handleVerseChange = (e) => {
    setVerseNumber(e.target.value);
    setVerseError("");
  };


  // Handle speech engine change
  const handleSpeechEngineChange = (event, value) => {
    const newVal = value ?? event?.target?.value;
    if (!newVal) return;
    if (isListeningRef.current) return;

    setSpeechEngine(newVal);
    window.gtag('event', 'engine_selected', { feature: newVal });  // "browser" | "whisper"

    if (newVal === "whisper") {
      let key = localStorage.getItem("whisperKey");
      if (!key) {
        key = prompt("Enter your personal OpenAI API key")?.trim();
        if (!key) return setSpeechEngine("browser");

        localStorage.setItem("whisperKey", key);
      }
      setWhisperKey(key);

      checkApiKeyValidity(key);
    }
  };

  // Check API key validity
  // Update API key validation function
  const checkApiKeyValidity = async (key) => {
    setLoading(true);
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Invalid API key");
      }

      // Store key and date if valid
      localStorage.setItem("whisperKeyDate", new Date().toISOString());
      setKeyInfo({
        lastFour: key.slice(-4),
        date: new Date().toISOString()
      });
      setLoading(false);
    } catch (error) {
      console.error("API key validation failed:", error);
      setSnackbarMessage(error.message || "Invalid API key. Please check your key and try again.");
      setSnackbarOpen(true);
      localStorage.removeItem("whisperKey");
      localStorage.removeItem("whisperKeyDate");
      setKeyInfo(null);
      setSpeechEngine("browser");
    } finally {
      setLoading(false);
    }
  };

  // Snackbar close handler
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const splitLines = txt =>
    txt
      .split(/\r?\n|\r|\\n/)        // any newline
      .map(l => l.trim())
      .filter(Boolean);             // drop blanks

  const allLines = splitLines(recognizedText);   // everything (desktop view)
  const last3Mobile = allLines.slice(-3);

  const handleKeyClick = (event) => {
    setKeyAnchorEl(event.currentTarget);
  };

  const handleKeyClose = () => {
    setKeyAnchorEl(null);
  };

  const handleClearKey = () => {
    localStorage.removeItem("whisperKey");
    localStorage.removeItem("whisperKeyDate");
    setKeyInfo(null);
    setWhisperKey("");
    setSpeechEngine("browser");
    handleKeyClose();
  };

  // Render
  return (
    <Box sx={backgroundBg}>
      {isLoading || loading ? (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100vh",
            }}
          >
            <CircularProgress />
          </Box>
        </>
      ) : (
        <Box sx={contentWrapper}>
          {/* Snackbar for displaying errors */}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <MuiAlert
              elevation={6}
              variant="filled"
              onClose={handleCloseSnackbar}
              severity="error"
            >
              {snackbarMessage}
            </MuiAlert>
          </Snackbar>
          {!flag && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <img src={kalima} alt="Logo" />
              </Box>

              <Box sx={welcomeCard}>

                <Box sx={{ textAlign: "left" }}>
                  <Box sx={h2}>Real-time Quran Translation App</Box>
                  <Box sx={{ marginTop: "2px", ...bodyXs }}>
                    This open source app will help you understand the divine
                    message of the Holy Quran by translating live Arabic
                    recitation.
                  </Box>
                  <Box sx={dateDouble}>
                    {/* <Box sx={{ marginTop: "10px", ...bodyXs }}>
                    {formattedDate}
                  </Box> */}
                  </Box>
                </Box>
                <Box sx={mosqueImg}>
                  <img
                    src={mosque}
                    alt="Mosque"
                    style={{ borderBottomRightRadius: "20px" }}
                  />
                </Box>
              </Box>
            </Box>
          )}
          {flag ? (
            // ---------------- LIVE MODE ----------------
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Box
                      sx={{
                        color: "#fff",
                        marginBottom: "20px",
                        marginTop: "20px",
                        textAlign: "center",
                        fontSize: "12px",
                        maxWidth: "800px",
                      }}
                    >
                      The open source app may not detect Arabic correctly and
                      give incorrect search results. Please always match the
                      search results before listening to the translation. You
                      can restart searching and turn off the mic access by
                      reloading the page
                    </Box>

                    <Box
                      sx={{
                        color: "#fff",
                        textAlign: "center",
                        fontSize: "12px",
                        maxWidth: "800px",
                      }}
                    >
                      You can help improve this open source app. Contact us
                      below using the feedback form and indicate you would like
                      to help improve this app
                    </Box>
                  </Box>
                  <Box sx={{ mt: 4 }}>
                    <Typography sx={{ color: '#fff', fontSize: '18px', mb: 1 }}>
                      Engine usage (last 7 days)
                    </Typography>
                    
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      my: 1,
                      flexWrap: "wrap",
                      gap: "5px"
                    }}
                  >

                    <Box
                      sx={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Box
                        onClick={() => {
                          if (speechEngine === "whisper") {
                            handleMicMute();
                          }
                        }}
                        sx={{
                          cursor: speechEngine === "whisper" ? 'pointer' : 'default',
                          opacity: speechEngine === "whisper" && isMicMutedRef.current ? 0.5 : 1,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        <img
                          src={speechEngine === "whisper" && isMicMutedRef.current ? micMute : microphone}
                          alt={speechEngine === "whisper" && isMicMutedRef.current ? "Mic Muted" : "Mic Active"}
                          width={25}
                          height={25}
                          style={{ filter: speechEngine === "whisper" && isMicMutedRef.current ? 'invert(1)' : 'none' }}
                        />
                      </Box>
                      <Box ml={2} mt={1}>
                        <LiveMicVisualizer isMuted={speechEngine === "whisper" && isMicMutedRef.current} />
                      </Box>
                    </Box>



                    {viewWidth <= 800 && <ClickAwayListener onClickAway={handleTooltipClose}>
                      <div>
                        <Tooltip
                          PopperProps={{
                            disablePortal: true,
                          }}
                          onClose={handleTooltipClose}
                          open={tooltipOpen && language === "urdu"}
                          disableFocusListener
                          disableHoverListener
                          disableTouchListener
                          title="Coming Soon"
                          placement="top" // Add this line to show tooltip on top
                          arrow // Add this to show an arrow pointing to the element
                        >
                          <Box
                            onClick={handleMuteChange}
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "flex-end",
                              cursor: "pointer",
                            }}
                          >
                            <img
                              id="muteIcon"
                              src={isMuted ? muteIcon : unmuteIcon}
                              alt={isMuted ? "Unmute" : "Mute"}
                              width={25}
                              height={25}
                            />
                          </Box>
                        </Tooltip>
                      </div>
                    </ClickAwayListener>}
                    <Box sx={{ color: "#fff", fontSize: "14px", textAlign: "center", mt: 1, mb: 1 }}>
                      {speechEngine === "whisper"
                        ? "Selected transcription (Whisper OpenAi)"
                        : "Selected transcription (window speech api)"}
                    </Box>
                    {viewWidth > 800 && <Box sx={{ display: "flex", alignItems: viewWidth < 800 ? "flex-start" : "center", justifyContent: viewWidth < 600 ? "flex-start" : "center", flexWrap: "wrap", gap: "5px" }}>
                      <Typography sx={{ color: "#fff", fontSize: "15px", marginRight: "10px" }}>Start Recitation from:</Typography>
                      <Box>
                        <Input
                          style={{ width: viewWidth < 800 ? "100%" : "150px" }}
                          placeholder="surah number"
                          type="number"
                          value={surahNumber}
                          onChange={handleSurahChange}
                          sx={{
                            marginRight: 1,
                            '&.Mui-error': {
                              borderColor: '#f44336',
                            },
                            ...(surahError && {
                              borderColor: '#f44336',
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                            })
                          }}
                          error={!!surahError}
                        />
                        {surahError && (
                          <Typography
                            sx={{
                              color: '#f44336',
                              fontSize: '0.75rem',
                              ml: 1
                            }}
                          >
                            {surahError}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Input
                          style={{ width: viewWidth < 800 ? "100%" : "150px" }}
                          placeholder="verse number"
                          type="number"
                          value={verseNumber}
                          onChange={handleVerseChange}
                          sx={{
                            marginRight: 1,
                            '&.Mui-error': {
                              borderColor: '#f44336',
                            },
                            ...(verseError && {
                              borderColor: '#f44336 !important',
                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                              '& input': {
                                color: '#f44336',
                              }
                            })
                          }}
                          error={!!verseError}
                          slotProps={{
                            input: {
                              sx: {
                                '--Input-decoratorChildHeight': '45px',
                              },
                            },
                            helperText: {
                              sx: {
                                color: '#f44336',
                              },
                            },
                          }}
                        />
                        <Box>
                          {verseError && (
                            <Typography
                              sx={{
                                color: '#f44336',
                                fontSize: '0.75rem',
                                ml: 1
                              }}
                            >
                              {verseError}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Button
                        onClick={handleJumpToVerse}
                        sx={{
                          backgroundColor: "#2C5741",
                          color: "#fff",
                          "&:hover": {
                            backgroundColor: "#234432",
                          },
                          width: viewWidth < 800 ? "100%" : "150px"
                        }}
                      >
                        Go
                      </Button>
                    </Box>
                    }
                    {viewWidth > 800 && <ClickAwayListener onClickAway={handleTooltipClose}>
                      <div>
                        <Tooltip
                          PopperProps={{
                            disablePortal: true,
                          }}
                          onClose={handleTooltipClose}
                          open={tooltipOpen && language === "urdu"}
                          disableFocusListener
                          disableHoverListener
                          disableTouchListener
                          title="Coming Soon"
                          placement="top" // Add this line to show tooltip on top
                          arrow // Add this to show an arrow pointing to the element
                        >
                          <Box
                            onClick={handleMuteChange}
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "flex-end",
                              cursor: "pointer",
                            }}
                          >
                            <img
                              id="muteIcon"
                              src={isMuted ? muteIcon : unmuteIcon}
                              alt={isMuted ? "Unmute" : "Mute"}
                              width={25}
                              height={25}
                            />
                          </Box>
                        </Tooltip>
                      </div>
                    </ClickAwayListener>}

                  </Box>

                  <Box
                    sx={{
                      ...AyatBox,
                      resize: "vertical",
                      overflow: "auto",
                      height: "300px", // Set fixed initial height
                      minHeight: "300px",
                      maxHeight: "80vh",
                      position: "relative", // Required for absolute positioning of pseudo-element
                      cursor: "default", // Reset default cursor
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: "20px",
                        height: "20px",
                        cursor: "ns-resize",
                      },
                    }}
                    ref={ayatListRef}
                  >
                    {matchesFound && (
                      <Box
                        sx={{
                          direction: "rtl",
                          color: "#fff",
                          position: "sticky",
                          top: "-11px",
                          right: "-5px",
                          minHeight: "30px",
                          maxHeight: "70px",
                          backgroundColor: "#1E1F26",
                          padding: "10px",
                          zIndex: 1,
                          overflow: "auto",
                          "&::-webkit-scrollbar": {
                            display: "none"
                          },
                          scrollbarWidth: "none",
                          msOverflowStyle: "none"
                        }}
                        ref={(el) => {
                          if (el) {
                            el.scrollTop = el.scrollHeight;
                          }
                        }}
                      >
                        {showStartText ? (
                          "Start Reciting. Turn on speaker to listen to translation"
                        ) : (
                          displayLines.map((line, idx) => (
                            <Box key={idx} sx={{ wordBreak: "break-word" }}>
                              {line}
                            </Box>
                          ))
                        )}
                      </Box>
                    )}
                    {arabicRecognizedText?.length > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          fontSize: "18px",
                          marginBottom: "10px",
                        }}
                      >
                        Surah: {surahData?.name}
                      </Box>
                    )}
                    <Box>

                      {previousAyaList?.length > 0 ? (
                        previousAyaList?.map(
                          (
                            {
                              surahId,
                              verseId,
                              surahName,
                              ayahs,
                              normalizedText,
                              translation,
                              text,
                            },
                            idx
                          ) => (
                            <Box key={idx}>
                              <Box
                                sx={{
                                  direction: "rtl",
                                  color: "#fff",
                                  marginTop: "10px",
                                }}
                              >
                                <span
                                  style={{
                                    background:
                                      previousAyaList?.length === idx + 1
                                        ? "#535353"
                                        : "transparent",
                                  }}
                                >
                                  {`[${surahId}:${verseId}] - ${text}`}
                                </span>
                              </Box>

                              <Box sx={{ color: "#fff", marginTop: "10px" }}>
                                <span
                                  style={{
                                    color: "#fff",
                                    backgroundColor:
                                      previousAyaList?.length === idx + 1
                                        ? "#535353"
                                        : "transparent",
                                  }}
                                >
                                  {`[${surahId}:${verseId}] - ${translation}`}
                                </span>
                              </Box>
                            </Box>
                          )
                        )
                      ) : (
                        <Box>
                          <Box
                            sx={{
                              direction: "rtl",
                              color: "#fff",
                              marginTop: "10px",
                            }}
                          >
                            <p style={{ color: "#fff" }}>
                              No Quran verse matched yet
                            </p>
                          </Box>

                          <Box sx={{ color: "#fff", marginTop: "10px" }}>
                            <p style={{ color: "#fff" }}>
                              No translation available.
                            </p>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Time display below recitation box for viewWidth <= 900 */}
                  {viewWidth <= 900 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        color: "#fff",
                        mt: 1,
                        mb: 1
                      }}
                    >
                      <Typography sx={{ color: "#fff" }}>
                        Time: {formatTime(elapsedTime)}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} sm={12} md={6} lg={4}>
                  {/* New combined checkboxes for viewWidth <= 900 */}
                  {viewWidth <= 900 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                        <Checkbox
                          sx={{
                            color: "#fff",
                            "&.Mui-checked": {
                              color: "#fff",
                            },
                          }}
                          checked={autoRecitation}
                          onChange={(e) => setAutoRecitation(e.target.checked)}
                        />
                        <Typography sx={{ color: "#fff", marginLeft: "5px", fontSize: "15px" }}>
                          Auto Recitation until "اللّٰهُ أَكْبَرْ"
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                          sx={{
                            color: "#fff",
                            "&.Mui-checked": {
                              color: "#fff",
                            },
                          }}
                          checked={checkdCheckBox}
                          onChange={handleCheckBoxChange}
                          inputProps={{ "aria-label": "controlled" }}
                        />
                        <Typography sx={{ color: "#fff", marginLeft: "5px", fontSize: "14px" }}>
                          Auto
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      color: "#fff",
                    }}
                  >
                    <Typography sx={{ color: "#fff" }}>
                      Select Microphone
                    </Typography>
                    <Select
                      fullWidth
                      placeholder="Select Microphone"
                      value={selectedMic}
                      onChange={(event, val) => setSelectedMic(val)}
                      indicator={<KeyboardArrowDown />}
                      sx={{
                        width: "100%",
                        marginTop: "5px",
                        backgroundColor: "#2C5741",
                        border: "1px solid #fff",
                        color: "#fff",
                        "&:hover ": {
                          backgroundColor: "#2C5741",
                        },
                        [`& .${selectClasses.indicator}`]: {
                          transition: "0.2s",
                          [`&.${selectClasses.expanded}`]: {
                            transform: "rotate(-180deg)",
                          },
                        },
                      }}
                    >
                      {microphones.map((mic) => (
                        <Option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label || `Mic ${mic.deviceId}`}
                        </Option>
                      ))}
                    </Select>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={12} md={6} lg={4}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "#fff",
                    }}
                  >
                    {isIOS ? (
                      <p>
                        🔊 On iPhone, change the output speaker manually using
                        the Control Center.
                      </p>
                    ) : (
                      <Box sx={{ width: "100%" }}>
                        <Typography sx={{ color: "#fff" }}>
                          Select Speaker{" "}
                        </Typography>

                        <Select
                          fullWidth
                          placeholder="Select Speaker "
                          value={selectedSpeaker}
                          onChange={(event, val) => setSelectedSpeaker(val)}
                          indicator={<KeyboardArrowDown />}
                          sx={{
                            width: "100%",
                            marginTop: "5px",
                            backgroundColor: "#2C5741",
                            border: "1px solid #fff",
                            color: "#fff",
                            "&:hover ": {
                              backgroundColor: "#2C5741",
                            },
                            [`& .${selectClasses.indicator}`]: {
                              transition: "0.2s",
                              [`&.${selectClasses.expanded}`]: {
                                transform: "rotate(-180deg)",
                              },
                            },
                          }}
                        >
                          {speakers?.length > 0 &&
                            speakers?.map((mic, index) => (
                              <Option key={index} value={mic.deviceId}>
                                {mic.label || `🎤 Microphone ${mic.deviceId}`}
                              </Option>
                            ))}
                        </Select>
                      </Box>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} sm={12} md={12} lg={4}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      color: "#fff",
                    }}
                  >
                    <Box mr={1} sx={{ color: "#fff", display: "flex" }}>
                      {" "}
                      <Typography sx={{ color: "#fff", fontSize: "15px" }}>Translation Speed ={" "}</Typography>
                      {!checkdCheckBox && (
                        <Box
                          sx={{
                            mx: 1,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            border: "1px solid #fff",
                            width: "20px",
                            height: "20px",
                            borderRadius: "5px",
                            cursor: "pointer",
                          }}
                          onClick={() => handleTTSRateChange(-0.1)}
                        >
                          <RemoveIcon sx={{ fontSize: "12px" }} />
                        </Box>
                      )}
                      {ttsRateState.toFixed(2)}
                      {!checkdCheckBox && (
                        <Box
                          sx={{
                            ml: 1,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            border: "1px solid #fff",
                            width: "20px",
                            height: "20px",
                            borderRadius: "5px",
                            cursor: "pointer",
                          }}
                          onClick={() => handleTTSRateChange(0.1)}
                        >
                          <AddIcon sx={{ fontSize: "12px" }} />
                        </Box>
                      )}
                    </Box>
                    {/* Only show Auto checkbox here for viewwidth > 900 */}
                    {viewWidth > 900 && (
                      <>
                        <Checkbox
                          sx={{
                            color: "#fff",
                            "&.Mui-checked": {
                              color: "#fff",
                            },
                          }}
                          checked={checkdCheckBox}
                          onChange={handleCheckBoxChange}
                          inputProps={{ "aria-label": "controlled" }}
                        />
                        <Typography sx={{ color: "#fff", marginLeft: "5px", fontSize: "14px" }}>
                          Auto
                        </Typography>
                      </>
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      color: "#fff",
                      mt: 1,
                    }}
                  >
                    <Box sx={{ display: viewWidth > 900 ? 'flex' : 'none', alignItems: 'center', mr: 2, justifyContent: 'flex-end' }}>
                      <Checkbox
                        sx={{
                          color: "#fff",
                          "&.Mui-checked": {
                            color: "#fff",
                          },
                        }}
                        checked={autoRecitation}
                        onChange={(e) => setAutoRecitation(e.target.checked)}
                      />
                      <Typography sx={{ color: "#fff", marginLeft: "5px" }}>
                        Auto Recitation until "اللّٰهُ أَكْبَرْ"
                      </Typography>
                    </Box>
                    {/* Only show time here for viewWidth > 900 */}
                    {viewWidth > 900 && (
                      <Typography sx={{ color: "#fff" }}>
                        Time: {formatTime(elapsedTime)}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "column",
                  marginTop: "30px",
                }}
              >
                <Box sx={{ marginTop: "20px" }}>
                  <Button
                    sx={stopRecordingBtn("#8a1225")}
                    onClick={stopListening}
                  >
                    Stop Listening
                  </Button>
                </Box>
                <Box sx={{margin:"30px 0 0 0"}}>

              <GaDashboard />
                </Box>

                <Box
                  sx={{
                    marginTop: "30px",
                    fontSize: "32px",
                    color: "#fff",
                    fontWeight: "500",
                  }}
                >
                  Listening...
                </Box>

                <FeedbackForm />
                <Box sx={{ marginTop: "30px" }}>
                  <Button
                    onClick={handleDevClick}
                    sx={{
                      color: "#999696",
                      textDecoration: "none",
                      cursor: "pointer",
                      backgroundColor: "transparent",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                      },
                    }}
                  >
                    Become a developer click here
                  </Button>
                </Box>
              </Box>

            </Box>
          ) : (
            // ---------------- INITIAL MODE ----------------
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                marginTop: "30px",
              }}
            >
              <Select
                placeholder="Select Language"
                value={language}
                onChange={handleLanguageChange}
                indicator={<KeyboardArrowDown />}
                sx={{
                  width: 240,
                  backgroundColor: "#2C5741",
                  border: "1px solid #fff",
                  color: "#fff",
                  "&:hover ": {
                    backgroundColor: "#2C5741",
                  },
                  [`& .${selectClasses.indicator}`]: {
                    transition: "0.2s",
                    [`&.${selectClasses.expanded}`]: {
                      transform: "rotate(-180deg)",
                    },
                  },
                }}
              >
                {Object.keys(languagesData)?.map((lang) => (
                  <Option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="Select speech engine"
                value={speechEngine}
                onChange={handleSpeechEngineChange}
                indicator={<KeyboardArrowDown />}
                sx={{
                  width: 240,
                  marginTop: "10px",
                  backgroundColor: "#2C5741",
                  border: "1px solid #fff",
                  color: "#fff",
                  "&:hover ": {
                    backgroundColor: "#2C5741",
                  },
                  [`& .${selectClasses.indicator}`]: {
                    transition: "0.2s",
                    [`&.${selectClasses.expanded}`]: {
                      transform: "rotate(-180deg)",
                    },
                  },
                }}
              >
                <Option value="browser">Browser Speech API</Option>
                <Option value="whisper">OpenAI Whisper</Option>
              </Select>

              {speechEngine === "whisper" && keyInfo && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box
                    onClick={handleKeyClick}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      }
                    }}
                  >
                    <Typography sx={{ color: '#fff', fontSize: '14px' }}>
                      Key: ••••{keyInfo.lastFour}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Popover
                open={Boolean(keyAnchorEl)}
                anchorEl={keyAnchorEl}
                onClose={handleKeyClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
                PaperProps={{
                  sx: {
                    backgroundColor: '#2C5741',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }
                }}
              >
                <Box sx={{ minWidth: '200px' }}>
                  <Typography sx={{ mb: 1, color: '#fff' }}>
                    Last 4 digits: {keyInfo?.lastFour}
                  </Typography>
                  <Typography sx={{ mb: 2, fontSize: '14px', color: '#fff' }}>
                    Added: {new Date(keyInfo?.date).toLocaleString()}
                  </Typography>
                  <Button
                    onClick={handleClearKey}
                    sx={{
                      backgroundColor: '#8a1225',
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: '#6d0e1d',
                      },
                      width: '100%'
                    }}
                  >
                    Clear Key
                  </Button>
                </Box>
              </Popover>

              <Box
                sx={{ marginTop: "20px", cursor: "pointer" }}
                onClick={startListening}
              >
                <img src={start} alt="Start" />
              </Box>
              <Box
                sx={{
                  marginTop: "30px",
                  fontSize: "32px",
                  color: "#fff",
                  fontWeight: "500",
                }}
              >
                Start Translating
              </Box>
              <Box sx={{ marginTop: "30px" }}>
                <Button
                  onClick={handleDevClick}
                  sx={{
                    color: "#999696",
                    textDecoration: "none",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  Become a developer click here
                </Button>
              </Box>
              <Box
                sx={{
                  marginTop: "10px",
                  textAlign: "center",
                  fontSize: "14px",
                }}
              >
                <Link to="/reference" style={{ color: "#fff" }}>
                  For Translation Reference
                </Link>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default RecitationContainer;