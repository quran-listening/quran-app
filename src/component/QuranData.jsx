import React, { useEffect, useState } from "react";

const QuranData = () => {
  const [quranData, setQuranData] = useState(null);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_en.json")
      .then((response) => response.json())
      .then((data) => {
        // Process each Surah
        const updatedData = data.map((surah, index) => {
            console.log("surah>>>", surah)
          // Replace `id` with `surahId`
          const modifiedSurah = { ...surah, surahId: surah.id };
          console.log("modifiedSurah>>>", modifiedSurah)
        //   delete modifiedSurah.id; // Remove old `id` key

          if (index === 0) {
            // Remove only the first verse (id: 1)
            const filteredVerses = surah.verses.filter((verse) => verse.id !== 1);

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

        setQuranData(updatedData);
        console.log("updatedData",updatedData)
      })
      .catch((error) => console.error("Error fetching Quran JSON:", error));
  }, []);

  return (
    <div>
      <h2>Quran Data (Updated)</h2>
      {console.log("quranData",quranData)}
      {quranData ? (
        <pre>{JSON.stringify(quranData, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default QuranData;
