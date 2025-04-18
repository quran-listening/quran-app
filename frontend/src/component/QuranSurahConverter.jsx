
import React, { useState, useEffect } from "react";
import quran_urd from "../data/quran_urd.json";
import { normalizeArabicText } from "../utils/normalizeArabicText";


const QuranSurahConverter = ({ quranData = quran_urd }) => {
  const [convertedQuran, setConvertedQuran] = useState([]);

  useEffect(() => {
    const transformedQuran = [];

    quranData.forEach((surah) => {
      surah.verses.forEach((verse, index) => {
        transformedQuran.push({
          verseId: index,
          name: surah.name, // Surah Name
          surahId: surah.surahId, // Surah ID
          text: verse.text, // Arabic Text
          translation: verse.translation, // English Translation
          normalizedText: normalizeArabicText(verse.text), // Normalized Arabic
        });
      });
    });

    setConvertedQuran(transformedQuran);
    console.log("Converted Quran Data:", transformedQuran);
  }, [quranData]);

  return (
    <div>
      <h1>Converted Quran JSON</h1>
      <pre>{JSON.stringify(convertedQuran, null, 2)}</pre>
    </div>
  );
};

export default QuranSurahConverter;

