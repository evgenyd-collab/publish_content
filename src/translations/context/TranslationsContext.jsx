import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  fetchTranslationRecord,
  updateTranslationStatus,
  prepareTranslation,
  generatePrimaryTranslation,
  reviseTranslation,
  sendSlackReport,
  mergeLocaleIntoRecord,
} from "../api/translationsService";
import { DEFAULT_TARGET_LANGUAGE, getLanguageLabel } from "../constants";

const TranslationsContext = createContext(null);

const SLACK_CHANNEL_ID = "C08QWES1YBG";
const STORAGE_KEY = "translations_processing_map";

const resolveLanguageCode = (languageCode = DEFAULT_TARGET_LANGUAGE) =>
  String(languageCode || DEFAULT_TARGET_LANGUAGE).toUpperCase();

const extractLocalePayload = (response) => {
  if (!response) return null;
  if (response.language) return response;
  if (response.locale?.language) return response.locale;
  if (response.payload?.language) return response.payload;
  if (Array.isArray(response.payload)) {
    return response.payload.find((locale) => locale?.language);
  }
  return null;
};

const createPipelineSteps = (languageCode, { prepare, primary, revisions }) => {
  const code = resolveLanguageCode(languageCode);
  return [
    {
      label: `Шаг 1/4 (${code}): подготовка текста`,
      run: (inboxId) => prepareTranslation({ inboxId, gptPromptId: prepare, reasoning_effort: 'medium' }),
      apply: (record, response) => ({
        ...record,
        body_prepared: response?.body_prepared || record?.body_prepared,
      }),
    },
    {
      label: `Шаг 2/4 (${code}): первичный перевод`,
      run: (inboxId) => generatePrimaryTranslation({ inboxId, gptPromptId: primary, reasoning_effort: 'medium' }),
      apply: (record, response) => {
        const localePayload = extractLocalePayload(response);
        return localePayload ? mergeLocaleIntoRecord(record, localePayload) : record;
      },
    },
    ...revisions.map((revision, index) => ({
      label: `Шаг ${index + 3}/4 (${code}): ${revision.label}`,
      run: (inboxId) => reviseTranslation({ inboxId, gptPromptId: revision.gptPromptId, reasoning_effort: 'medium' }),
      apply: (record, response) => {
        const localePayload = extractLocalePayload(response);
        return localePayload ? mergeLocaleIntoRecord(record, localePayload) : record;
      },
    })),
  ];
};

const PIPELINE_CONFIG = {
  EN: createPipelineSteps("EN", {
    prepare: 1,
    primary: 2,
    revisions: [
      { label: "ревизия терминологии", gptPromptId: 3 },
      { label: "ревизия лексики", gptPromptId: 4 },
    ],
  }),
  ES: createPipelineSteps("ES", {
    prepare: 11,
    primary: 12,
    revisions: [
      { label: "ревизия терминологии", gptPromptId: 13 },
      { label: "ревизия лексики", gptPromptId: 14 },
    ],
  }),
};

const getPipelineSteps = (languageCode = DEFAULT_TARGET_LANGUAGE) =>
  PIPELINE_CONFIG[resolveLanguageCode(languageCode)] || [];

const getTitleOrSnippet = (record) => {
  if (record?.headline_raw) {
    return record.headline_raw;
  }
  const body = record?.body_raw || "";
  const trimmed = body.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "(без названия)";
  }
  if (trimmed.length <= 80) {
    return trimmed;
  }
  return `${trimmed.slice(0, 77)}...`;
};

export const TranslationsProvider = ({ children }) => {
  const [processingMap, setProcessingMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn("Failed to load translations state from localStorage", error);
      return {};
    }
  });

  const timerRef = useRef(null);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processingMap));
    } catch (error) {
      console.warn("Failed to save translations state to localStorage", error);
    }
  }, [processingMap]);

  // Timer for elapsed time
  const hasRunningPipelines = Object.values(processingMap).some(
    (info) => info.status === "running"
  );

  useEffect(() => {
    if (hasRunningPipelines && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setProcessingMap((prev) => {
          const next = {};
          let changed = false;
          Object.entries(prev).forEach(([id, info]) => {
            if (info.status === "running") {
              next[id] = {
                ...info,
                elapsedMs: Date.now() - info.startTime,
              };
              changed = true;
            } else {
              next[id] = info;
            }
          });
          return changed ? next : prev;
        });
      }, 1000);
    }

    if (!hasRunningPipelines && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hasRunningPipelines]);

  const updateProcessingEntry = useCallback((inboxId, updates) => {
    setProcessingMap((prev) => ({
      ...prev,
      [inboxId]: {
        ...(prev[inboxId] || {}),
        ...updates,
      },
    }));
  }, []);

  const runPipeline = useCallback(
    async (recordOrId, languageOrOptions) => {
      let inboxId;
      let record;

      if (typeof recordOrId === "object") {
        record = recordOrId;
        inboxId = record.id;
      } else {
        inboxId = recordOrId;
      }

      if (!inboxId) return;

      // If we don't have the record object, fetch it
      if (!record) {
        try {
          record = await fetchTranslationRecord({ inboxId });
        } catch (error) {
          console.error("Failed to fetch record for pipeline", error);
          return;
        }
      }

      const requestedLanguage =
        typeof languageOrOptions === "string"
          ? languageOrOptions
          : languageOrOptions?.language;
      const preferredLanguage =
        requestedLanguage ||
        (typeof record?.body_prepared === "object" && record?.body_prepared?.language) ||
        DEFAULT_TARGET_LANGUAGE;
      const targetLanguage = resolveLanguageCode(preferredLanguage);
      const steps = getPipelineSteps(targetLanguage);

      if (steps.length === 0) {
        alert(`Для языка ${targetLanguage} пока нет настроенного пайплайна.`);
        return;
      }

      // Don't restart if already running (unless it's a resume after reload)
      // But here we are explicitly called, so we probably want to start.
      // If it's a resume, we might want to skip some checks?
      // For now, let's assume runPipeline is called to START or RESTART.

      const startTime = Date.now();

      updateProcessingEntry(inboxId, {
        startTime,
        elapsedMs: 0,
        status: "running",
        language: targetLanguage,
        stepLabel: steps[0]?.label,
      });

      let workingRecord = { ...record };

      const markAsError = async (message, errorObj) => {
        console.error(message, errorObj);
        try {
          await updateTranslationStatus({ inboxId, status: "failed" });
        } catch (statusError) {
          console.warn("Не удалось обновить статус на failed", statusError);
        }
        updateProcessingEntry(inboxId, {
          elapsedMs: Date.now() - startTime,
          status: "error",
          error: message,
          language: targetLanguage,
        });
        alert(message);
      };

      try {
        await updateTranslationStatus({ inboxId, status: "processed" });
      } catch (error) {
        await markAsError("Не удалось пометить запись как в работе", error);
        return;
      }

      const startTimeBeforeSteps = Date.now();

      try {
        for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
          const step = steps[stepIndex];
          updateProcessingEntry(inboxId, {
            stepLabel: step.label,
          });
          const response = await step.run(inboxId);
          if (typeof step.apply === "function") {
            const nextRecord = step.apply(workingRecord, response, targetLanguage);
            if (nextRecord) {
              workingRecord = nextRecord;
            }
          }
        }
      } catch (error) {
        await markAsError("Ошибка при выполнении шагов перевода", error);
        return;
      }

      try {
        await updateTranslationStatus({ inboxId, status: "ready_to_publish" });
      } catch (error) {
        console.warn("Не удалось установить статус ready_to_publish", error);
      }

      try {
        const durationSeconds = Math.round((Date.now() - startTimeBeforeSteps) / 1000);
        const snippet = getTitleOrSnippet(workingRecord);
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        const text = `Перевод #${inboxId} (${getLanguageLabel(
          targetLanguage
        )}) готов.\nОписание: ${snippet}\nДлительность: ${minutes} мин ${seconds} с.\nСсылка: ${
          window.location.origin
        }/translations/${inboxId}`;
        await sendSlackReport({ channelId: SLACK_CHANNEL_ID, text });
      } catch (error) {
        console.warn("Не удалось отправить отчёт в Slack", error);
      }

      // Remove from processing map on success
      setProcessingMap((prev) => {
        const { [inboxId]: _discard, ...rest } = prev;
        return rest;
      });
    },
    [updateProcessingEntry]
  );

  // Resume interrupted pipelines on mount
  useEffect(() => {
    const resumePipelines = async () => {
      const runningIds = Object.entries(processingMap)
        .filter(([_, info]) => info.status === "running")
        .map(([id]) => id);

      if (runningIds.length === 0) return;

      console.log("Resuming pipelines for:", runningIds);

      for (const id of runningIds) {
        const info = processingMap[id];
        // We restart the pipeline for simplicity and robustness
        // Ideally we would check the record status and resume from the correct step
        // But since we don't store step index in DB, restarting is safer to ensure consistency
        await runPipeline(Number(id), info.language);
      }
    };

    resumePipelines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const contextValue = {
    processingMap,
    runPipeline,
  };

  return (
    <TranslationsContext.Provider value={contextValue}>
      {children}
    </TranslationsContext.Provider>
  );
};

TranslationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useTranslations = () => {
  const context = useContext(TranslationsContext);
  if (!context) {
    throw new Error("useTranslations must be used within a TranslationsProvider");
  }
  return context;
};
