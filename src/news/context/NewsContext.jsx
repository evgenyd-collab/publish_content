import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  fetchInboxRecord,
  generateBackground,
  updateInboxBackground,
  generateArticleHeaders,
  generateArticlePayload,
  updateInboxArticlePayload,
  publishArticles,
  fetchPublicationsByInboxId,
  sendSlackReport,
} from "../api/newsService";

const NewsContext = createContext(null);

const SLACK_CHANNEL_ID = "C09UTNAMNFQ";
const STORAGE_KEY = "news_processing_map";

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

const getUserEmail = () => {
  return localStorage.getItem("lastLoginEmail") || "неизвестно";
};

const sanitizeHeaderValue = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
};

const extractHeadlineCandidates = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > 4) {
    return null;
  }

  const candidates = {};
  let found = false;

  for (const key of ["header_2", "header_3", "header_4"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      candidates[key] = sanitizeHeaderValue(value[key]);
      found = true;
    }
  }

  if (found) {
    return candidates;
  }

  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") {
      const nestedCandidates = extractHeadlineCandidates(nested, depth + 1);
      if (nestedCandidates) {
        return nestedCandidates;
      }
    }
  }

  return null;
};

const parseInboxHeadlines = (rawHeadlines) => {
  if (!rawHeadlines) {
    return null;
  }

  let value = rawHeadlines;
  if (typeof rawHeadlines === "string") {
    try {
      value = JSON.parse(rawHeadlines);
    } catch (error) {
      console.warn("Не удалось распарсить inbox.headlines как JSON", error);
      value = null;
    }
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const base = {};
  let hasValues = false;
  for (const key of ["header_2", "header_3", "header_4"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      base[key] = sanitizeHeaderValue(value[key]);
      hasValues = hasValues || Boolean(base[key]);
    }
  }

  return hasValues ? base : null;
};

const deserializeArticlePayload = (rawPayload) => {
  if (!rawPayload) {
    return null;
  }

  let payload = rawPayload;
  try {
    if (typeof rawPayload === "string") {
      payload = JSON.parse(rawPayload);
    }
  } catch (error) {
    console.error("Не удалось распарсить article_payload", error);
    return null;
  }

  const isArray = Array.isArray(payload);
  if (isArray) {
    return payload?.[0] ?? null;
  }

  if (payload && typeof payload === "object") {
    return payload;
  }

  return null;
};

const addAlternativeHeadersToParagraph1 = (articlePayload, header3, header4) => {
  if (!articlePayload || typeof articlePayload !== "object") {
    return articlePayload;
  }

  const updated = { ...articlePayload };
  
  // Убеждаемся, что paragraph_1 существует
  if (!updated.paragraph_1) {
    updated.paragraph_1 = {
      role: "paragraph",
      opening_html_tag: "<p>",
      content: "",
      closing_html_tag: "</p>",
    };
  }

  const paragraph1 = { ...updated.paragraph_1 };
  const currentContent = paragraph1.content || "";
  
  // Формируем блок с альтернативными заголовками
  const alternativeHeadersBlock = [
    "Альтернативные заголовки:",
    header3 ? `- ${header3}` : null,
    header4 ? `- ${header4}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Добавляем альтернативные заголовки в начало, если они есть
  if (alternativeHeadersBlock && (header3 || header4)) {
    paragraph1.content = `${alternativeHeadersBlock}\n\n${currentContent}`.trim();
  } else {
    paragraph1.content = currentContent;
  }

  updated.paragraph_1 = paragraph1;
  return updated;
};

export const NewsProvider = ({ children }) => {
  const [processingMap, setProcessingMap] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn("Failed to load news state from localStorage", error);
      return {};
    }
  });

  const timerRef = useRef(null);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processingMap));
    } catch (error) {
      console.warn("Failed to save news state to localStorage", error);
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

  const runNewsPipeline = useCallback(
    async (recordOrId) => {
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
          record = await fetchInboxRecord({ inboxId });
        } catch (error) {
          console.error("Failed to fetch record for pipeline", error);
          return;
        }
      }

      const startTime = Date.now();

      updateProcessingEntry(inboxId, {
        startTime,
        elapsedMs: 0,
        status: "running",
        stepLabel: "Шаг 1/5: Генерация бэкграунда",
      });

      let workingRecord = { ...record };

      const markAsError = async (message, errorObj) => {
        console.error(message, errorObj);
        updateProcessingEntry(inboxId, {
          elapsedMs: Date.now() - startTime,
          status: "error",
          error: message,
        });
        alert(message);
      };

      try {
        // Шаг 1: Генерация background (если отсутствует)
        updateProcessingEntry(inboxId, {
          stepLabel: "Шаг 1/5: Генерация бэкграунда",
        });

        if (!workingRecord.background) {
          try {
            const bgResponse = await generateBackground({
              inboxId,
              gptPromptId: 1,
            });
            const fresh = await fetchInboxRecord({ inboxId });
            if (fresh?.background) {
              workingRecord.background = fresh.background;
            } else if (bgResponse?.background) {
              workingRecord.background = bgResponse.background;
            }
          } catch (error) {
            console.warn("Не удалось сгенерировать бэкграунд, продолжаем", error);
          }
        }

        // Шаг 2: Генерация заголовков
        updateProcessingEntry(inboxId, {
          stepLabel: "Шаг 2/5: Генерация заголовков",
        });

        let header2 = "";
        let header3 = "";
        let header4 = "";

        try {
          const headlinesResponse = await generateArticleHeaders({
            inboxId,
            gptPromptId: 4,
          });

          const inboxSnapshot = await fetchInboxRecord({ inboxId });
          const inboxHeadlines = inboxSnapshot
            ? parseInboxHeadlines(inboxSnapshot.headlines)
            : null;
          const responseHeadlines = extractHeadlineCandidates(headlinesResponse) || {};

          header2 = sanitizeHeaderValue(
            inboxHeadlines?.header_2 ?? responseHeadlines.header_2 ?? ""
          );
          header3 = sanitizeHeaderValue(
            inboxHeadlines?.header_3 ?? responseHeadlines.header_3 ?? ""
          );
          header4 = sanitizeHeaderValue(
            inboxHeadlines?.header_4 ?? responseHeadlines.header_4 ?? ""
          );
        } catch (error) {
          console.warn("Не удалось сгенерировать заголовки, продолжаем", error);
        }

        // Шаг 3: Генерация article_payload
        updateProcessingEntry(inboxId, {
          stepLabel: "Шаг 3/5: Генерация текста статьи",
        });

        let articlePayload = null;
        try {
          const articleResponse = await generateArticlePayload({
            inboxId,
            gptPromptId: 3,
          });

          const fresh = await fetchInboxRecord({ inboxId });
          if (fresh?.article_payload) {
            articlePayload = deserializeArticlePayload(fresh.article_payload);
          } else if (articleResponse?.article_payload) {
            articlePayload = deserializeArticlePayload(articleResponse.article_payload);
          }
        } catch (error) {
          await markAsError("Ошибка при генерации текста статьи", error);
          return;
        }

        if (!articlePayload) {
          await markAsError("Не удалось получить article_payload");
          return;
        }

        // Шаг 4: Модификация payload - установка header_2 как основного и добавление альтернативных заголовков
        updateProcessingEntry(inboxId, {
          stepLabel: "Шаг 4/5: Обработка заголовков",
        });

        // Устанавливаем header_2 как основной (всегда, по требованию)
        const finalHeader2 = header2 || articlePayload.header_2 || articlePayload.header_1 || articlePayload.header || workingRecord.headline_raw || "";
        articlePayload.header = finalHeader2;
        articlePayload.selected_header_number = 2;
        articlePayload.header_2 = finalHeader2;
        articlePayload.header_3 = header3 || articlePayload.header_3 || "";
        articlePayload.header_4 = header4 || articlePayload.header_4 || "";

        // Добавляем header_3 и header_4 в начало paragraph_1
        articlePayload = addAlternativeHeadersToParagraph1(articlePayload, header3, header4);

        // Сохраняем обновленный payload
        try {
          const serialized = JSON.stringify(articlePayload);
          await updateInboxArticlePayload({
            inboxId,
            articlePayload: serialized,
          });
        } catch (error) {
          console.warn("Не удалось сохранить article_payload", error);
        }

        // Шаг 5: Создание публикации для получения external_id
        updateProcessingEntry(inboxId, {
          stepLabel: "Шаг 5/5: Создание публикации",
        });

        let externalId = null;
        try {
          await publishArticles({
            inboxIds: [inboxId],
            specificIds: [],
            limit: 1,
            timeout: 300,
            retryFailed: false,
            production: true,
          });

          // Поллинг для получения external_id
          const startedAt = Date.now();
          const timeoutMs = 120000; // 2 минуты
          const pollIntervalMs = 1500;

          while (Date.now() - startedAt < timeoutMs) {
            const publications = await fetchPublicationsByInboxId({
              inboxId,
              page: 1,
              pageSize: 1,
              sortOrder: "desc",
            });
            const rec = publications?.records?.[0];
            externalId = rec?.external_id || null;

            if (externalId) break;
            if (rec?.status === "failed") break;

            await new Promise((r) => setTimeout(r, pollIntervalMs));
          }
        } catch (error) {
          console.warn("Не удалось создать публикацию или получить external_id", error);
        }

        // Отправка рапорта в Slack
        try {
          const durationSeconds = Math.round((Date.now() - startTime) / 1000);
          const snippet = getTitleOrSnippet(workingRecord);
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          const userEmail = getUserEmail();
          const adminLink = externalId
            ? `https://legalbet.ru/admin/post/${externalId}/edit`
            : "не получена";

          const text = `Новость #${inboxId} сгенерирована.\nЗаказал: ${userEmail}\nДлительность: ${minutes} мин ${seconds} с.\nСсылка на админку: ${adminLink}`;

          await sendSlackReport({ channelId: SLACK_CHANNEL_ID, text });
        } catch (error) {
          console.warn("Не удалось отправить отчёт в Slack", error);
        }

        // Remove from processing map on success
        setProcessingMap((prev) => {
          const { [inboxId]: _discard, ...rest } = prev;
          return rest;
        });

        // Триггерим обновление списка новостей для обновления статуса
        // Статус обновится автоматически при следующей загрузке списка
        window.dispatchEvent(new CustomEvent("news-pipeline-completed", { detail: { inboxId } }));
      } catch (error) {
        await markAsError("Ошибка при выполнении пайплайна генерации", error);
      }
    },
    [updateProcessingEntry]
  );

  const contextValue = {
    processingMap,
    runNewsPipeline,
  };

  return (
    <NewsContext.Provider value={contextValue}>
      {children}
    </NewsContext.Provider>
  );
};

NewsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useNews = () => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error("useNews must be used within a NewsProvider");
  }
  return context;
};

