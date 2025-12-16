// Константы для системы переводов

// Исходный язык исходного текста (передаём в сервис значения "world")
export const SOURCE_LANGUAGE = "world";

// Базовый язык перевода (используется текущим пайплайном EN / UK)
export const DEFAULT_TARGET_LANGUAGE = "EN";

// Описание поддерживаемых языков.
// Структура оставляет место для будущих локалей (label, tooltip, подсказки и т.д.)
export const LANGUAGE_DEFINITIONS = {
  EN: {
    code: "EN",
    label: "English",
    description: "English (UK)",
    flag: "🇬🇧",
  },
  ES: {
    code: "ES",
    label: "Spanish",
    description: "Español",
    flag: "🇪🇸",
  },
};

export const SUPPORTED_LANGUAGES = Object.values(LANGUAGE_DEFINITIONS);

// Порядок отображения языков в UI (вкладки, бейджи и т.д.)
export const LANGUAGE_DISPLAY_ORDER = ["EN", "ES"];

export const getLanguageDefinition = (code) =>
  LANGUAGE_DEFINITIONS[code] || { code, label: code, description: code };

export const getLanguageLabel = (code) => getLanguageDefinition(code).label;

export const getLanguageFlag = (code) =>
  getLanguageDefinition(code).flag || "";

export const getLanguageDescription = (code) =>
  getLanguageDefinition(code).description || getLanguageDefinition(code).label;

export const TRANSLATION_LANGUAGES = ["EN", "ES"];

export const findLocaleByLanguage = (
  locales = [],
  languageCode = DEFAULT_TARGET_LANGUAGE
) =>
  locales.find((item) => (item?.language || item?.code) === languageCode) ||
  null;


