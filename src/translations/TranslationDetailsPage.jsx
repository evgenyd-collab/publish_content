import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "../components/atoms/loader";
import { fetchTranslationRecord } from "./api/translationsService";
import {
  getLanguageFlag,
  getLanguageLabel,
  TRANSLATION_LANGUAGES,
} from "./constants";
import {
  normalizeLocales,
  sortLocalesByDisplayOrder,
} from "./utils/locales";

const safeParseJson = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("Не удалось распарсить JSON", error);
    return value;
  }
};

const stringifyValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return value;
  }
};

const AUTHOR_LINKS = {
  "Adam Williams": "https://legalbet.uk/expert/adam-williams/",
  "Simon Dalton": "https://legalbet.uk/expert/simon-dalton/",
};

const AUTHOR_BY_SPORT = (sport = "") => {
  const normalized = sport.trim().toLowerCase();
  if (normalized === "football" || normalized === "tennis") {
    return "Dalton";
  }
  return "Williams";
};

const LANGUAGE_ALIASES = {
  english: "en",
  russian: "ru",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  polish: "pl",
};

const normalizeLanguageValue = (value) => {
  if (!value) return "";
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return "";
  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }
  const [base] = normalized.split(/[-_]/);
  if (!base) return "";
  return LANGUAGE_ALIASES[base] || base;
};

const selectLocalizedEntry = (data, targetLanguage) => {
  if (!data) return null;
  if (!Array.isArray(data)) return data;

  const normalizedTarget = normalizeLanguageValue(targetLanguage);
  if (normalizedTarget) {
    const matched = data.find((item) => {
      const languageCandidate =
        item?.language ??
        item?.lang ??
        item?.locale ??
        item?.target_language;
      return normalizeLanguageValue(languageCandidate) === normalizedTarget;
    });
    if (matched) {
      return matched;
    }
  }

  return data[0] ?? null;
};

const formatHeaderText = (header = "", bodyPreparedData = null, targetLanguage = "") => {
  if (!header) return header;

  // Извлекаем основную часть заголовка (до первой запятой)
  const mainPart = header.split(",")[0].trim().replace(/\.$/, "");

  // Получаем дату из body_prepared
  const date = bodyPreparedData?.date || "";

  // Нормализуем целевой язык
  const normalizedLanguage = normalizeLanguageValue(targetLanguage);

  // Для испанского языка используем формат "ES González"
  if (normalizedLanguage === "es") {
    if (date) {
      return `${mainPart} ES González ${date}`;
    }
    return `${mainPart} ES González`;
  }

  // Для остальных языков используем текущую логику с UK
  const sport = bodyPreparedData?.sport || "";
  const authorLabel = AUTHOR_BY_SPORT(sport);

  if (date) {
    return `${mainPart} ${authorLabel} UK ${date}`;
  }

  return `${mainPart} ${authorLabel} UK`;
};

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildFormattedPayload = (
  payload,
  bodyPreparedData = null,
  targetLanguage
) => {
  const resolvedPayload = selectLocalizedEntry(payload, targetLanguage);
  const resolvedBodyPrepared = selectLocalizedEntry(
    bodyPreparedData,
    targetLanguage
  );

  if (
    !resolvedPayload ||
    typeof resolvedPayload !== "object" ||
    Array.isArray(resolvedPayload)
  ) {
    return { plainText: "", html: "", hasContent: false };
  }

  const metaSource =
    resolvedBodyPrepared &&
    typeof resolvedBodyPrepared === "object" &&
    !Array.isArray(resolvedBodyPrepared)
      ? resolvedBodyPrepared
      : resolvedPayload;

  const plainParts = [];
  const htmlParts = [];

  const pushPlain = (text) => {
    const trimmed = (text || "").trim();
    if (trimmed) {
      plainParts.push(trimmed);
    }
  };

  const pushParagraph = (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    pushPlain(trimmed);
    htmlParts.push(`<p>${escapeHtml(trimmed)}</p>`);
  };

  const pushHeading = (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    pushPlain(trimmed);
    htmlParts.push(`<p><strong>${escapeHtml(trimmed)}</strong></p>`);
  };

  if (resolvedPayload.header) {
    const formattedHeader =
      formatHeaderText(resolvedPayload.header, metaSource, targetLanguage) ||
      resolvedPayload.header;
    pushHeading(formattedHeader);
  }

  const authorNameCandidate =
    resolvedPayload?.sub_header?.author?.name ||
    resolvedPayload?.sub_header?.author?.title ||
    resolvedPayload?.sub_header?.author ||
    null;

  const authorUrlCandidate =
    resolvedPayload?.sub_header?.author?.url ||
    resolvedPayload?.sub_header?.author_url ||
    resolvedPayload?.metadata?.author_url ||
    null;

  if (resolvedPayload?.sub_header?.text) {
    const text = resolvedPayload.sub_header.text.trim();
    const needsPeriod = !/[.!?]$/.test(text);
    const textWithPeriod = needsPeriod ? `${text}.` : text;

    let authorName = authorNameCandidate;
    let authorUrl = authorUrlCandidate;

    const hardcodedAuthorEntry = Object.entries(AUTHOR_LINKS).find(([name]) =>
      text.startsWith(name)
    );

    if (hardcodedAuthorEntry) {
      authorName = hardcodedAuthorEntry[0];
      authorUrl = hardcodedAuthorEntry[1];
    }

    if (authorName && authorUrl && text.startsWith(authorName)) {
      const rest = text.slice(authorName.length).trim();
      pushPlain(textWithPeriod);
      let htmlContent = `<a href="${escapeHtml(authorUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        authorName
      )}</a>`;
      if (rest) {
        htmlContent += ` ${escapeHtml(rest)}`;
      }
      if (needsPeriod) {
        htmlContent += ".";
      }
      htmlParts.push(`<p>${htmlContent}</p>`);
    } else {
      pushParagraph(textWithPeriod);
    }
  }

  const addPredictionBlock = (block) => {
    if (!block) return;
    if (block.section_header) {
      pushHeading(block.section_header);
    }
    if (Array.isArray(block.paragraphs)) {
      block.paragraphs.forEach((paragraph) => {
        if (Array.isArray(paragraph)) {
          paragraph.forEach((inner) => pushParagraph(inner));
        } else {
          pushParagraph(paragraph);
        }
      });
    } else if (typeof block.paragraphs === "string") {
      pushParagraph(block.paragraphs);
    }
  };

  if (Array.isArray(resolvedPayload.prediction_text)) {
    resolvedPayload.prediction_text.forEach(addPredictionBlock);
  }

  if (resolvedPayload?.final_prediction?.text) {
    const finalText = resolvedPayload.final_prediction.text.trim();
    if (finalText) {
      pushPlain(finalText);
      if (
        (resolvedPayload.final_prediction.markup_hint || "").toLowerCase() ===
        "bold"
      ) {
        htmlParts.push(`<p><strong>${escapeHtml(finalText)}</strong></p>`);
      } else {
        htmlParts.push(`<p>${escapeHtml(finalText)}</p>`);
      }
    }
  }

  const hasContent = htmlParts.length > 0;

  return {
    plainText: plainParts.join("\n\n"),
    html: hasContent ? `<article>${htmlParts.join("\n")}</article>` : "",
    hasContent,
  };
};

const TranslationDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(TRANSLATION_LANGUAGES[0] || "raw");
  const [activeTranslation, setActiveTranslation] = useState(
    TRANSLATION_LANGUAGES[0] || null
  );
  const [copiedState, setCopiedState] = useState({});
  const copyTimeouts = useRef({});
  const hasInitializedTabRef = useRef(false);
  const payloadLocales = useMemo(
    () => normalizeLocales(record?.payload_json),
    [record?.payload_json]
  );
  const sortedLocales = useMemo(
    () => sortLocalesByDisplayOrder(payloadLocales),
    [payloadLocales]
  );
  const translationTabs = useMemo(
    () =>
      TRANSLATION_LANGUAGES.map((code) => {
        const locale = sortedLocales.find(
          (item) => (item?.language || item?.code) === code
        );
        return {
          code,
          locale: locale || null,
          isAvailable: Boolean(locale),
        };
      }),
    [sortedLocales]
  );
  const displayTranslationEntry = useMemo(() => {
    if (activeTab === "raw") {
      return null;
    }
    return translationTabs.find((tab) => tab.code === activeTab) || null;
  }, [translationTabs, activeTab]);
  const activeTranslationEntry = useMemo(
    () =>
      activeTranslation
        ? translationTabs.find((tab) => tab.code === activeTranslation) || null
        : null,
    [translationTabs, activeTranslation]
  );
  const currentLocale = displayTranslationEntry?.locale ?? null;

  useEffect(() => {
    if (!hasInitializedTabRef.current) {
      const firstAvailable =
        translationTabs.find((tab) => tab.isAvailable)?.code || null;
      if (firstAvailable) {
        setActiveTab(firstAvailable);
        setActiveTranslation(firstAvailable);
      } else {
        setActiveTab("raw");
        setActiveTranslation(null);
      }
      hasInitializedTabRef.current = true;
      return;
    }

    const activeTranslationAvailable = activeTranslation
      ? translationTabs.some(
          (tab) => tab.code === activeTranslation && tab.isAvailable
        )
      : false;

    if (!activeTranslationAvailable) {
      const fallback =
        translationTabs.find((tab) => tab.isAvailable)?.code || null;
      setActiveTranslation(fallback);
      if (activeTab !== "raw") {
        setActiveTab(fallback || "raw");
      }
      return;
    }

    if (activeTab !== "raw") {
      const activeTabEntry = translationTabs.find(
        (tab) => tab.code === activeTab
      );
      if (!activeTabEntry || !activeTabEntry.isAvailable) {
        setActiveTab(activeTranslation);
      }
    }
  }, [translationTabs, activeTab, activeTranslation]);
  const bodyPrepared = useMemo(
    () => stringifyValue(record?.body_prepared),
    [record?.body_prepared]
  );
  const bodyPreparedParsed = useMemo(
    () => safeParseJson(record?.body_prepared),
    [record?.body_prepared]
  );
  const payloadObject = useMemo(() => {
    if (!currentLocale) {
      return null;
    }
    const payloadSource = currentLocale.payload ?? currentLocale;
    return safeParseJson(payloadSource);
  }, [currentLocale]);
  const payloadJsonString = useMemo(
    () => stringifyValue(record?.payload_json),
    [record?.payload_json]
  );
  const activeLocaleLanguage = useMemo(() => {
    if (displayTranslationEntry?.locale?.language) {
      return displayTranslationEntry.locale.language;
    }
    if (displayTranslationEntry?.code) {
      return displayTranslationEntry.code;
    }
    return activeTranslationEntry?.code || record?.target_language;
  }, [
    displayTranslationEntry?.locale?.language,
    displayTranslationEntry?.code,
    activeTranslationEntry?.code,
    record?.target_language,
  ]);
  const {
    plainText: formattedPayloadText,
    html: formattedPayloadHtml,
    hasContent: hasFormattedPayload,
  } = useMemo(
    () =>
      buildFormattedPayload(
        payloadObject,
        bodyPreparedParsed,
        activeLocaleLanguage
      ),
    [payloadObject, bodyPreparedParsed, activeLocaleLanguage]
  );
  const terms = useMemo(
    () => safeParseJson(record?.terms_and_names_web_translation),
    [record?.terms_and_names_web_translation]
  );
  const vagues = useMemo(
    () => safeParseJson(record?.vague_terms_notions),
    [record?.vague_terms_notions]
  );
  const termsString = useMemo(() => stringifyValue(terms), [terms]);
  const vaguesString = useMemo(() => stringifyValue(vagues), [vagues]);
  const editorNotesString = useMemo(
    () => stringifyValue(record?.editor_notes),
    [record?.editor_notes]
  );
  const hasTerms = Boolean(termsString);
  const hasVagues = Boolean(vaguesString);
  const hasEditorNotes = Boolean(editorNotesString);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Загружаем текущую запись
        const data = await fetchTranslationRecord({ inboxId: id });
        if (!isMounted) return;
        
        setRecord(data);
        hasInitializedTabRef.current = false;
        setActiveTranslation(TRANSLATION_LANGUAGES[0] || null);
        setActiveTab(TRANSLATION_LANGUAGES[0] || "raw");
      } catch (err) {
        console.error("Не удалось загрузить перевод", err);
        if (isMounted) {
          setError(err?.message || "Не удалось загрузить перевод");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      load();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      Object.values(copyTimeouts.current || {}).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <Loader className="w-12 h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition"
        >
          Назад
        </button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 space-y-4">
        <div className="border border-yellow-200 bg-yellow-50 text-yellow-700 px-4 py-3 rounded-lg">
          Запись не найдена.
        </div>
        <button
          type="button"
          onClick={() => navigate("/translations")}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition"
        >
          К списку переводов
        </button>
      </div>
    );
  }

  const copyContent = async ({ text = "", html } = {}) => {
    try {
      if (html && typeof window !== "undefined" && navigator?.clipboard && window.ClipboardItem) {
        const items = {
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text || ""], { type: "text/plain" }),
        };
        await navigator.clipboard.write([new ClipboardItem(items)]);
        return true;
      }

      if (text && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      if (html && typeof document !== "undefined") {
        const container = document.createElement("div");
        container.innerHTML = html;
        container.style.position = "fixed";
        container.style.pointerEvents = "none";
        container.style.opacity = "0";
        document.body.appendChild(container);
        const range = document.createRange();
        range.selectNodeContents(container);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        const result = document.execCommand("copy");
        selection.removeAllRanges();
        document.body.removeChild(container);
        if (result) {
          return true;
        }
      }

      if (text && typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "readonly");
        textarea.style.position = "fixed";
        textarea.style.pointerEvents = "none";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const result = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (result) {
          return true;
        }
      }
    } catch (error) {
      console.error("Не удалось скопировать", error);
    }

    return false;
  };

  const rawText = record.body_raw || "";
  const hasRawText = rawText.trim().length > 0;
  const isTranslationTab = activeTab !== "raw";
  const copyDisabled = isTranslationTab ? !hasFormattedPayload : !hasRawText;
  const mainCopyId = `main-${activeTab}`;
  const mainCopied = Boolean(copiedState[mainCopyId]);
  const tabsConfig = [
    ...translationTabs.map((tab) => ({
      key: tab.code,
      label: `${getLanguageFlag(tab.code)} ${getLanguageLabel(tab.code)}`.trim(),
      disabled: !tab.isAvailable,
      type: "translation",
    })),
    {
      key: "raw",
      label: "Исходный текст",
      disabled: !hasRawText,
      type: "raw",
    },
  ];
  const targetLabel =
    isTranslationTab && displayTranslationEntry
      ? displayTranslationEntry.code
      : record.target_language || "—";

  const handleTabSelect = (tabKey, disabled) => {
    if (disabled || tabKey === activeTab) {
      return;
    }
    setActiveTab(tabKey);
    if (tabKey !== "raw") {
      setActiveTranslation(tabKey);
    }
  };

  const handleRetranslateClick = (languageCode) => {
    if (!record?.id) {
      return;
    }
    const normalizedLanguage =
      (languageCode && String(languageCode).toUpperCase()) ||
      TRANSLATION_LANGUAGES[0] ||
      "EN";
    navigate(
      `/translations?retranslate=${record.id}&language=${normalizedLanguage}`
    );
  };

  const markCopied = (key) => {
    if (!key) return;
    setCopiedState((prev) => ({ ...prev, [key]: true }));
    if (copyTimeouts.current[key]) {
      clearTimeout(copyTimeouts.current[key]);
    }
    copyTimeouts.current[key] = setTimeout(() => {
      setCopiedState((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete copyTimeouts.current[key];
    }, 2000);
  };

  const handleCopy = async (key, payload) => {
    if (!payload) return;

    const success = await copyContent(payload);
    if (success) {
      markCopied(key);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Перевод #{record.id}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Статус: <span className="font-medium">{record.status || "—"}</span>
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-800">
          <span className="flex items-center gap-2">
            <span className="text-xs uppercase text-gray-500">Создана</span>
            <span>{formatDateTime(record.created_at)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs uppercase text-gray-500">Обновлена</span>
            <span>{formatDateTime(record.updated_at)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs uppercase text-gray-500">Source</span>
            <span>{record.source_language || "—"}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs uppercase text-gray-500">Target</span>
            <span>{targetLabel}</span>
          </span>
        </div>
      </div>

      {(record.status === "ready_to_publish" || record.status === "failed") && (
        <div className="flex flex-wrap gap-3">
          {TRANSLATION_LANGUAGES.map((languageCode) => (
            <button
              key={`retranslate-${languageCode}`}
              type="button"
              onClick={() => handleRetranslateClick(languageCode)}
              className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition"
            >
              {`Перевести снова RU>>${languageCode}`}
            </button>
          ))}
        </div>
      )}

      <section>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 rounded-t-lg">
            <div className="flex flex-wrap items-center gap-2">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabSelect(tab.key, tab.disabled)}
                    disabled={tab.disabled}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                      tab.disabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : isActive
                        ? "bg-white text-teal-600 border border-gray-200 shadow-sm"
                        : "text-gray-600 hover:text-teal-600 border border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (copyDisabled) return;
                  if (isTranslationTab) {
                    void handleCopy(mainCopyId, {
                      text: formattedPayloadText,
                      html: hasFormattedPayload ? formattedPayloadHtml : undefined,
                    });
                  } else {
                    void handleCopy(mainCopyId, { text: rawText });
                  }
                }}
                disabled={copyDisabled}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  copyDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Скопировать
              </button>
              {mainCopied ? (
                <span className="flex items-center text-xs font-medium text-green-600">
                  <span className="mr-1" aria-hidden="true">
                    &#10003;
                  </span>
                  Скопировано
                </span>
              ) : null}
            </div>
          </div>
          <div className="p-4 text-sm leading-relaxed">
            {activeTab === "raw" ? (
              hasRawText ? (
                <div className="whitespace-pre-wrap text-gray-800">{rawText}</div>
              ) : (
                <p className="text-gray-500 italic">Исходный текст отсутствует.</p>
              )
            ) : hasFormattedPayload ? (
              <div className="whitespace-pre-wrap text-gray-900">{formattedPayloadText}</div>
            ) : (
              <p className="text-gray-500 italic">Перевод для выбранного языка недоступен.</p>
            )}
          </div>
        </div>
      </section>

      <details className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
        <summary className="cursor-pointer font-semibold text-gray-900">
          Справочные данные
        </summary>
        <div className="mt-3 space-y-4">
          {payloadJsonString ? (
             <div>
               <header className="flex items-center justify-between mb-2">
                 <div className="text-xs uppercase text-gray-500">RAW перевод</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy("raw-payload", { text: payloadJsonString })}
                    className="px-3 py-1 bg-gray-200 text-xs rounded-lg hover:bg-gray-300 transition"
                  >
                    Скопировать
                  </button>
                  {copiedState["raw-payload"] ? (
                    <span className="flex items-center text-[11px] font-medium text-green-600">
                      <span className="mr-1" aria-hidden="true">
                        &#10003;
                      </span>
                      Скопировано
                    </span>
                  ) : null}
                </div>
               </header>
               <pre className="border border-gray-200 rounded-lg bg-white p-3 overflow-x-auto text-xs text-gray-700">
                 {payloadJsonString}
               </pre>
             </div>
           ) : null}
 
           {bodyPrepared ? (
             <div>
               <header className="flex items-center justify-between mb-2">
                 <div className="text-xs uppercase text-gray-500">Подготовленный текст</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy("body-prepared", { text: bodyPrepared })}
                    className="px-3 py-1 bg-gray-200 text-xs rounded-lg hover:bg-gray-300 transition"
                  >
                    Скопировать
                  </button>
                  {copiedState["body-prepared"] ? (
                    <span className="flex items-center text-[11px] font-medium text-green-600">
                      <span className="mr-1" aria-hidden="true">
                        &#10003;
                      </span>
                      Скопировано
                    </span>
                  ) : null}
                </div>
               </header>
               <pre className="border border-gray-200 rounded-lg bg-white p-3 overflow-x-auto text-xs text-gray-700">
                 {bodyPrepared}
               </pre>
             </div>
           ) : null}
 
          <div>
             <div className="text-xs uppercase text-gray-500 mb-1">terms_and_names_web_translation</div>
             <header className="flex items-center justify-between mb-2">
               <div className="text-[11px] text-gray-500">JSON</div>
               <div className="flex items-center gap-2">
                 <button
                   type="button"
                   onClick={() => {
                     if (!hasTerms) return;
                     void handleCopy("terms", { text: termsString });
                   }}
                   disabled={!hasTerms}
                   className={`px-3 py-1 text-xs rounded-lg transition ${
                     hasTerms
                       ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                       : "bg-gray-100 text-gray-400 cursor-not-allowed"
                   }`}
                 >
                   Скопировать
                 </button>
                 {copiedState["terms"] ? (
                   <span className="flex items-center text-[11px] font-medium text-green-600">
                     <span className="mr-1" aria-hidden="true">
                       &#10003;
                     </span>
                     Скопировано
                   </span>
                 ) : null}
               </div>
             </header>
             <pre className="border border-gray-200 rounded-lg bg-white p-3 overflow-x-auto text-xs text-gray-700">
               {termsString || "—"}
             </pre>
           </div>
           <div>
             <div className="text-xs uppercase text-gray-500 mb-1">vague_terms_notions</div>
             <header className="flex items-center justify-between mb-2">
               <div className="text-[11px] text-gray-500">JSON</div>
               <div className="flex items-center gap-2">
                 <button
                   type="button"
                   onClick={() => {
                     if (!hasVagues) return;
                     void handleCopy("vagues", { text: vaguesString });
                   }}
                   disabled={!hasVagues}
                   className={`px-3 py-1 text-xs rounded-lg transition ${
                     hasVagues
                       ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                       : "bg-gray-100 text-gray-400 cursor-not-allowed"
                   }`}
                 >
                   Скопировать
                 </button>
                 {copiedState["vagues"] ? (
                   <span className="flex items-center text-[11px] font-medium text-green-600">
                     <span className="mr-1" aria-hidden="true">
                       &#10003;
                     </span>
                     Скопировано
                   </span>
                 ) : null}
               </div>
             </header>
             <pre className="border border-gray-200 rounded-lg bg-white p-3 overflow-x-auto text-xs text-gray-700">
               {vaguesString || "—"}
             </pre>
           </div>
           {record.editor_notes ? (
             <div>
               <div className="text-xs uppercase text-gray-500 mb-1">editor_notes</div>
               <header className="flex items-center justify-between mb-2">
                 <div className="text-[11px] text-gray-500">JSON</div>
                 <div className="flex items-center gap-2">
                   <button
                     type="button"
                     onClick={() => {
                       if (!hasEditorNotes) return;
                       void handleCopy("editor-notes", { text: editorNotesString });
                     }}
                     disabled={!hasEditorNotes}
                     className={`px-3 py-1 text-xs rounded-lg transition ${
                       hasEditorNotes
                         ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                         : "bg-gray-100 text-gray-400 cursor-not-allowed"
                     }`}
                   >
                     Скопировать
                   </button>
                   {copiedState["editor-notes"] ? (
                     <span className="flex items-center text-[11px] font-medium text-green-600">
                       <span className="mr-1" aria-hidden="true">
                         &#10003;
                       </span>
                       Скопировано
                     </span>
                   ) : null}
                 </div>
               </header>
               <pre className="border border-gray-200 rounded-lg bg-white p-3 overflow-x-auto text-xs text-gray-700">
                 {editorNotesString || "—"}
               </pre>
             </div>
           ) : null}
        </div>
      </details>

      <button
        type="button"
        onClick={() => navigate("/translations")}
        className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition"
      >
        Назад к списку
      </button>
    </div>
  );
};

export default TranslationDetailsPage;

