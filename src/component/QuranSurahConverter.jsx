import React from 'react';
import quran_eng from "../data/quran_eng.json";

const QuranSurahConverter = ({ quranData=quran_eng }) => {
     // Process each surah and build combined strings for text and translation
  const convertedQuran = quranData.map(surah => {
    let fullText = "";
    let fullTranslation = "";
    
    surah.verses.forEach((verse, index) => {
      // Append the verse text followed by "۞"
      fullText += verse.text + " ۞";
      // Append the verse translation followed by "۞"
      fullTranslation += verse.translation + " ۞";
      
      // Optionally add a space between verses if not the last one
      if (index !== surah.verses.length - 1) {
        fullText += " ";
        fullTranslation += " ";
      }
    });
    
    return {
      text: fullText.trim(),
      translation: fullTranslation.trim()
    };
  });

  // For demonstration, we're logging the new JSON structure to the console
  console.log(JSON.stringify(convertedQuran, null, 2));

  return (
    <div>
      <h1>Converted Quran JSON</h1>
      <pre>{JSON.stringify(convertedQuran, null, 2)}</pre>
    </div>
  );
};

export default QuranSurahConverter;
