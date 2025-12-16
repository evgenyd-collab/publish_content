const envBase = import.meta.env?.VITE_NEWS_API_BASE?.trim();
const runtimeBase =
  envBase && envBase.length
    ? envBase
    : typeof window !== "undefined"
    ? window.location.origin
    : "";
const NORMALIZED_BASE = runtimeBase ? runtimeBase.replace(/\/$/, "") : "";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

const withBase = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!NORMALIZED_BASE) {
    return normalizedPath;
  }
  return `${NORMALIZED_BASE}${normalizedPath}`;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    error.status = response.status;
    throw error;
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

export const fetchTranslationsInbox = async ({
  page = 1,
  pageSize = 20,
  sortBy = "id",
  sortOrder = "desc",
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const response = await fetch(
    withBase(`/autonews_api/v1/translations/inbox?${params.toString()}`),
    {
      method: "GET",
      headers: JSON_HEADERS,
    }
  );

  return handleResponse(response);
};

export const fetchTranslationRecord = async ({ inboxId }) => {
  if (!inboxId && inboxId !== 0) {
    throw new Error("inboxId обязателен для fetchTranslationRecord");
  }

  const response = await fetch(
    withBase(`/autonews_api/v1/translations/inbox/${inboxId}`),
    {
      method: "GET",
      headers: JSON_HEADERS,
    }
  );

  return handleResponse(response);
};

export const createTranslationRecord = async (payload) => {
  const response = await fetch(
    withBase(`/autonews_api/v1/translations/inbox`),
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    }
  );

  return handleResponse(response);
};

export const updateTranslationStatus = async ({ inboxId, status }) => {
  if (!inboxId && inboxId !== 0) {
    throw new Error("inboxId обязателен для updateTranslationStatus");
  }
  const response = await fetch(
    withBase(`/autonews_api/v1/translations/inbox/${inboxId}/status`),
    {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ status }),
    }
  );

  return handleResponse(response);
};

export const prepareTranslation = async ({ inboxId, gptPromptId = 1, reasoning_effort }) => {
  const response = await fetch(
    withBase(`/autonews_api/v1/translations/prepare`),
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ inbox_id: inboxId, gpt_prompt_id: gptPromptId, reasoning_effort }),
    }
  );

  return handleResponse(response);
};

export const generatePrimaryTranslation = async ({
  inboxId,
  gptPromptId = 2,
  reasoning_effort,
}) => {
  const response = await fetch(
    withBase(`/autonews_api/v1/translations/primary`),
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ inbox_id: inboxId, gpt_prompt_id: gptPromptId, reasoning_effort }),
    }
  );

  return handleResponse(response);
};

export const reviseTranslation = async ({ inboxId, gptPromptId, reasoning_effort }) => {
  const response = await fetch(
    withBase(`/autonews_api/v1/translations/revision`),
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ inbox_id: inboxId, gpt_prompt_id: gptPromptId, reasoning_effort }),
    }
  );

  return handleResponse(response);
};

export const sendSlackReport = async ({ channelId, text }) => {
  const response = await fetch(
    withBase(`/autonews_api/v1/slack_reports`),
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ channel_id: channelId, text }),
    }
  );

  return handleResponse(response);
};

const ensureArray = (value) => (Array.isArray(value) ? [...value] : []);

/**
 * Возвращает новый массив локалей, в котором локаль с language совпадающим с localePayload
 * будет обновлена, либо добавлена, если отсутствует.
 */
export const upsertLocaleIntoPayload = (locales, localePayload) => {
  if (!localePayload?.language) {
    return ensureArray(locales);
  }

  const normalized = ensureArray(locales);
  const index = normalized.findIndex(
    (item) => (item?.language || item?.code) === localePayload.language
  );

  if (index >= 0) {
    normalized[index] = {
      ...normalized[index],
      ...localePayload,
    };
  } else {
    normalized.push(localePayload);
  }

  return normalized;
};

/**
 * Возвращает новую запись перевода с обновлённым массивом локалей.
 */
export const mergeLocaleIntoRecord = (record, localePayload) => {
  if (!record) {
    return record;
  }

  const payloadLocales = upsertLocaleIntoPayload(record.payload_json, localePayload);

  return {
    ...record,
    payload_json: payloadLocales,
    // Для совместимости: некоторые страницы могут работать с полем payload
    payload: Array.isArray(record.payload) ? payloadLocales : record.payload,
  };
};

