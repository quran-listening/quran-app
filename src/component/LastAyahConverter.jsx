import React, { useState, useEffect } from "react";
import quran_urd from "../data/quran_urd.json";
import { normalizeArabicText } from "../utils/normalizeArabicText";

const LastAyahConverter = ({ quranData = quran_urd }) => {
  const [convertedQuran, setConvertedQuran] = useState([]);

  useEffect(() => {
    const transformedQuran = [];

    // Loop over each surah
    quranData.forEach((surah) => {
      // Grab the last verse of this surah
      const lastVerse = surah.verses[surah.verses.length - 1];

      // Push a simplified object with only that last verse
      transformedQuran.push({
        name: surah.name,              // Surah name
        normalizedText: normalizeArabicText(lastVerse.text), // Normalized Arabic
      });
    });

    setConvertedQuran(transformedQuran);
    console.log("Converted Quran Data:", transformedQuran);
  }, [quranData]);

  return (
    <div>
      <h1>Converted Quran JSON (Last Verse of Each Surah)</h1>
      <pre>{JSON.stringify(convertedQuran, null, 2)}</pre>
    </div>
  );
};

export default LastAyahConverter;
