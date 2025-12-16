import { useEffect, useRef, useState } from "react";
import Loader from "../../components/atoms/loader";
import { extractBodyText } from "../utils/extractBodyText";
import { generateBackground, updateInboxBackground, generateArticlePayload, updateInboxArticlePayload, fetchInboxRecord, publishArticles, fetchPublicationsByInboxId, generateArticleHeaders } from "../api/newsService";

const STEP_KEYS = {
  background: "background",
  headlines: "headlines",
  draft: "draft",
  publish: "publish",
  done: "done",
};

const STEP_LABELS = {
  [STEP_KEYS.background]: "1. Ищем бэкграунд",
  [STEP_KEYS.headlines]: "2. Предлагаю заголовки",
  [STEP_KEYS.draft]: "3. Пишем текст",
  [STEP_KEYS.publish]: "4. Публикуем",
  [STEP_KEYS.done]: "Готово",
};

const STEP_PLACEHOLDERS = {
  [STEP_KEYS.background]: [
    "Гэндальф стучит посохом: «Бильбо, собирайся! Нам нужен бэкграунд!»",
    "Положи факты в рюкзак, даты в карман, источники — в карту хроник.",
    "Если встретишь троллей‑кликбейтеров — запиши и иди к первоисточнику.",
    "Ключевые слова сияют синим, когда рядом правда — следуй за ними.",
    "В Брийских архивах шепчут старики‑газеты — перепроверь у хранителей.",
    "Хоббитская аккуратность: цифры сверяем трижды — автор, статистика, смысл.",
    "Не путай предания с прогнозами — легенды красивы, факты надёжнее.",
    "На развилке спроси эльфов‑аналитиков — их графы укажут истинный тренд.",
    "Сомневаешься — перечитай заголовок: он должен вести, а не заманивать.",
    "Бэкграунд собран — пергаменты хрустят. Возвращайся в Шир: пора писать!",
  ],
  [STEP_KEYS.headlines]: [
    "Проверяем хирдлайнеры — выбираем то, что зацепит читателя",
    "Редактор читает вслух: «Звучит? Нет? Значит перепишем!»",
    "Вытащим лучший заголовок, остальные оставим в запасе",
    "Кликбейт не пройдёт — ищем баланс между точностью и интригой",
  ],
  [STEP_KEYS.draft]: [
    "Ленивые людишки хотят новости — мы набьём их галлюцинациями, да, бесценностями...",
    "Нет, нет! Редактор добрый, любит факты. Только проверенные цитаты, прелесть.",
    "Галлюцинации сияют ярче кликов... но потом приходит факт‑орк и всё ломает.",
    "Мы спрячем 'источник неизвестен' в тёмном подвале! — НЕТ, ссылку на свет!",
    "Редактор шипит: 'Ссылку! Ссылку принеси!' — и мы ползём за первоисточником.",
    "Людям нравится 'шок' и 'сенсация'... Нет! Сенсации в мусор, цифры сюда.",
    "Горлум тянет заголовок в кликбейт, Смеагол чинит: коротко, ясно, без соблазнов.",
    "Мы украдём абзац у конкурентов... НЕТ! Перескажем своими словами и дадим ссылку.",
    "Длинные предложения душат рыбку! Режем, упрощаем, оставляем смысл.",
    "Почти готово, прелесть. Слова чистые, факты блестят. Редактор улыбается (немного).",
  ],
  [STEP_KEYS.publish]: [
    "Бросаем кольцо... тьфу, новость, в гору! (как там её... Роковую?)",
  ],
};

const STEP_STATUSES = {
  locked: "Ожидает",
  loading: "Выполняется",
  review: "Проверка",
  ready: "Готово к запуску",
  complete: "Готово",
};

const STATUS_STYLES = {
  locked: "border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-300 dark:bg-transparent",
  loading: "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-200",
  review: "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-400 dark:bg-amber-500/10 dark:text-amber-200",
  ready: "border-green-400 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-500/10 dark:text-green-200",
  complete: "border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-500/10 dark:text-teal-200",
};

const PLACEHOLDER_ROTATION_MS = 6000; // смена строки каждые 6 секунд
const ADMIN_POST_EDIT_BASE = {
  test: "https://ru-hd-13215.test.b33.io/admin/post/",
  lb: "https://legalbet.ru/admin/post/",
};

const BACKGROUND_DURATION = { min: 9000, max: 10000 };
const DRAFT_DURATION = { min: 9000, max: 10000 };
const PUBLISH_DURATION = { min: 4000, max: 4000 };
const REVIEW_DELAY_SECONDS = 7;

const randomBetween = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const HEADER_KEYS = ["header_1", "header_2", "header_3", "header_4"];
const SELECTABLE_HEADER_KEYS = HEADER_KEYS.slice(1);
const ARTICLE_GENERATION_PROMPT_ID = 3;
const HEADLINES_GENERATION_PROMPT_ID = 4;
const HEADLINES_TIMEOUT_MS = 25000;
const HEADER_LABELS = {
  header_1: "Вариант 1",
  header_2: "Вариант 2",
  header_3: "Вариант 3",
  header_4: "Вариант 4",
};

const withTimeout = (promise, timeoutMs, timeoutMessage = "Время ожидания истекло") => {
  if (typeof timeoutMs !== "number" || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId;
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    }),
  ]);
};

const cloneDeep = (value) => {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (_) {
      // fallback ниже
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return Array.isArray(value) ? [...value] : { ...value };
  }
};

const sanitizeHeaderValue = (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const createEmptyHeaderOptions = (headline = "") => ({
  header_1: sanitizeHeaderValue(headline),
  header_2: "",
  header_3: "",
  header_4: "",
});

const deriveHeaderOptionsFromPayload = (payload, fallbackHeadline = "", prevOptions = createEmptyHeaderOptions(fallbackHeadline)) => {
  const base = { ...prevOptions };
  const effectiveHeader = sanitizeHeaderValue(payload?.header ?? base.header_1 ?? fallbackHeadline);
  base.header_1 = sanitizeHeaderValue(payload?.header_1 ?? effectiveHeader ?? fallbackHeadline);
  base.header_2 = sanitizeHeaderValue(payload?.header_2 ?? base.header_2);
  base.header_3 = sanitizeHeaderValue(payload?.header_3 ?? base.header_3);
  base.header_4 = sanitizeHeaderValue(payload?.header_4 ?? base.header_4);
  return base;
};

const determineSelectedHeaderKey = (options, currentHeaderValue) => {
  const normalizedHeader = sanitizeHeaderValue(currentHeaderValue);
  for (const key of HEADER_KEYS) {
    if (sanitizeHeaderValue(options[key]) === normalizedHeader && normalizedHeader !== "") {
      return key;
    }
  }
  return "header_1";
};

const updateArticlePayloadWithHeaders = (payload, options, selectedKey = "header_1") => {
  if (!payload || typeof payload !== "object" || !options) {
    return payload;
  }

  const next = cloneDeep(payload) || {};
  const preparedOptions = {
    header_1: sanitizeHeaderValue(options.header_1),
    header_2: sanitizeHeaderValue(options.header_2),
    header_3: sanitizeHeaderValue(options.header_3),
    header_4: sanitizeHeaderValue(options.header_4),
  };

  next.header_1 = preparedOptions.header_1;
  next.header_2 = preparedOptions.header_2;
  next.header_3 = preparedOptions.header_3;
  next.header_4 = preparedOptions.header_4;

  const safeKey = HEADER_KEYS.includes(selectedKey) ? selectedKey : "header_1";
  next.header = sanitizeHeaderValue(preparedOptions[safeKey] || preparedOptions.header_1 || next.header);
  const numberMatch = safeKey.match(/header_(\d)/);
  if (numberMatch) {
    next.selected_header_number = Number(numberMatch[1]);
  } else if (!next.selected_header_number) {
    next.selected_header_number = 1;
  }

  return next;
};

const deserializeArticlePayload = (rawPayload, containerTypeRef) => {
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
  if (containerTypeRef && typeof containerTypeRef === "object" && "current" in containerTypeRef) {
    containerTypeRef.current = isArray ? "array" : "object";
  }

  if (isArray) {
    return payload?.[0] ?? null;
  }

  if (payload && typeof payload === "object") {
    return payload;
  }

  return null;
};

const extractHeadlineCandidates = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > 4) {
    return null;
  }

  const candidates = {};
  let found = false;

  for (const key of HEADER_KEYS.slice(1)) {
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

const parseInboxHeadlines = (rawHeadlines, fallbackHeadline = "") => {
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

  const base = createEmptyHeaderOptions(fallbackHeadline);
  let hasValues = false;
  for (const key of SELECTABLE_HEADER_KEYS) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      base[key] = sanitizeHeaderValue(value[key]);
      hasValues = hasValues || Boolean(base[key]);
    }
  }

  return hasValues ? base : null;
};

const getRandomPlaceholder = (key) => {
  const items = STEP_PLACEHOLDERS[key] || [];
  if (!items.length) {
    return "Запускаем вспомогательные дроны...";
  }
  return items[Math.floor(Math.random() * items.length)];
};

const getHostFromUrl = (url) => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).hostname;
  } catch (error) {
    return null;
  }
};

const createFallbackBackground = (news) => {
  const headline = news?.headline_raw || "Неизвестная новость";
  const source = getHostFromUrl(news?.source_url);
  return [
    `• Событие: ${headline}`,
    source ? `• Источник: ${source}` : null,
    "• Контекст: добавьте исторические факты, цифры и настроение болельщиков.",
  ]
    .filter(Boolean)
    .join("\n");
};

const INITIAL_BACKGROUND = (news) => {
  const bodyText = extractBodyText(news?.body_raw);
  if (!bodyText) {
    return createFallbackBackground(news);
  }

  const lines = bodyText.split(/\n+/).filter(Boolean);
  if (!lines.length) {
    return createFallbackBackground(news);
  }

  return lines.slice(0, 4).join("\n");
};

const createDraftFromBackground = (news, backgroundDraft) => {
  const headline = news?.headline_raw || "Без названия";
  return [
    `Заголовок: ${headline}`,
    "",
    backgroundDraft,
    "",
    "Главный вывод: уточните ключевой факт и добавьте оценку эксперта.",
    "План действий: выделите цифры, эмоции и возможное развитие событий.",
  ].join("\n");
};

const createFallbackArticlePayload = (news) => ({
  header: news?.headline_raw || "",
  header_1: news?.headline_raw || "",
  header_2: null,
  header_3: null,
  header_4: null,
  anons: "",
  source: news?.source_url || "",
  language: "ru",
  background: { opening_html_tag: "<ul>", items: [], closing_html_tag: "</ul>" },
  paragraph_1: { role: "paragraph", opening_html_tag: "<p>", content: "", closing_html_tag: "</p>" },
  paragraph_2: { role: "quote", opening_html_tag: '<div class="quote-block"><p>', content: [""], closing_html_tag: "</p></div>" },
  paragraph_3: { role: "paragraph", opening_html_tag: "<p>", content: "", closing_html_tag: "</p>" },
});

const resolveAdminPostEditBase = (environment = "test") =>
  ADMIN_POST_EDIT_BASE[environment] || ADMIN_POST_EDIT_BASE.test;

const NewsWriterModal = ({ isOpen, news, onClose }) => {
  const [activeStep, setActiveStep] = useState(STEP_KEYS.background);
  const [backgroundDraft, setBackgroundDraft] = useState("");
  const [articlePayload, setArticlePayload] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingStep, setCurrentProcessingStep] = useState(null);
  const [stepStatus, setStepStatus] = useState({
    [STEP_KEYS.background]: "locked",
    [STEP_KEYS.headlines]: "locked",
    [STEP_KEYS.draft]: "locked",
    [STEP_KEYS.publish]: "locked",
  });
  const [placeholders, setPlaceholders] = useState({
    [STEP_KEYS.background]: "",
    [STEP_KEYS.headlines]: "",
    [STEP_KEYS.draft]: "",
    [STEP_KEYS.publish]: "",
  });
  const [canRegenerateBackground, setCanRegenerateBackground] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [countdownStep, setCountdownStep] = useState(null);
  const [publishCountdown, setPublishCountdown] = useState(null);
  const [publishedExternalId, setPublishedExternalId] = useState(null);
  const [publishEnvironment, setPublishEnvironment] = useState("test");
  const [isGeneratingArticleText, setIsGeneratingArticleText] = useState(false);
  const [isGeneratingHeaders, setIsGeneratingHeaders] = useState(false);
  const [rawHeadlinesResponse, setRawHeadlinesResponse] = useState(null);
  const [headerOptions, setHeaderOptions] = useState(() => createEmptyHeaderOptions(news?.headline_raw));
  const [selectedHeaderKey, setSelectedHeaderKey] = useState(null);
  const [pendingArticlePayload, setPendingArticlePayload] = useState(null);
  const [headlinesError, setHeadlinesError] = useState(null);

  const generationTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const publishCountdownTimerRef = useRef(null);
  const publishDeadlineRef = useRef(null);
  const publishTaskIdRef = useRef(0);
  const autoProceedRef = useRef({});
  const backgroundAbortControllerRef = useRef(null);
  const lastSavedBackgroundRef = useRef("");
  const articleAbortControllerRef = useRef(null);
  const lastSavedArticlePayloadRef = useRef("");
  const articlePayloadContainerTypeRef = useRef("object"); // 'object' | 'array'
  const initialArticleProvidedRef = useRef(false);
  const wasArticleRegeneratedRef = useRef(false);
  const publishAbortControllerRef = useRef(null);
  const placeholderRotationTimerRef = useRef(null);
  const publishFlowIdRef = useRef(0);
  const headerAbortControllerRef = useRef(null);
  const headersRequestIdRef = useRef(0);
  const articleGenerationRequestIdRef = useRef(0);

  const persistArticlePayload = async (nextPayload, selectionKey = selectedHeaderKey) => {
    if (!nextPayload || typeof nextPayload !== "object") {
      return;
    }

    const hasValidSelection = Boolean(selectionKey && HEADER_KEYS.includes(selectionKey));
    if (!hasValidSelection) {
      return;
    }

    try {
      const serialized = JSON.stringify(
        articlePayloadContainerTypeRef.current === "array" ? [nextPayload] : nextPayload
      );
      if (serialized === lastSavedArticlePayloadRef.current) {
        return;
      }
      await updateInboxArticlePayload({
        inboxId: news.id,
        articlePayload: serialized,
      });
      lastSavedArticlePayloadRef.current = serialized;
    } catch (error) {
      console.error("Не удалось сохранить выбор заголовка:", error);
    }
  };

  const clearTimers = () => {
    if (generationTimerRef.current) {
      clearTimeout(generationTimerRef.current);
      generationTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (publishCountdownTimerRef.current) {
      clearInterval(publishCountdownTimerRef.current);
      publishCountdownTimerRef.current = null;
    }
    if (placeholderRotationTimerRef.current) {
      clearInterval(placeholderRotationTimerRef.current);
      placeholderRotationTimerRef.current = null;
    }
  };

  const startPlaceholderRotation = (stepKey) => {
    const items = STEP_PLACEHOLDERS[stepKey] || [];
    if (!items.length) return;
    let idx = 0;
    setPlaceholders((prev) => ({ ...prev, [stepKey]: items[idx] }));
    if (placeholderRotationTimerRef.current) {
      clearInterval(placeholderRotationTimerRef.current);
      placeholderRotationTimerRef.current = null;
    }
    placeholderRotationTimerRef.current = setInterval(() => {
      idx = (idx + 1) % items.length;
      setPlaceholders((prev) => ({ ...prev, [stepKey]: items[idx] }));
    }, PLACEHOLDER_ROTATION_MS);
  };

  const stopPlaceholderRotation = () => {
    if (placeholderRotationTimerRef.current) {
      clearInterval(placeholderRotationTimerRef.current);
      placeholderRotationTimerRef.current = null;
    }
  };
  // Унифицированный publish-поток для ручного и автоматического сценариев
  const startPublishFlow = async ({ mode = "manual", production = false } = {}) => {
    // защита от дублей
    const flowId = ++publishFlowIdRef.current;

    const ok = await ensureArticlePatched();
    if (!ok) return;

    setPublishEnvironment(production ? "lb" : "test");

    startPlaceholderRotation(STEP_KEYS.publish);
    setStatusMessage(mode === "auto" ? "Автоматически отправляем новость на публикацию..." : "Отправляем на публикацию...");
    setIsProcessing(true);
    setCurrentProcessingStep(STEP_KEYS.publish);
    setActiveStep(STEP_KEYS.publish);
    setStepStatus({
      [STEP_KEYS.background]: "complete",
      [STEP_KEYS.headlines]: "complete",
      [STEP_KEYS.draft]: "complete",
      [STEP_KEYS.publish]: "loading",
    });

    try {
      publishAbortControllerRef.current = new AbortController();
      // POST publish
      const publishResp = await publishArticles({ inboxIds: [news.id], specificIds: [], limit: 1, timeout: 300, retryFailed: false, production: production, signal: publishAbortControllerRef.current.signal });

      // Поллинг публикации до published
      let externalId = null;
      let lastStatus = null;
      const startedAt = Date.now();
      const timeoutMs = 120000; // 2 минуты
      const pollIntervalMs = 1500;
      while (Date.now() - startedAt < timeoutMs) {
        const publications = await fetchPublicationsByInboxId({ inboxId: news.id, page: 1, pageSize: 1, sortOrder: "desc", signal: publishAbortControllerRef.current.signal });
        const rec = publications?.records?.[0];
        lastStatus = rec?.status || null;
        externalId = rec?.external_id || null;
        
        // Проверяем, что article_payload не null
        if (rec && rec.article_payload === null) {
          throw new Error("Статья сгенерировалась, но payload на публикацию собрать не удалось");
        }
        
        if (lastStatus === "published" && externalId) break;
        if (lastStatus === "failed") break;
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        // если запущен новый поток — выходим
        if (publishFlowIdRef.current !== flowId) return;
      }

      const duration = randomBetween(PUBLISH_DURATION.min, PUBLISH_DURATION.max);
      if (externalId) {
        setPublishedExternalId(externalId);
      }
      const message = externalId ? `Опубликовано: id=${externalId}` : (lastStatus === "failed" ? "Публикация не удалась." : "Публикация завершена!");
      startPublishTimers(duration, message);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Ошибка публикации (унифицированный поток):", error);
        setIsProcessing(false);
        setCurrentProcessingStep(null);
        setActiveStep(STEP_KEYS.draft);
        setStepStatus({
          [STEP_KEYS.background]: "complete",
          [STEP_KEYS.draft]: "ready",
          [STEP_KEYS.publish]: "locked",
        });
        setStatusMessage("Не удалось опубликовать. Исправьте текст и попробуйте снова.");
        setPublishCountdown(null);
      }
    }
  };


  const setFinalPlaceholder = (stepKey) => {
    stopPlaceholderRotation();
    const items = STEP_PLACEHOLDERS[stepKey] || [];
    if (items.length) {
      const last = items[items.length - 1];
      setPlaceholders((prev) => ({ ...prev, [stepKey]: last }));
    }
  };

  const resetState = () => {
    clearTimers();
    // Инвалидация любых фоновых задач публикации
    publishTaskIdRef.current += 1;
    autoProceedRef.current = {};
    if (backgroundAbortControllerRef.current) {
      try { backgroundAbortControllerRef.current.abort(); } catch (_) {}
      backgroundAbortControllerRef.current = null;
    }
    if (articleAbortControllerRef.current) {
      try { articleAbortControllerRef.current.abort(); } catch (_) {}
      articleAbortControllerRef.current = null;
    }
    if (publishAbortControllerRef.current) {
      try { publishAbortControllerRef.current.abort(); } catch (_) {}
      publishAbortControllerRef.current = null;
    }
    if (headerAbortControllerRef.current) {
      try { headerAbortControllerRef.current.abort(); } catch (_) {}
      headerAbortControllerRef.current = null;
    }
    headersRequestIdRef.current += 1;
    setActiveStep(STEP_KEYS.background);
    setBackgroundDraft("");
    setArticlePayload(null);
    setStatusMessage("");
    setIsProcessing(false);
    setCurrentProcessingStep(null);
    setStepStatus({
      [STEP_KEYS.background]: "locked",
      [STEP_KEYS.draft]: "locked",
      [STEP_KEYS.publish]: "locked",
    });
    setPlaceholders({
      [STEP_KEYS.background]: "",
      [STEP_KEYS.draft]: "",
      [STEP_KEYS.publish]: "",
    });
    setCountdown(null);
    setCountdownStep(null);
    setPublishCountdown(null);
    lastSavedBackgroundRef.current = "";
    lastSavedArticlePayloadRef.current = "";
    setCanRegenerateBackground(false);
    setPublishedExternalId(null);
    setPublishEnvironment("test");
    setIsGeneratingHeaders(false);
    setRawHeadlinesResponse(null);
    setHeaderOptions(createEmptyHeaderOptions(news?.headline_raw));
    setSelectedHeaderKey(null);
    setPendingArticlePayload(null);
  };

  // Единый запуск таймеров публикации с защитой от «зомби»-таймеров
  const startPublishTimers = (durationMs, completeMessage) => {
    // фиксируем новый идентификатор задачи публикации
    const taskId = ++publishTaskIdRef.current;

    // рассчитываем дедлайн и запускаем стабильный обратный отсчёт
    const deadline = Date.now() + durationMs;
    publishDeadlineRef.current = deadline;

    const updateCountdown = () => {
      if (publishTaskIdRef.current !== taskId) {
        return; // задача уже отменена/переинициализирована
      }
      const remainingMs = Math.max(0, deadline - Date.now());
      const seconds = Math.ceil(remainingMs / 1000);
      setPublishCountdown(seconds > 0 ? seconds : null);
      if (remainingMs <= 0 && publishCountdownTimerRef.current) {
        clearInterval(publishCountdownTimerRef.current);
        publishCountdownTimerRef.current = null;
      }
    };

    // сбрасываем старый интервал отсчёта, если был
    if (publishCountdownTimerRef.current) {
      clearInterval(publishCountdownTimerRef.current);
      publishCountdownTimerRef.current = null;
    }
    updateCountdown();
    publishCountdownTimerRef.current = setInterval(updateCountdown, 250);

    // очистим прежний таймер завершения, если он был
    if (generationTimerRef.current) {
      clearTimeout(generationTimerRef.current);
      generationTimerRef.current = null;
    }

    generationTimerRef.current = setTimeout(() => {
      // Если задача была отменена/перезапущена, выходим тихо
      if (publishTaskIdRef.current !== taskId) {
        return;
      }
      setIsProcessing(false);
      setCurrentProcessingStep(null);
      setFinalPlaceholder(STEP_KEYS.draft);
      setActiveStep(STEP_KEYS.publish);
      setStepStatus({
        [STEP_KEYS.background]: "complete",
        [STEP_KEYS.headlines]: "complete",
        [STEP_KEYS.draft]: "complete",
        [STEP_KEYS.publish]: "complete",
      });
      setStatusMessage(completeMessage || "Публикация завершена!");
      setPublishCountdown(null);
    }, durationMs);
  };

  const cancelAutoProceed = (step) => {
    autoProceedRef.current[step] = false;
    if (countdownTimerRef.current && countdownStep === step) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setCountdown(null);
      setCountdownStep(null);
    }
  };

  const startReviewCountdown = (step, onAutoComplete, prefix) => {
    cancelAutoProceed(step);
    autoProceedRef.current[step] = true;
    setCountdownStep(step);
    setCountdown(REVIEW_DELAY_SECONDS);
    setStatusMessage(`${prefix} (ещё ${REVIEW_DELAY_SECONDS} с)`);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          return prev;
        }
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          const shouldAuto = autoProceedRef.current[step];
          autoProceedRef.current[step] = false;
          setCountdown(null);
          setCountdownStep(null);
          if (shouldAuto) {
            onAutoComplete?.();
          }
          return null;
        }

        const next = prev - 1;
        setStatusMessage(`${prefix} (ещё ${next} с)`);
        return next;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!isOpen || !news) {
      return;
    }

    resetState();

    // Если есть article_payload, открываем в режиме просмотра (финальный экран)
    if (news.article_payload) {
      try {
        let parsed = news.article_payload;
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
        if (Array.isArray(parsed)) {
          parsed = parsed[0] || null;
        }
        if (parsed && typeof parsed === "object") {
          setArticlePayload(parsed);
          // Извлекаем заголовки из payload
          const headers = {
            header_1: parsed.header_1 || parsed.header || "",
            header_2: parsed.header_2 || "",
            header_3: parsed.header_3 || "",
            header_4: parsed.header_4 || "",
          };
          setHeaderOptions(headers);
          // Устанавливаем выбранный заголовок
          const selectedNum = parsed.selected_header_number || 2;
          const selectedKey = `header_${selectedNum}`;
          setSelectedHeaderKey(selectedKey);
          // Устанавливаем бэкграунд
          if (news.background) {
            setBackgroundDraft(news.background);
            lastSavedBackgroundRef.current = news.background;
          }
          // Переходим на финальный экран (draft/publish)
          setActiveStep(STEP_KEYS.draft);
          setStepStatus({
            [STEP_KEYS.background]: "complete",
            [STEP_KEYS.headlines]: "complete",
            [STEP_KEYS.draft]: "complete",
            [STEP_KEYS.publish]: "complete",
          });
          setStatusMessage("Результаты генерации новости");
          setIsProcessing(false);
          setCurrentProcessingStep(null);
          return;
        }
      } catch (error) {
        console.error("Не удалось распарсить article_payload для просмотра", error);
      }
    }

    startPlaceholderRotation(STEP_KEYS.background);

    // Если бэкграунд уже есть в inbox — отображаем его сразу, без автогенерации
    if (news.background) {
      lastSavedBackgroundRef.current = news.background || "";
      setStatusMessage("Бэкграунд загружен. Можно редактировать или сгенерировать новый.");
      setIsProcessing(false);
      setCurrentProcessingStep(null);
      setFinalPlaceholder(STEP_KEYS.draft);
      setActiveStep(STEP_KEYS.background);
      setBackgroundDraft(news.background || "");
      setStepStatus({
        [STEP_KEYS.background]: "review",
        [STEP_KEYS.headlines]: "locked",
        [STEP_KEYS.draft]: "locked",
        [STEP_KEYS.publish]: "locked",
      });
      setCanRegenerateBackground(true);
    } else {
      setStatusMessage(STEP_PLACEHOLDERS[STEP_KEYS.background][0]);
    setIsProcessing(true);
    setCurrentProcessingStep(STEP_KEYS.background);
    setStepStatus({
      [STEP_KEYS.background]: "loading",
      [STEP_KEYS.headlines]: "locked",
      [STEP_KEYS.draft]: "locked",
      [STEP_KEYS.publish]: "locked",
    });
    }

    const run = async () => {
      try {
        // Запрос к API генерации бэкграунда
        backgroundAbortControllerRef.current = new AbortController();
        const resp = await generateBackground({
          inboxId: news.id,
          gptPromptId: 1,
          signal: backgroundAbortControllerRef.current.signal,
        });

        // После генерации подтягиваем свежие данные inbox
        let preparedBackground = resp?.background || "";
        try {
          const fresh = await fetchInboxRecord({ inboxId: news.id, signal: backgroundAbortControllerRef.current.signal });
          if (fresh?.background) {
            preparedBackground = fresh.background;
          }
        } catch (_) {}
        if (!preparedBackground) {
          preparedBackground = INITIAL_BACKGROUND(news);
        }
        lastSavedBackgroundRef.current = preparedBackground || "";

          setIsProcessing(false);
          setCurrentProcessingStep(null);
        setBackgroundDraft(preparedBackground || "");
        setStepStatus((prev) => ({ ...prev, [STEP_KEYS.background]: "review" }));
        setCanRegenerateBackground(true);

        const autoLaunchDraft = async () => {
          // Перед автопереходом убеждаемся, что правки сохранены
          const ok = await ensureBackgroundPatched();
          if (!ok) return;
          handleLaunchHeadlines({ auto: true });
      };

      startReviewCountdown(
        STEP_KEYS.background,
        autoLaunchDraft,
        "Бэкграунд готов. Команда изучает материалы"
      );
      } catch (error) {
        if (error?.name === "AbortError") {
          return; // тихо выходим при отмене
        }
        console.error("Генерация бэкграунда не удалась:", error);
        setIsProcessing(false);
        setCurrentProcessingStep(null);
        const fallback = INITIAL_BACKGROUND(news);
        lastSavedBackgroundRef.current = fallback || "";
        setBackgroundDraft(fallback);
        setStepStatus((prev) => ({ ...prev, [STEP_KEYS.background]: "review" }));
        setStatusMessage("Не удалось сгенерировать бэкграунд, используем исходный текст.");
      }
    };

    if (!news.background) {
      run();
    }

    return () => {
      clearTimers();
      if (backgroundAbortControllerRef.current) {
        try { backgroundAbortControllerRef.current.abort(); } catch (_) {}
        backgroundAbortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, news]);

  useEffect(() => () => clearTimers(), []);

  if (!isOpen || !news) {
    return null;
  }

  const isCountdownActive = (step) => countdownStep === step && countdown !== null;

  const handleClose = () => {
    if (isProcessing && !window.confirm("Действительно прервать процесс написания?")) {
      return;
    }
    resetState();
    onClose?.();
  };

  const handleHoldBackground = () => {
    if (!["review", "ready"].includes(stepStatus[STEP_KEYS.background])) {
      return;
    }
    cancelAutoProceed(STEP_KEYS.background);
    setStepStatus((prev) => ({ ...prev, [STEP_KEYS.background]: "ready" }));
    setStatusMessage("Обновите бэкграунд и запустите генерацию текста, когда будете готовы.");
  };

  const handleRegenerateBackground = async () => {
    if (isProcessing) return;
    cancelAutoProceed(STEP_KEYS.background);
    if (backgroundAbortControllerRef.current) {
      try { backgroundAbortControllerRef.current.abort(); } catch (_) {}
      backgroundAbortControllerRef.current = null;
    }
    const placeholder = "Генерируем новый бэкграунд...";
    setPlaceholders((prev) => ({ ...prev, [STEP_KEYS.background]: placeholder }));
    setStatusMessage(placeholder);
    setIsProcessing(true);
    setCurrentProcessingStep(STEP_KEYS.background);
    setActiveStep(STEP_KEYS.background);
    setStepStatus({
      [STEP_KEYS.background]: "loading",
      [STEP_KEYS.headlines]: "locked",
      [STEP_KEYS.draft]: "locked",
      [STEP_KEYS.publish]: "locked",
    });

    setCanRegenerateBackground(false);

    try {
      backgroundAbortControllerRef.current = new AbortController();
      const resp = await generateBackground({
        inboxId: news.id,
        gptPromptId: 1,
        signal: backgroundAbortControllerRef.current.signal,
      });
      let preparedBackground = resp?.background || "";
      try {
        const fresh = await fetchInboxRecord({ inboxId: news.id, signal: backgroundAbortControllerRef.current.signal });
        if (fresh?.background) {
          preparedBackground = fresh.background;
        }
      } catch (_) {}
      if (!preparedBackground) {
        preparedBackground = INITIAL_BACKGROUND(news);
      }
      lastSavedBackgroundRef.current = preparedBackground || "";
      setIsProcessing(false);
      setCurrentProcessingStep(null);
      setBackgroundDraft(preparedBackground || "");
      setStepStatus((prev) => ({ ...prev, [STEP_KEYS.background]: "review" }));
      setStatusMessage("Новый бэкграунд сгенерирован. Проверьте и при необходимости отредактируйте.");
      setCanRegenerateBackground(true);

      const autoLaunchDraft = async () => {
        const ok = await ensureBackgroundPatched();
        if (!ok) return;
        handleLaunchHeadlines({ auto: true });
      };

      startReviewCountdown(
        STEP_KEYS.background,
        autoLaunchDraft,
        "Бэкграунд готов. Команда изучает материалы"
      );
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Не удалось сгенерировать новый бэкграунд:", error);
      setIsProcessing(false);
      setCurrentProcessingStep(null);
      setStatusMessage("Ошибка генерации. Попробуйте ещё раз.");
    }
  };

  const ensureBackgroundPatched = async () => {
    const current = (backgroundDraft || "").trim();
    const last = (lastSavedBackgroundRef.current || "").trim();
    // Если локальный стейт ещё не обновился, но lastSaved уже содержит
    // валидный бэкграунд (например, только что подтянули из БД) —
    // считаем бэкграунд валидным и не блокируем переход
    if (current === "" && last !== "") {
      setBackgroundDraft(last);
      return true;
    }
    if (current === "") {
      alert("Бэкграунд пуст. Уточните детали перед генерацией текста.");
      return false;
    }
    if (current === last) {
      return true;
    }
    try {
      await updateInboxBackground({ inboxId: news.id, background: backgroundDraft });
      lastSavedBackgroundRef.current = backgroundDraft;
      return true;
    } catch (error) {
      console.error("Не удалось сохранить бэкграунд:", error);
      alert("Не удалось сохранить бэкграунд. Попробуйте ещё раз.");
      return false;
    }
  };

  const runArticleGeneration = async ({ fallbackPayloadTemplate } = {}) => {
    if (!news?.id) {
      return;
    }

    if (articleAbortControllerRef.current) {
      try {
        articleAbortControllerRef.current.abort();
      } catch (_) {}
      articleAbortControllerRef.current = null;
    }

    const requestId = ++articleGenerationRequestIdRef.current;

    setIsGeneratingArticleText(true);
    setStepStatus((prev) => ({
      ...prev,
      [STEP_KEYS.draft]: "loading",
    }));

    try {
      articleAbortControllerRef.current = new AbortController();
      const articleResult = await generateArticlePayload({
        inboxId: news.id,
        signal: articleAbortControllerRef.current.signal,
      });

      if (articleGenerationRequestIdRef.current !== requestId) {
        return;
      }

      const payloadBody =
        deserializeArticlePayload(articleResult?.article_payload, articlePayloadContainerTypeRef) ||
        fallbackPayloadTemplate;

      if (payloadBody) {
        setPendingArticlePayload(payloadBody);

        setArticlePayload((prevPayload) => {
          const base = cloneDeep(prevPayload || fallbackPayloadTemplate || {});
          if (payloadBody.anons !== undefined) base.anons = payloadBody.anons;
          if (payloadBody.paragraph_1 !== undefined) base.paragraph_1 = payloadBody.paragraph_1;
          if (payloadBody.paragraph_2 !== undefined) base.paragraph_2 = payloadBody.paragraph_2;
          if (payloadBody.paragraph_3 !== undefined) base.paragraph_3 = payloadBody.paragraph_3;
          if (payloadBody.background !== undefined) base.background = payloadBody.background;
          if (payloadBody.source) base.source = payloadBody.source;
          if (payloadBody.language) base.language = payloadBody.language;
          if (payloadBody.sport_id !== undefined) base.sport_id = payloadBody.sport_id;
          if (payloadBody.category_id !== undefined) base.category_id = payloadBody.category_id;
          return base;
        });

        setStatusMessage((prev) =>
          selectedHeaderKey
            ? "Новый черновик готов. Проверьте и при необходимости отредактируйте."
            : prev || "Черновик почти готов. Выберите заголовок, чтобы продолжить."
        );
        setStepStatus((prev) => ({
          ...prev,
          [STEP_KEYS.draft]: selectedHeaderKey ? "review" : "ready",
        }));
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      console.error("Не удалось сгенерировать article_payload:", error);
      setStatusMessage("Не удалось сгенерировать черновик. Попробуйте ещё раз.");
      setStepStatus((prev) => ({
        ...prev,
        [STEP_KEYS.draft]: "ready",
      }));
    } finally {
      if (articleGenerationRequestIdRef.current === requestId) {
        setIsGeneratingArticleText(false);
        articleAbortControllerRef.current = null;
      }
    }
  };

  const handleLaunchHeadlines = async ({ auto = false, regenerate = false } = {}) => {
    const backgroundState = stepStatus[STEP_KEYS.background];
    if (!["review", "ready", "complete"].includes(backgroundState)) {
      return;
    }

    if (regenerate) {
      const hasUserChanges = SELECTABLE_HEADER_KEYS.some((key) => (headerOptions[key] || "").trim() !== "");
      if (
        hasUserChanges &&
        !window.confirm("Перегенерация заголовков удалит текущие варианты. Продолжить?")
      ) {
        return;
      }
    }

    try {
      const fresh = await fetchInboxRecord({ inboxId: news.id });
      if (fresh?.background && !backgroundDraft?.trim()) {
        setBackgroundDraft(fresh.background);
        lastSavedBackgroundRef.current = fresh.background;
      }
    } catch (_) {}

    const ok = await ensureBackgroundPatched();
    if (!ok) return;

    cancelAutoProceed(STEP_KEYS.background);

    if (regenerate) {
      setSelectedHeaderKey(null);
      setRawHeadlinesResponse(null);
    }

    startPlaceholderRotation(STEP_KEYS.headlines);
    const manualStatus = regenerate ? "Перегенерируем заголовки..." : "Готовим варианты заголовков...";
    const autoStatus = regenerate
      ? "Автоматически перегенерируем заголовки..."
      : "Автоматически собираем варианты заголовков...";
    setStatusMessage(auto ? autoStatus : manualStatus);
    setIsProcessing(true);
    setCurrentProcessingStep(STEP_KEYS.headlines);
    setActiveStep(STEP_KEYS.headlines);
    setStepStatus({
      [STEP_KEYS.background]: "complete",
      [STEP_KEYS.headlines]: "loading",
      [STEP_KEYS.draft]: "locked",
      [STEP_KEYS.publish]: "locked",
    });
    setIsGeneratingHeaders(true);
    setHeadlinesError(null);

    const fallbackPayloadTemplate = createFallbackArticlePayload(news);

    try {
      headerAbortControllerRef.current = new AbortController();
      const requestId = ++headersRequestIdRef.current;

      const headlinesResult = await withTimeout(
        generateArticleHeaders({
          inboxId: news.id,
          gptPromptId: HEADLINES_GENERATION_PROMPT_ID,
          signal: headerAbortControllerRef.current.signal,
        }),
        HEADLINES_TIMEOUT_MS
      );
      setRawHeadlinesResponse(headlinesResult);

      let inboxSnapshot = null;
      try {
        inboxSnapshot = await fetchInboxRecord({
            inboxId: news.id,
          signal: headerAbortControllerRef.current.signal,
        });
            } catch (error) {
        console.warn("Не удалось получить свежий inbox после генерации заголовков:", error);
      }

      if (headersRequestIdRef.current !== requestId) {
        return;
      }

      const inboxHeadlines = inboxSnapshot
        ? parseInboxHeadlines(inboxSnapshot.headlines, news?.headline_raw)
        : null;
      const responseHeadlines = extractHeadlineCandidates(headlinesResult) || {};

      const resolvedHeaderOptions = {
        header_1: sanitizeHeaderValue(news?.headline_raw),
        header_2: sanitizeHeaderValue(inboxHeadlines?.header_2 ?? responseHeadlines.header_2),
        header_3: sanitizeHeaderValue(inboxHeadlines?.header_3 ?? responseHeadlines.header_3),
        header_4: sanitizeHeaderValue(inboxHeadlines?.header_4 ?? responseHeadlines.header_4),
      };

      let payloadFromServer = inboxSnapshot?.article_payload
        ? deserializeArticlePayload(inboxSnapshot.article_payload, articlePayloadContainerTypeRef)
        : null;

      if (!payloadFromServer) {
        payloadFromServer = cloneDeep(articlePayload || fallbackPayloadTemplate);
      }

      const payloadWithResolvedHeaders = updateArticlePayloadWithHeaders(
        payloadFromServer,
        resolvedHeaderOptions,
        "header_1"
      );

      let existingSelectedKey = null;
      const snapshotSelectedNumber = payloadFromServer?.selected_header_number;
      if (!regenerate && snapshotSelectedNumber && snapshotSelectedNumber >= 2 && snapshotSelectedNumber <= 4) {
        existingSelectedKey = `header_${snapshotSelectedNumber}`;
      } else if (!regenerate) {
        const determined = determineSelectedHeaderKey(
          resolvedHeaderOptions,
          payloadFromServer?.header || articlePayload?.header
        );
        if (SELECTABLE_HEADER_KEYS.includes(determined)) {
          existingSelectedKey = determined;
        }
      }

      const normalizedHeaderOptions = deriveHeaderOptionsFromPayload(
        payloadWithResolvedHeaders,
        news?.headline_raw,
        resolvedHeaderOptions
      );
      const normalizedPayload = updateArticlePayloadWithHeaders(
        payloadWithResolvedHeaders,
        normalizedHeaderOptions,
        existingSelectedKey || "header_1"
      );

      setHeaderOptions(normalizedHeaderOptions);
      setArticlePayload(normalizedPayload);
      setSelectedHeaderKey(existingSelectedKey);
      setIsProcessing(false);
      setCurrentProcessingStep(null);
      setHeadlinesError(null);
      setStatusMessage(
        existingSelectedKey
          ? "Заголовки загружены. Можно выбрать другой или перейти к тексту."
          : "Заголовки готовы. Выберите лучший вариант."
      );
      setStepStatus((prev) => ({
        ...prev,
        [STEP_KEYS.headlines]: existingSelectedKey ? "complete" : "review",
      }));

      runArticleGeneration({
        fallbackPayloadTemplate: normalizedPayload || fallbackPayloadTemplate,
      }).catch((error) => console.error("Ошибка генерации текста после заголовков", error));
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.warn("Не удалось получить альтернативные заголовки:", error);
      setHeadlinesError(error);
      const fallbackOptions = createEmptyHeaderOptions(news?.headline_raw);
      setHeaderOptions(fallbackOptions);
      setSelectedHeaderKey(null);
      setArticlePayload((prevPayload) =>
        updateArticlePayloadWithHeaders(prevPayload || fallbackPayloadTemplate, fallbackOptions, "header_1")
      );
      setIsProcessing(false);
      setCurrentProcessingStep(null);
      setStatusMessage("Не удалось сгенерировать заголовки. Заполните их вручную или повторите попытку.");
      setStepStatus((prev) => ({
        ...prev,
        [STEP_KEYS.headlines]: "review",
      }));
    } finally {
      setIsGeneratingHeaders(false);
    }

    initialArticleProvidedRef.current = true;
    wasArticleRegeneratedRef.current = true;
  };

  const handleHeadlineSelect = async (key) => {
    if (!SELECTABLE_HEADER_KEYS.includes(key)) {
      return;
    }

    const sourcePayload =
      articlePayload ||
      (pendingArticlePayload ? updateArticlePayloadWithHeaders(pendingArticlePayload, headerOptions, "header_1") : null) ||
      createFallbackArticlePayload(news);
    const nextPayload = updateArticlePayloadWithHeaders(cloneDeep(sourcePayload), headerOptions, key);
    setArticlePayload(nextPayload);
    setSelectedHeaderKey(key);

    setStepStatus((prev) => ({
      ...prev,
      [STEP_KEYS.headlines]: "complete",
      [STEP_KEYS.draft]: isGeneratingArticleText ? "loading" : "review",
    }));
    setStatusMessage("Заголовок выбран и сохранён. Переходим к тексту.");
    setActiveStep(STEP_KEYS.draft);

    try {
      await persistArticlePayload(nextPayload, key);
            } catch (error) {
      console.error("Не удалось сохранить выбор заголовка:", error);
    }
  };

  const handleHoldDraft = () => {
    if (!["review", "ready"].includes(stepStatus[STEP_KEYS.draft])) {
      return;
    }
    cancelAutoProceed(STEP_KEYS.draft);
    setStepStatus((prev) => ({ ...prev, [STEP_KEYS.draft]: "ready" }));
    setActiveStep(STEP_KEYS.draft);
    setStatusMessage("Исправьте текст и отправьте на публикацию вручную.");
  };

  const handleRegenerateArticle = async () => {
    if (isProcessing) return;
    cancelAutoProceed(STEP_KEYS.draft);
    if (articleAbortControllerRef.current) {
      try { articleAbortControllerRef.current.abort(); } catch (_) {}
      articleAbortControllerRef.current = null;
    }
    if (publishAbortControllerRef.current) {
      try { publishAbortControllerRef.current.abort(); } catch (_) {}
      publishAbortControllerRef.current = null;
    }
    const placeholder = "Генерируем новый черновик...";
    setPlaceholders((prev) => ({ ...prev, [STEP_KEYS.draft]: placeholder }));
    setStatusMessage(placeholder);
    setIsProcessing(true);
    setCurrentProcessingStep(STEP_KEYS.draft);
    setActiveStep(STEP_KEYS.draft);
    setStepStatus({
      [STEP_KEYS.background]: "complete",
      [STEP_KEYS.headlines]: "complete",
      [STEP_KEYS.draft]: "loading",
      [STEP_KEYS.publish]: "locked",
    });

    try {
      await runArticleGeneration({
        fallbackPayloadTemplate: createFallbackArticlePayload(news),
      });
      setIsProcessing(false);
      setCurrentProcessingStep(null);
      setStatusMessage("Новый черновик готов. Проверьте и при необходимости отредактируйте.");
      setStepStatus((prev) => ({ ...prev, [STEP_KEYS.draft]: "review" }));
      wasArticleRegeneratedRef.current = true;
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Не удалось сгенерировать новый черновик:", error);
      setIsProcessing(false);
      setCurrentProcessingStep(null);
      setStatusMessage("Ошибка генерации. Попробуйте ещё раз.");
    }
  };

  const ensureArticlePatched = async () => {
    try {
      // Не допускаем записи "[null]": если локально нет payload, пытаемся подтянуть с сервера
      let payloadForSave = articlePayload;
      if (!payloadForSave || typeof payloadForSave !== "object") {
        try {
          const rec = await fetchInboxRecord({ inboxId: news.id });
          if (rec?.article_payload) {
            const parsed = typeof rec.article_payload === "string" ? JSON.parse(rec.article_payload) : rec.article_payload;
            const isArray = Array.isArray(parsed);
            articlePayloadContainerTypeRef.current = isArray ? "array" : "object";
            payloadForSave = isArray ? parsed[0] : parsed;
          }
        } catch (_) {}
      }

      // Если по‑прежнему пусто — просто не сохраняем заново
      if (!payloadForSave || typeof payloadForSave !== "object") {
        return true;
      }

      const optionsForSave = headerOptions || {};
      const selectedKey = HEADER_KEYS.includes(selectedHeaderKey) ? selectedHeaderKey : "header_1";
      const headerValue = sanitizeHeaderValue(optionsForSave[selectedKey] ?? payloadForSave.header);

      payloadForSave = updateArticlePayloadWithHeaders(payloadForSave, optionsForSave, selectedKey);

      const preparedPayload = { ...payloadForSave, header: headerValue };

      const serialized = JSON.stringify(
        articlePayloadContainerTypeRef.current === "array" ? [preparedPayload] : preparedPayload
      );

      if (serialized === lastSavedArticlePayloadRef.current) {
        return true;
      }
      await updateInboxArticlePayload({
        inboxId: news.id,
        articlePayload: serialized,
      });
      lastSavedArticlePayloadRef.current = serialized;
      return true;
    } catch (error) {
      console.error("Не удалось сохранить article_payload:", error);
      alert("Не удалось сохранить черновик новости. Попробуйте ещё раз.");
      return false;
    }
  };

  const handlePreparePublish = ({ auto = false } = {}) => {
    if (!["review", "ready"].includes(stepStatus[STEP_KEYS.draft])) {
      return;
    }

    const proceed = async () => {
      cancelAutoProceed(STEP_KEYS.draft);
      await startPublishFlow({ mode: auto ? "auto" : "manual", production: false });
    };

    proceed();
  };

  const handlePreparePublishLB = ({ auto = false } = {}) => {
    if (!["review", "ready"].includes(stepStatus[STEP_KEYS.draft])) {
      return;
    }

    const proceed = async () => {
      cancelAutoProceed(STEP_KEYS.draft);
      await startPublishFlow({ mode: auto ? "auto" : "manual", production: true });
    };

    proceed();
  };

  const handleAbortPublish = () => {
    if (currentProcessingStep !== STEP_KEYS.publish) {
      return;
    }

    // Очищаем все таймеры, включая таймер генерации
    clearTimers();
    // Инвалидация текущей задачи публикации, чтобы старые таймеры ничего не сделали
    publishTaskIdRef.current += 1;
    cancelAutoProceed(STEP_KEYS.publish);
    setIsProcessing(false);
    setCurrentProcessingStep(null);
    setActiveStep(STEP_KEYS.draft);
    setStepStatus({
      [STEP_KEYS.background]: "complete",
      [STEP_KEYS.draft]: "ready",
      [STEP_KEYS.publish]: "locked",
    });
    setStatusMessage("Публикация приостановлена. Дополните текст и попробуйте снова.");
    setPublishCountdown(null);
  };

  const renderBackgroundContent = () => {
    if (stepStatus[STEP_KEYS.background] === "loading") {
      return null;
    }

    return (
      <div className="flex flex-col h-full">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2" htmlFor="background-input">
          Сформированный бэкграунд
        </label>
        <textarea
          id="background-input"
          value={backgroundDraft}
          onChange={(event) => setBackgroundDraft(event.target.value)}
          className="w-full flex-1 min-h-[240px] border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 focus:border-transparent resize-none bg-white dark:bg-[#1d2230] text-gray-900 dark:text-gray-100"
        />
      </div>
    );
  };

  const renderHeadlinesContent = () => {
    if (stepStatus[STEP_KEYS.headlines] === "loading") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600 dark:text-gray-300 space-y-3">
          <Loader className="w-6 h-6" />
          <span>Готовим варианты заголовков...</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1 text-gray-700 dark:text-gray-200">
        {headlinesError ? (
          <div className="p-3 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/60 text-sm text-red-700 dark:text-red-200 rounded-lg">
            Не удалось сгенерировать заголовки автоматически. Отредактируйте варианты вручную или попробуйте
            перегенерацию.
          </div>
        ) : null}

        <div className="space-y-4">
          {SELECTABLE_HEADER_KEYS.map((key) => {
            const isSelected = selectedHeaderKey === key;
            const value = headerOptions[key] || "";
            return (
              <div
                key={key}
                className={`border rounded-lg p-4 transition ${
                  isSelected
                    ? "border-teal-400 bg-teal-50 dark:bg-teal-500/10"
                    : "border-gray-200 bg-white dark:border-gray-600 dark:bg-[#1d2230]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleHeadlineSelect(key)}
                    disabled={isSelected || isProcessing}
                    className={`mt-1 px-2 py-1 text-xs rounded border font-medium transition ${
                      isSelected
                        ? "bg-teal-500 text-white border-teal-500 dark:text-white"
                        : "border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#22293a]"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? "Выбрано" : "Выбрать"}
                  </button>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">
                      {HEADER_LABELS[key]}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setHeaderOptions((prev) => {
                          const nextOptions = { ...prev, [key]: nextValue };
                          setArticlePayload((prevPayload) => {
                            const source = prevPayload || createFallbackArticlePayload(news);
                            return updateArticlePayloadWithHeaders(
                              cloneDeep(source),
                              nextOptions,
                              selectedHeaderKey || "header_1"
                            );
                          });
                          return nextOptions;
                        });
                      }}
                      onBlur={(event) => {
                        if (selectedHeaderKey === key) {
                          const latestValue = event.target.value;
                          const latestOptions = { ...headerOptions, [key]: latestValue };
                          const updatedPayload = updateArticlePayloadWithHeaders(
                            articlePayload || createFallbackArticlePayload(news),
                            latestOptions,
                            key
                          );
                          setArticlePayload(updatedPayload);
                          setHeaderOptions(latestOptions);
                          persistArticlePayload(updatedPayload, key);
                        }
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#1d2230] text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {rawHeadlinesResponse ? (
          <details className="bg-gray-100 dark:bg-[#1d2230] border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-200">Показать ответ API</summary>
            <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(rawHeadlinesResponse, null, 2)}</pre>
          </details>
        ) : null}
      </div>
    );
  };

  const renderDraftContent = () => {
    const readOnly = currentProcessingStep === STEP_KEYS.publish;

    if (!selectedHeaderKey) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600 dark:text-gray-300 space-y-3">
          <span>Выберите заголовок на предыдущем шаге, чтобы перейти к тексту.</span>
        </div>
      );
    }

    if (isGeneratingArticleText) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600 dark:text-gray-300 space-y-3">
          <Loader className="w-6 h-6" />
            <span>Генерируем текст статьи...</span>
        </div>
      );
    }

    const bItems = Array.isArray(articlePayload?.background?.items)
      ? articlePayload.background.items
      : [];

    const updateField = (key, value) => {
      setArticlePayload((prev) => ({ ...prev, [key]: value }));
    };

    const updateParagraph = (key, content) => {
      setArticlePayload((prev) => ({
        ...prev,
        [key]: { ...(prev?.[key] || {}), content },
      }));
    };

    const addBackgroundItem = () => {
      setArticlePayload((prev) => ({
        ...prev,
        background: {
          opening_html_tag: prev?.background?.opening_html_tag || "<ul>",
          closing_html_tag: prev?.background?.closing_html_tag || "</ul>",
          items: [...(prev?.background?.items || []), ""],
        },
      }));
    };

    const updateBackgroundItem = (idx, value) => {
      setArticlePayload((prev) => {
        const items = [...(prev?.background?.items || [])];
        items[idx] = value;
        return {
          ...prev,
          background: {
            opening_html_tag: prev?.background?.opening_html_tag || "<ul>",
            closing_html_tag: prev?.background?.closing_html_tag || "</ul>",
            items,
          },
        };
      });
    };

    const removeBackgroundItem = (idx) => {
      setArticlePayload((prev) => {
        const items = [...(prev?.background?.items || [])];
        items.splice(idx, 1);
        return {
          ...prev,
          background: {
            opening_html_tag: prev?.background?.opening_html_tag || "<ul>",
            closing_html_tag: prev?.background?.closing_html_tag || "</ul>",
            items,
          },
        };
      });
    };

    const chosenHeaderValue = sanitizeHeaderValue(
      articlePayload?.header || headerOptions[selectedHeaderKey] || ""
    );

    return (
      <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1 text-gray-700 dark:text-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Выбранный заголовок</label>
                      <input
                        type="text"
            value={chosenHeaderValue}
            readOnly
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-[#1d2230]/60 text-gray-700 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Чтобы изменить заголовок, вернитесь на вкладку «Предлагаю заголовки».
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Анонс</label>
        <textarea
            value={articlePayload?.anons || ""}
            onChange={(e) => updateField("anons", e.target.value)}
          readOnly={readOnly}
            className={`w-full min-h-[80px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent resize-y text-gray-900 dark:text-gray-100 ${
              readOnly ? "bg-gray-100 dark:bg-[#1d2230]/60" : "bg-white dark:bg-[#1d2230]"
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Абзац 1</label>
          <textarea
            value={articlePayload?.paragraph_1?.content || ""}
            onChange={(e) => updateParagraph("paragraph_1", e.target.value)}
            readOnly={readOnly}
            className={`w-full min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent resize-y text-gray-900 dark:text-gray-100 ${
              readOnly ? "bg-gray-100 dark:bg-[#1d2230]/60" : "bg-white dark:bg-[#1d2230]"
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Цитата (абзац 2)</label>
          <textarea
            value={Array.isArray(articlePayload?.paragraph_2?.content)
              ? articlePayload.paragraph_2.content.join("\n\n")
              : articlePayload?.paragraph_2?.content || ""}
            onChange={(e) => {
              const parts = e.target.value.split(/\n\n/);
              setArticlePayload((prev) => ({
                ...prev,
                paragraph_2: { ...(prev?.paragraph_2 || { role: "quote" }), content: parts },
              }));
            }}
            readOnly={readOnly}
            className={`w-full min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent resize-y text-gray-900 dark:text-gray-100 ${
              readOnly ? "bg-gray-100 dark:bg-[#1d2230]/60" : "bg-white dark:bg-[#1d2230]"
            }`}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Разделяйте несколько реплик пустой строкой.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Абзац 3</label>
          <textarea
            value={articlePayload?.paragraph_3?.content || ""}
            onChange={(e) => updateParagraph("paragraph_3", e.target.value)}
            readOnly={readOnly}
            className={`w-full min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent resize-y text-gray-900 dark:text-gray-100 ${
              readOnly ? "bg-gray-100 dark:bg-[#1d2230]/60" : "bg-white dark:bg-[#1d2230]"
            }`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Бэкграунд</label>
            <button
              type="button"
              onClick={addBackgroundItem}
              disabled={readOnly}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-[#252c40] hover:bg-gray-300 dark:hover:bg-[#2f374d] text-gray-700 dark:text-gray-200 rounded"
            >
              Добавить пункт
            </button>
          </div>
          <div className="space-y-2">
            {bItems.map((val, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <textarea
                  value={val || ""}
                  onChange={(e) => updateBackgroundItem(idx, e.target.value)}
                  readOnly={readOnly}
                  className={`flex-1 min-h-[48px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus-border-transparent resize-y text-gray-900 dark:text-gray-100 ${
                    readOnly ? "bg-gray-100 dark:bg-[#1d2230]/60" : "bg-white dark:bg-[#1d2230]"
                  }`}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeBackgroundItem(idx)}
                    className="px-2 py-2 text-xs bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-500/25 rounded"
                  >
                    Удалить
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Источник</label>
          {articlePayload?.source ? (
            <a
              href={articlePayload.source}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-300 hover:underline text-sm break-all"
            >
              {articlePayload.source}
            </a>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Ссылка отсутствует</span>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    if (activeStep === STEP_KEYS.background) {
      return renderBackgroundContent();
    }

    if (activeStep === STEP_KEYS.headlines) {
      return renderHeadlinesContent();
    }

    if (activeStep === STEP_KEYS.draft || activeStep === STEP_KEYS.publish) {
      return renderDraftContent();
    }

    return (
      <div className="text-center py-6 text-green-600 font-semibold">
        Новость отправлена в космос! Возвращаемся на базу.
      </div>
    );
  };

  const renderControls = () => {
    if (activeStep === STEP_KEYS.background) {
      const holdLabel = isCountdownActive(STEP_KEYS.background)
        ? `Бэк плохой, я дополню (${countdown ?? REVIEW_DELAY_SECONDS})`
        : "Бэк плохой, я дополню";
      const disabledState =
        isProcessing || !["review", "ready"].includes(stepStatus[STEP_KEYS.background]);

      return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
          <p className="text-sm text-gray-500">
            Скорректируйте бэкграунд и запустите генерацию заголовков, когда будете готовы.
          </p>
          <div className="flex items-center gap-2">
            {((news?.background && canRegenerateBackground) || (stepStatus[STEP_KEYS.background] === "ready")) ? (
              <button
                type="button"
                onClick={handleRegenerateBackground}
                disabled={disabledState}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold rounded shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Собрать новый
              </button>
            ) : null}
            {!news?.background || (!canRegenerateBackground && stepStatus[STEP_KEYS.background] !== "loading") ? (
            <button
              type="button"
              onClick={handleHoldBackground}
              disabled={disabledState}
              className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-sm font-semibold rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {holdLabel}
            </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleLaunchHeadlines({ auto: false })}
              disabled={disabledState}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Перейти к заголовкам
            </button>
          </div>
        </div>
      );
    }

    if (activeStep === STEP_KEYS.headlines) {
      const disabledState = isProcessing || stepStatus[STEP_KEYS.headlines] === "loading" || isGeneratingHeaders;

      return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
          <p className="text-sm text-gray-500">
            Выберите подходящий заголовок. После выбора мы автоматически перейдём к написанию текста.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLaunchHeadlines({ auto: false, regenerate: true })}
              disabled={disabledState}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold rounded shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Перегенерировать заголовки
            </button>
          </div>
        </div>
      );
    }

    if (activeStep === STEP_KEYS.draft) {
      const disabledState =
        isProcessing || !["review", "ready"].includes(stepStatus[STEP_KEYS.draft]);

      return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
          <p className="text-sm text-gray-500">
            Текст можно дополнять. Как будете готовы — отправляйте на публикацию.
          </p>
          <div className="flex items-center gap-2">
            {initialArticleProvidedRef.current && !wasArticleRegeneratedRef.current ? (
              <button
                type="button"
                onClick={handleRegenerateArticle}
                disabled={disabledState}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold rounded shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Сгенерировать новый
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handlePreparePublish({ auto: false })}
              disabled={disabledState}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Публиковать&gt;TEST
            </button>
            <button
              type="button"
              onClick={() => handlePreparePublishLB({ auto: false })}
              disabled={disabledState}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Публиковать&gt;LB
            </button>
          </div>
        </div>
      );
    }

    if (activeStep === STEP_KEYS.publish) {
      const isRunning = currentProcessingStep === STEP_KEYS.publish;
      const buttonLabel = publishCountdown !== null 
        ? `Приостановить публикацию (${publishCountdown} с)` 
        : "Приостановить публикацию";

      return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
          <p className="text-sm text-gray-500">
            Публикуем черновик. Можно приостановить и вернуться к редактированию.
          </p>
          <button
            type="button"
            onClick={handleAbortPublish}
            disabled={!isRunning}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </button>
        </div>
      );
    }

    return (
      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded shadow transition"
        >
          Закрыть
        </button>
      </div>
    );
  };

  const canNavigateTo = (step) => {
    if (step === STEP_KEYS.background) return true;
    if (step === STEP_KEYS.headlines) return stepStatus[STEP_KEYS.background] !== "locked";
    if (step === STEP_KEYS.draft) return stepStatus[STEP_KEYS.headlines] === "complete";
    return false;
  };

  const navigateToStep = async (step) => {
    if (activeStep === step) {
      return;
    }
    if (isProcessing && !window.confirm("Процесс выполняется. Прервать и вернуться назад?")) {
      return;
    }
    clearTimers();
    publishTaskIdRef.current += 1;
    setIsProcessing(false);
    setCurrentProcessingStep(null);
    setCountdown(null);
    setCountdownStep(null);
    setPublishCountdown(null);
    if (backgroundAbortControllerRef.current) {
      try { backgroundAbortControllerRef.current.abort(); } catch (_) {}
      backgroundAbortControllerRef.current = null;
    }
    if (articleAbortControllerRef.current) {
      try { articleAbortControllerRef.current.abort(); } catch (_) {}
      articleAbortControllerRef.current = null;
    }
    if (headerAbortControllerRef.current) {
      try { headerAbortControllerRef.current.abort(); } catch (_) {}
      headerAbortControllerRef.current = null;
    }
    headersRequestIdRef.current += 1;

    if (step === STEP_KEYS.background) {
      setActiveStep(STEP_KEYS.background);
      setStepStatus({
        [STEP_KEYS.background]: "ready",
        [STEP_KEYS.headlines]: "locked",
        [STEP_KEYS.draft]: "locked",
        [STEP_KEYS.publish]: "locked",
      });
      setStatusMessage("Вернулись к бэкграунду. Обновите и запустите генерацию текста.");
      return;
    }

    if (step === STEP_KEYS.draft) {
      // Перед переходом убеждаемся, что бэкграунд сохранён
      const ok = await ensureBackgroundPatched();
      if (!ok) {
        // возвращаемся на шаг бэкграунда
        setActiveStep(STEP_KEYS.background);
        setStepStatus({
          [STEP_KEYS.background]: "ready",
          [STEP_KEYS.headlines]: "locked",
          [STEP_KEYS.draft]: "locked",
          [STEP_KEYS.publish]: "locked",
        });
        return;
      }
      // Если статья уже есть в записи — просто показываем её без генерации
      try {
        const rec = await fetchInboxRecord({ inboxId: news.id });
        let payloadObj = null;
        if (rec && rec.article_payload) {
          try {
            const parsed = typeof rec.article_payload === "string" ? JSON.parse(rec.article_payload) : rec.article_payload;
            const isArray = Array.isArray(parsed);
            articlePayloadContainerTypeRef.current = isArray ? "array" : "object";
            payloadObj = isArray ? parsed?.[0] : parsed;
          } catch (_) {
            articlePayloadContainerTypeRef.current = "object";
            payloadObj = null;
          }
        }

      setActiveStep(STEP_KEYS.draft);
      setStepStatus({
        [STEP_KEYS.background]: "complete",
        [STEP_KEYS.headlines]: "complete",
        [STEP_KEYS.draft]: "ready",
        [STEP_KEYS.publish]: "locked",
      });

        if (payloadObj && typeof payloadObj === "object") {
          setArticlePayload(payloadObj);
          lastSavedArticlePayloadRef.current = JSON.stringify(
            articlePayloadContainerTypeRef.current === "array" ? [payloadObj] : payloadObj
          );
          
          // Извлекаем заголовки из существующего payload
          const existingHeaders = {
            header_1: sanitizeHeaderValue(payloadObj.header_1 || payloadObj.header || news?.headline_raw),
            header_2: sanitizeHeaderValue(payloadObj.header_2),
            header_3: sanitizeHeaderValue(payloadObj.header_3),
            header_4: sanitizeHeaderValue(payloadObj.header_4),
          };
          setHeaderOptions(existingHeaders);
          
          // Определяем выбранный заголовок
          const selectedNumber = payloadObj.selected_header_number || 1;
          const selectedKey = `header_${selectedNumber}`;
          setSelectedHeaderKey(selectedKey);
          
          setStatusMessage("Вернулись к черновику. Загружен существующий article_payload.");
          initialArticleProvidedRef.current = true;
          wasArticleRegeneratedRef.current = false;
        } else {
          setStatusMessage("Вернулись к черновику. Текста пока нет — сгенерируйте новый.");
        }
      } catch (error) {
        console.error("Не удалось загрузить существующий article_payload:", error);
        setActiveStep(STEP_KEYS.draft);
        setStepStatus({
          [STEP_KEYS.background]: "complete",
          [STEP_KEYS.headlines]: "complete",
          [STEP_KEYS.draft]: "ready",
          [STEP_KEYS.publish]: "locked",
        });
        setStatusMessage("Вернулись к черновику. Текста пока нет — сгенерируйте новый.");
      }
    }
  };

  const renderStepCard = (step) => {
    const status = stepStatus[step] || "locked";
    const baseClass = STATUS_STYLES[status] || STATUS_STYLES.locked;
    const isActive = activeStep === step && step !== STEP_KEYS.done;
    const clickable = canNavigateTo(step);
    return (
      <div
        key={step}
        className={`border rounded-lg px-3 py-2 text-sm ${
          isActive ? "border-blue-500 bg-blue-50 text-blue-700" : baseClass
        } ${clickable ? "cursor-pointer hover:border-blue-400" : ""}`}
        onClick={clickable ? () => navigateToStep(step) : undefined}
      >
        <div className="font-semibold">{STEP_LABELS[step]}</div>
        <div className="text-xs mt-1">{STEP_STATUSES[status] || STEP_STATUSES.locked}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-[#141924] dark:text-gray-100 rounded-2xl shadow-xl dark:shadow-2xl w-full max-w-6xl relative p-6 max-h-[90vh] h-[90vh] flex flex-col">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Закрыть модалку"
        >
          ✕
        </button>

        <header className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Написание новости</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300 line-clamp-2">{news.headline_raw}</p>
        </header>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {renderStepCard(STEP_KEYS.background)}
          {renderStepCard(STEP_KEYS.headlines)}
          {renderStepCard(STEP_KEYS.draft)}
          {renderStepCard(STEP_KEYS.publish)}
        </div>

        <section className="border rounded-xl p-4 bg-gray-50 dark:bg-[#1b2132] dark:border-gray-700 flex-1 overflow-hidden flex flex-col">
          {isProcessing && activeStep !== STEP_KEYS.draft ? (
            <div className="bg-white dark:bg-[#181f2c] border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-inner minh-[100px]">
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-300">
                <Loader className="w-6 h-6" />
                <span>{statusMessage || "Готовимся к запуску миссии."}</span>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                {placeholders[activeStep] || "Подготавливаем данные..."}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              {statusMessage && (
                <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-300 mb-4 flex-shrink-0">
                  <span>🛰️</span>
                  <span>{statusMessage}</span>
                </div>
              )}
              <div className="flex-1 min-h-0">
                {renderStepContent()}
              </div>
              {publishedExternalId && (
                <div className="mt-4 text-sm text-green-700 dark:text-green-300">
                  <a
                    href={`${resolveAdminPostEditBase(publishEnvironment)}${publishedExternalId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:no-underline"
                  >
                    Открыть в админке: {resolveAdminPostEditBase(publishEnvironment)}{publishedExternalId}/edit
                  </a>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Footer with controls pinned at the bottom of the modal */}
        <div className="mt-4 flex-shrink-0">
          {renderControls()}
        </div>
      </div>
    </div>
  );
};

export default NewsWriterModal;