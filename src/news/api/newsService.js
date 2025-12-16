import { dataFetch } from "../../helpers/data-fetch";

const API_ENDPOINT = import.meta.env?.VITE_ENDPOINT;
const NEWS_API_BASE = import.meta.env?.VITE_NEWS_API_BASE;

if (!NEWS_API_BASE) {
  console.warn(
    "VITE_NEWS_API_BASE не задан. Некоторые запросы новостей могут не работать."
  );
}

export const fetchNewsInbox = async ({
  page = 1,
  pageSize = 20,
  sortBy = "id",
  sortOrder = "desc",
} = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const url = `${NEWS_API_BASE}/autonews_api/v1/inbox?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Ошибка загрузки inbox:", error);
    throw error;
  }
};

export const fetchNewsFromSource = async ({ sourceId = 1, limit = 10 } = {}) => {
  const url = `${NEWS_API_BASE}/autonews_api/v1/fetch`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_id: sourceId,
        limit: limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Ошибка сбора новостей:", error);
    throw error;
  }
};

export const createNewsTask = async (newsId) => {
  if (!API_ENDPOINT) {
    console.warn("VITE_ENDPOINT не задан. create_task вызов пропущен.");
    return null;
  }

  const payload = {
    profile_id: 200,
    news_id: newsId,
  };

  return dataFetch(payload, "POST", `${API_ENDPOINT}/create_task`);
};

// Генерация бэкграунда для записи inbox
export const generateBackground = async ({ inboxId, gptPromptId = 1, signal } = {}) => {
  if (!inboxId) {
    throw new Error("inboxId обязателен для generateBackground");
  }

  const url = `${NEWS_API_BASE}/autonews_api/v1/background`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ inbox_id: inboxId, gpt_prompt_id: gptPromptId }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось сгенерировать бэкграунд: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data; // ожидаем { success: true, background: string }
};

// Обновление бэкграунда вручную отредактированным текстом
export const updateInboxBackground = async ({ inboxId, background, signal } = {}) => {
  if (!inboxId) {
    throw new Error("inboxId обязателен для updateInboxBackground");
  }
  const url = `${NEWS_API_BASE}/autonews_api/v1/inbox/${inboxId}/background`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ background }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось сохранить бэкграунд: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data; // ожидаем { success: true, message: string }
};

// Генерация article_payload (структурированный JSON) для записи inbox
export const generateArticlePayload = async ({ inboxId, gptPromptId = 3, signal } = {}) => {
  if (!inboxId) {
    throw new Error("inboxId обязателен для generateArticlePayload");
  }
  const url = `${NEWS_API_BASE}/autonews_api/v1/article-payload`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ inbox_id: inboxId, gpt_prompt_id: gptPromptId }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось сгенерировать article_payload: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data; // ожидаем { success: true, article_payload: string }
};

export const generateArticleHeaders = async ({ inboxId, gptPromptId = 4, signal } = {}) => {
  if (!inboxId) {
    throw new Error("inboxId обязателен для generateArticleHeaders");
  }

  const url = `${NEWS_API_BASE}/autonews_api/v1/generate_headlines`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ inbox_id: inboxId, gpt_prompt_id: gptPromptId }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось сгенерировать варианты заголовков: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data; // ожидаем объект с полями header_2, header_3, header_4
};

// Обновление article_payload вручную отредактированным JSON
export const updateInboxArticlePayload = async ({ inboxId, articlePayload, signal } = {}) => {
  if (!inboxId) {
    throw new Error("inboxId обязателен для updateInboxArticlePayload");
  }
  const url = `${NEWS_API_BASE}/autonews_api/v1/inbox/${inboxId}/article_payload`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ article_payload: articlePayload }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось сохранить article_payload: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data; // ожидаем { success: true, message: string, article_payload: string }
};

// Получение одной записи inbox по ID
export const fetchInboxRecord = async ({ inboxId, signal } = {}) => {
  if (!inboxId) {
    throw new Error("inboxId обязателен для fetchInboxRecord");
  }
  const url = `${NEWS_API_BASE}/autonews_api/v1/inbox/${inboxId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось получить inbox запись: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data;
};

// Публикация статей. По умолчанию публикуем по inbox_id текущей записи
export const publishArticles = async ({ inboxIds, limit, timeout, retryFailed, specificIds, createdAfter, createdBefore, production = false, signal } = {}) => {
  const url = `${NEWS_API_BASE}/autonews_api/v1/publish`;

  const payload = {};
  if (Array.isArray(inboxIds) && inboxIds.length) payload.inbox_ids = inboxIds;
  if (Array.isArray(specificIds)) payload.specific_ids = specificIds; // можно пустой массив
  if (typeof limit === "number") payload.limit = limit;
  if (typeof timeout === "number") payload.timeout = timeout;
  payload.retry_failed = !!retryFailed;
  payload.production = !!production;
  if (createdAfter) payload.created_after = createdAfter;
  if (createdBefore) payload.created_before = createdBefore;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось опубликовать статьи: ${response.status} ${text}`);
  }

  return response.json();
};

// Получить публикации по inbox_id
export const fetchPublicationsByInboxId = async ({ inboxId, page = 1, pageSize = 1, sortBy = "id", sortOrder = "desc", signal } = {}) => {
  const params = new URLSearchParams({
    inbox_id: String(inboxId),
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  const url = `${NEWS_API_BASE}/autonews_api/v1/publications?${params.toString()}`;
  const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" }, signal });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось получить публикации: ${response.status} ${text}`);
  }
  return response.json();
};

// Очистка (регенерация) body_raw для записи inbox
export const regenerateBodyRaw = async ({ inboxId, gptPromptId = 2, signal } = {}) => {
  if (!inboxId) {
    throw new Error("inboxId обязателен для regenerateBodyRaw");
  }
  const url = `${NEWS_API_BASE}/autonews_api/v1/body`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inbox_id: inboxId, gpt_prompt_id: gptPromptId }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось регенерировать body_raw: ${response.status} ${text}`);
  }

  return response.json(); // { success, body_raw }
};

// Отправка рапорта в Slack
export const sendSlackReport = async ({ channelId, text } = {}) => {
  if (!channelId || !text) {
    throw new Error("channelId и text обязательны для sendSlackReport");
  }

  const url = `${NEWS_API_BASE}/autonews_api/v1/slack_reports`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ channel_id: channelId, text }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Не удалось отправить рапорт в Slack: ${response.status} ${text}`);
  }

  return response.json();
};

