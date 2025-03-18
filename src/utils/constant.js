export const languagesList = {
  english: "en-US", // English (United States)
  urdu: "ur-PK", // Urdu (Not supported in your browser TTS)
  bengali: "bn", // Bengali (Not supported in your browser TTS)
  chinese: "zh-CN", // Chinese (Simplified)
  spanish: "es-ES", // Spanish (Spain)
  french: "fr-FR", // French (France)
  indonesian: "id-ID", // Indonesian
  russian: "ru-RU", // Russian
  swedish: "sv-SE", // Swedish (Not supported in your browser TTS)
  turkish: "tr-TR", // Turkish (Not supported in your browser TTS)
  hindi: "hi-IN", // Hindi
  italian: "it-IT", // Italian
  japanese: "ja-JP", // Japanese
  korean: "ko-KR", // Korean
  dutch: "nl-NL", // Dutch
  polish: "pl-PL", // Polish
  portuguese: "pt-BR", // Portuguese (Brazil)
  cantonese: "zh-HK", // Cantonese (Hong Kong)
  taiwanese: "zh-TW", // Mandarin (Taiwan)
};

export const languagesData = {
  english: {
    code: "en-US",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_en.json",
    isTtsSupported: true,
  },
  urdu: {
    code: "ur-PK",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_ur.json",
    isTtsSupported: false,
  },
  bengali: {
    code: "bn",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_bn.json",
    isTtsSupported: false,
  },
  chinese: {
    code: "zh-CN",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_zh.json",
    isTtsSupported: true,
  },
  spanish: {
    code: "es-ES",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_es.json",
    isTtsSupported: true,
  },
  french: {
    code: "fr-FR",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_fr.json",
    isTtsSupported: true,
  },
  indonesian: {
    code: "id-ID",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_id.json",
    isTtsSupported: true,
  },
  russian: {
    code: "ru-RU",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_ru.json",
    isTtsSupported: true,
  },
  swedish: {
    code: "sv-SE",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_sv.json",
    isTtsSupported: false,
  },
  turkish: {
    code: "tr-TR",
    jsonUrl: "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_tr.json",
    isTtsSupported: false,
  },
};
