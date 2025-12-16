import { LANGUAGE_DISPLAY_ORDER } from "../constants";

export const getLanguageOrder = (code) => {
  const index = LANGUAGE_DISPLAY_ORDER.indexOf(code);
  return index >= 0 ? index : LANGUAGE_DISPLAY_ORDER.length;
};

export const sortLocalesByDisplayOrder = (locales = []) =>
  [...locales].sort((a, b) => {
    const langA = a?.language || a?.code || "";
    const langB = b?.language || b?.code || "";
    return getLanguageOrder(langA) - getLanguageOrder(langB);
  });

export const normalizeLocales = (value) => {
  if (!value) {
    return [];
  }

  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (error) {
      console.warn("Не удалось распарсить список локалей", error);
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  if (raw && typeof raw === "object") {
    if (raw.language || raw.code) {
      return [raw];
    }
    return Object.values(raw);
  }

  return [];
};
