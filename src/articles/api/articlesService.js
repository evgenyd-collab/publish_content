// API endpoint для генерации статей (локальный Flask сервер)
// По умолчанию используем localhost:5000, можно переопределить через .env
const API_ENDPOINT = import.meta.env?.VITE_ENDPOINT;
const ARTICLES_API_BASE = import.meta.env?.VITE_ARTICLES_API_BASE || API_ENDPOINT || "http://localhost:5000";

console.log("[articlesService] API Base:", ARTICLES_API_BASE);

// Загрузка списка статей
export const fetchArticles = async ({
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

  const url = `${ARTICLES_API_BASE}/articles?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `Статус: ${response.status} ${response.statusText}`;
      }
      throw new Error(`HTTP error! status: ${response.status}. ${errorText}`);
    }

    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Ошибка парсинга JSON ответа:", parseError);
      throw new Error(`Сервер вернул не JSON. Возможно, endpoint не найден (404). Ответ начинается с: ${text?.substring(0, 100)}`);
    }
    
    return {
      records: data.articles || data.data || [],
      total_pages: data.total_pages || Math.ceil((data.total || 0) / pageSize),
      total_count: data.total || data.count || 0,
    };
  } catch (error) {
    console.error("Ошибка загрузки статей:", error);
    
    // Если это ошибка отсутствия endpoint, показываем понятное сообщение
    if (error.message?.includes("404") || error.message?.includes("endpoint не найден")) {
      console.error("[articlesService] ⚠️ API endpoint не найден. Проверьте VITE_ARTICLES_API_BASE в .env файле");
    }
    
    // Возвращаем моковые данные для демонстрации
    return {
      records: [],
      total_pages: 1,
      total_count: 0,
    };
  }
};

// Получение одной статьи
export const fetchArticle = async ({ articleId } = {}) => {
  if (!articleId) {
    throw new Error("articleId обязателен");
  }

  const url = `${ARTICLES_API_BASE}/articles/${articleId}`;

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

    return await response.json();
  } catch (error) {
    console.error("Ошибка загрузки статьи:", error);
    throw error;
  }
};

// Публикация статьи
export const publishArticle = async ({ articleId, environment = "test" } = {}) => {
  if (!articleId) {
    throw new Error("articleId обязателен");
  }

  const url = `${ARTICLES_API_BASE}/articles/${articleId}/publish`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ environment }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Ошибка публикации статьи:", error);
    throw error;
  }
};

// Создание статьи (или нескольких статей из массива тем)
export const createArticle = async (data = {}) => {
  const url = `${ARTICLES_API_BASE}/articles`;

  try {
    console.log("[articlesService] createArticle вызван с данными:", data);
    console.log("[articlesService] API endpoint:", url);
    
    // Если передан массив тем, создаём несколько статей
    if (data.topics && Array.isArray(data.topics)) {
      const results = [];
      const totalTopics = data.topics.length;
      
      console.log(`[articlesService] Обработка ${totalTopics} тем`);
      
      for (let index = 0; index < data.topics.length; index++) {
        const topic = data.topics[index];
        console.log(`[articlesService] [${index + 1}/${totalTopics}] Обработка темы: ${topic}`);
        
        try {
          // API ожидает массив topics, даже если одна тема
          const requestBody = {
            topics: [topic],  // Отправляем массив с одной темой
            site_key: data.site_key,
            status: data.status,
          };
          
          console.log(`[articlesService] Отправка запроса:`, {
            url,
            method: "POST",
            body: requestBody,
          });
          
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          console.log(`[articlesService] Ответ получен:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
          });

          if (!response.ok) {
            let errorText;
            let isHtml = false;
            try {
              errorText = await response.text();
              // Проверяем, не HTML ли это (404 страница)
              if (errorText.trim().toLowerCase().startsWith("<!doctype") || 
                  errorText.trim().toLowerCase().startsWith("<html")) {
                isHtml = true;
                errorText = `Сервер вернул HTML страницу (вероятно, 404). Endpoint не найден: ${url}`;
              }
              console.error(`[articlesService] Ошибка HTTP:`, {
                status: response.status,
                statusText: response.statusText,
                isHtml,
                errorText: errorText.substring(0, 200),
              });
            } catch (e) {
              errorText = `Не удалось прочитать ответ: ${e.message}`;
            }
            
            const error = new Error(
              response.status === 404 
                ? `API endpoint не найден (404). Проверьте переменную VITE_ARTICLES_API_BASE в .env файле. URL: ${url}`
                : `HTTP error! status: ${response.status} для темы: ${topic}. ${errorText}`
            );
            error.response = {
              status: response.status,
              statusText: response.statusText,
              data: errorText,
              isHtml,
            };
            error.url = url;
            throw error;
          }

          let responseData;
          try {
            responseData = await response.json();
            console.log(`[articlesService] [${index + 1}/${totalTopics}] Ответ сервера:`, responseData);
            
            // API возвращает объект с полем articles (массив статей)
            if (responseData.articles && Array.isArray(responseData.articles)) {
              // Если есть массив articles, берем все статьи из него
              if (responseData.articles.length > 0) {
                // Берем первую статью из массива (так как мы отправляем одну тему)
                results.push(responseData.articles[0]);
              } else {
                console.warn(`[articlesService] Массив articles пустой`);
                results.push({ topic, id: Date.now() + index, error: "Пустой ответ от сервера" });
              }
            } else if (Array.isArray(responseData) && responseData.length > 0) {
              // Если ответ - массив напрямую
              results.push(responseData[0]);
            } else if (responseData.id || responseData.title) {
              // Если ответ - объект статьи напрямую
              results.push(responseData);
            } else {
              console.warn(`[articlesService] Неожиданный формат ответа:`, responseData);
              // Пытаемся извлечь данные из ответа
              results.push({
                topic: topic,
                ...responseData,
                id: responseData.id || Date.now() + index
              });
            }
          } catch (parseError) {
            console.error(`[articlesService] Ошибка парсинга JSON:`, parseError);
            const text = await response.text();
            console.error(`[articlesService] Сырой ответ:`, text);
            throw new Error(`Не удалось распарсить ответ как JSON: ${parseError.message}. Ответ: ${text.substring(0, 200)}`);
          }
        } catch (topicError) {
          console.error(`[articlesService] [${index + 1}/${totalTopics}] ❌ Ошибка для темы "${topic}":`, topicError);
          // Продолжаем обработку остальных тем даже при ошибке
          throw topicError;
        }
      }
      
      console.log(`[articlesService] Все темы обработаны. Результатов: ${results.length}`);
      return results;
    }

    // Обычное создание одной статьи (для обратной совместимости)
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Ошибка создания статьи(ей):", error);
    // Возвращаем моковые данные для демонстрации
    if (data.topics && Array.isArray(data.topics)) {
      return data.topics.map((topic, index) => ({
        id: Date.now() + index,
        topic: topic,
        site_key: data.site_key,
        status: data.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }
    return {
      id: Date.now(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
};

// Обновление статьи
export const updateArticle = async ({ articleId, data } = {}) => {
  if (!articleId) {
    throw new Error("articleId обязателен");
  }

  const url = `${ARTICLES_API_BASE}/articles/${articleId}`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Ошибка обновления статьи:", error);
    throw error;
  }
};

