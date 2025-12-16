import { useEffect, useState } from "react";
import PropTypes from "prop-types";

// Конфигурация сайтов (из config_multisite.py)
const SITES_CONFIG = {
  gapola: {
    wp_url: "https://mziorb.ru/",
    username: "mziorb_ru",
    prompt_profile: "default",
    seo_plugin: "rankmath",
    default_category_id: 1,
  },
};

const defaultFormState = {
  topics: "", // Темы статей (каждая с новой строки)
  site_key: "gapola", // Ключ сайта из конфига
  status: "draft", // draft или publish
};

const ArticleCreateModal = ({ isOpen, onClose, onSubmit }) => {
  const [formValues, setFormValues] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Сбрасываем форму только если модальное окно открывается и не идет процесс генерации
    if (isOpen && !isSubmitting) {
      setFormValues(defaultFormState);
      setError(null);
      // Не сбрасываем логи сразу - они могут быть полезны для отладки
      // setLogs([]);
    }
  }, [isOpen]);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString("ru-RU", { 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
    setLogs((prev) => {
      const newLogs = [...prev, { timestamp, message, type }];
      // Автоскролл к последнему логу
      setTimeout(() => {
        const container = document.getElementById("logs-container");
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 10);
      return newLogs;
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target || {};
    if (!name) return;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!formValues.topics || !formValues.topics.trim()) {
        setError("Введите темы статей (каждая с новой строки)");
        return;
      }

      // Парсим темы из текстового поля (каждая строка = одна тема)
      const topics = formValues.topics
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#")); // Игнорируем пустые строки и комментарии

      if (topics.length === 0) {
        setError("Введите хотя бы одну тему");
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setLogs([]);
      
      const siteKey = formValues.site_key || "gapola";
      const status = formValues.status || "draft";
      
      addLog(`🚀 Начало генерации статей`, "info");
      addLog(`📋 Найдено тем: ${topics.length}`, "info");
      addLog(`🌐 Сайт: ${siteKey}`, "info");
      addLog(`📝 Статус: ${status}`, "info");
      addLog("─".repeat(50), "info");

      if (onSubmit) {
        try {
          const results = [];
          
          const apiBase = import.meta.env?.VITE_ARTICLES_API_BASE || import.meta.env?.VITE_ENDPOINT || "http://localhost:5000";
      addLog(`📡 Подключение к API: ${apiBase}`, "info");
          
          // Обрабатываем каждую тему отдельно для детального логирования
          for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            addLog(`\n[${i + 1}/${topics.length}] Обработка темы: "${topic}"`, "info");
            addLog(`  → Подготовка данных для отправки...`, "info");
            
            try {
              const articleData = {
                topics: [topic], // Отправляем одну тему за раз
                site_key: siteKey,
                status: status,
              };
              
              addLog(`  → Данные: ${JSON.stringify(articleData, null, 2)}`, "info");
              addLog(`  → Отправка POST запроса на сервер...`, "info");
              
              const startTime = Date.now();
              let result;
              try {
                result = await onSubmit(articleData);
                const duration = Date.now() - startTime;
                addLog(`  → Ответ получен за ${duration}ms`, "info");
                addLog(`  → Ответ сервера: ${JSON.stringify(result, null, 2).substring(0, 500)}`, "info");
              } catch (submitErr) {
                addLog(`  ❌ Ошибка при вызове onSubmit:`, "error");
                addLog(`     ${submitErr?.message || "Неизвестная ошибка"}`, "error");
                throw submitErr; // Пробрасываем дальше
              }
              
              // Обрабатываем разные форматы ответа
              // API может вернуть массив статей или объект с полем articles
              let article = null;
              
              if (Array.isArray(result) && result.length > 0) {
                article = result[0];
              } else if (result && Array.isArray(result.articles) && result.articles.length > 0) {
                // API вернул объект с полем articles
                article = result.articles[0];
              } else if (result && (result.id || result.title)) {
                // API вернул объект статьи напрямую
                article = result;
              }
              
              if (article) {
                addLog(`  ✅ Статья создана успешно`, "success");
                addLog(`     ID: ${article.id || 'N/A'}`, "success");
                addLog(`     Заголовок: ${article.title || article.topic || 'без названия'}`, "success");
                if (article.slug) addLog(`     Slug: ${article.slug}`, "success");
                results.push(article);
              } else if (result) {
                addLog(`  ⚠️ Статья создана, но данные неполные`, "warning");
                addLog(`     Ответ: ${JSON.stringify(result).substring(0, 200)}`, "warning");
                results.push({ topic, id: Date.now() + i, ...result });
              } else {
                addLog(`  ⚠️ Получен пустой ответ от сервера`, "warning");
                results.push({ topic, id: Date.now() + i });
              }
            } catch (topicError) {
              addLog(`  ❌ Ошибка при обработке темы:`, "error");
              addLog(`     Сообщение: ${topicError?.message || "Неизвестная ошибка"}`, "error");
              addLog(`     Тип: ${topicError?.name || "Error"}`, "error");
              if (topicError?.stack) {
                addLog(`     Stack: ${topicError.stack}`, "error");
              }
              if (topicError?.response) {
                addLog(`     HTTP статус: ${topicError.response.status}`, "error");
                addLog(`     HTTP ответ: ${JSON.stringify(topicError.response.data || topicError.response)}`, "error");
              }
              // Продолжаем обработку остальных тем
            }
            
            // Небольшая задержка между запросами для читаемости логов
            if (i < topics.length - 1) {
              addLog(`  ⏳ Пауза 500ms перед следующей темой...`, "info");
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          addLog("\n" + "─".repeat(50), "info");
          
          const successCount = results.filter(r => r && !r.error && (r.id || r.title)).length;
          addLog(`✅ Процесс завершён. Создано статей: ${successCount} из ${topics.length}`, successCount === topics.length ? "success" : "warning");
          
          if (results.length < topics.length || successCount < topics.length) {
            addLog(`⚠️ Внимание: не все статьи были созданы успешно`, "warning");
            const failedTopics = results.filter(r => r && r.error).map(r => r.topic);
            if (failedTopics.length > 0) {
              addLog(`   Неудачные темы: ${failedTopics.join(", ")}`, "warning");
            }
          }
          
          addLog("🔄 Обновление списка статей...", "info");
          
          // Важно: не сбрасываем isSubmitting сразу, чтобы форма не сбросилась
          // Только если хотя бы одна статья создана успешно
          if (successCount > 0) {
            addLog(`✅ Успешно создано ${successCount} из ${topics.length} статей`, "success");
            addLog("⏳ Модальное окно закроется через 5 секунд...", "info");
            
            // Даём время увидеть результаты перед закрытием
            setTimeout(() => {
              setIsSubmitting(false);
              // Не вызываем onClose сразу - даём пользователю время увидеть результаты
              setTimeout(() => {
                addLog("🔒 Закрытие модального окна...", "info");
                onClose?.();
              }, 5000);
            }, 1000);
          } else {
            // Если все статьи не удались, не закрываем окно автоматически
            addLog("⚠️ Модальное окно останется открытым для просмотра ошибок", "warning");
            addLog("   Вы можете закрыть его вручную", "info");
            setIsSubmitting(false);
          }
        } catch (submitError) {
          addLog(`\n❌ Критическая ошибка:`, "error");
          addLog(`   Сообщение: ${submitError?.message || "Неизвестная ошибка"}`, "error");
          addLog(`   Тип: ${submitError?.name || "Error"}`, "error");
          if (submitError?.stack) {
            addLog(`   Stack: ${submitError.stack}`, "error");
          }
          if (submitError?.response) {
            addLog(`   HTTP статус: ${submitError.response.status}`, "error");
            addLog(`   HTTP ответ: ${JSON.stringify(submitError.response.data || submitError.response)}`, "error");
          }
          setError(submitError?.message || "Не удалось создать статьи");
          setIsSubmitting(false);
        }
      } else {
        addLog("⚠️ Функция onSubmit не предоставлена", "warning");
        addLog("   Модальное окно останется открытым", "info");
        // Не сбрасываем isSubmitting, чтобы форма не закрылась
        // setIsSubmitting(false);
      }
    } catch (submitError) {
      console.error("Не удалось создать статьи", submitError);
      addLog(`❌ Критическая ошибка: ${submitError?.message || "Неизвестная ошибка"}`, "error");
      setError(submitError?.message || "Не удалось создать статьи");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-[#141924] rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={() => {
            if (!isSubmitting) {
              onClose?.();
            }
          }}
          aria-label="Закрыть модалку"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Генерация статей
        </h2>

        <div className="space-y-4">
          <label className="block text-sm text-gray-700 dark:text-gray-200">
            <span className="font-medium">Темы статей *</span>
            <textarea
              name="topics"
              value={formValues.topics}
              onChange={handleChange}
              className="mt-1 w-full min-h-[200px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 resize-y bg-white dark:bg-[#1d2230] text-gray-900 dark:text-gray-100 font-mono"
              placeholder="Введите темы статей, каждая с новой строки:&#10;Лучшие стратегии ставок на футбол&#10;Как выбрать букмекерскую контору&#10;Анализ коэффициентов в ставках"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Каждая строка = одна тема статьи. H1, Title, Description, Slug, контент и изображение будут сгенерированы автоматически по промпту из <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">prompt_template.txt</code> с использованием модели <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">gpt-5.2</code>
            </p>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-gray-700 dark:text-gray-200">
              <span className="font-medium">Сайт</span>
              <select
                name="site_key"
                value={formValues.site_key}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 bg-white dark:bg-[#1d2230] text-gray-900 dark:text-gray-100"
                disabled={isSubmitting}
              >
                {Object.keys(SITES_CONFIG).map((key) => (
                  <option key={key} value={key}>
                    {key} ({SITES_CONFIG[key].wp_url})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-gray-700 dark:text-gray-200">
              <span className="font-medium">Статус публикации</span>
              <select
                name="status"
                value={formValues.status}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 bg-white dark:bg-[#1d2230] text-gray-900 dark:text-gray-100"
                disabled={isSubmitting}
              >
                <option value="draft">Черновик (draft)</option>
                <option value="publish">Опубликовать сразу (publish)</option>
              </select>
            </label>
          </div>

          {error ? (
            <div className="border border-red-200 dark:border-red-500/60 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-200 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          ) : null}

          {/* Логи процесса генерации */}
          {logs.length > 0 && (
            <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  📊 Логи процесса генерации:
                </span>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Очистить
                </button>
              </div>
              <div 
                id="logs-container"
                className="max-h-[250px] overflow-y-auto space-y-1 font-mono text-xs bg-gray-900 dark:bg-gray-950 p-3 rounded border border-gray-300 dark:border-gray-600"
              >
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 ${
                      log.type === "error"
                        ? "text-red-400"
                        : log.type === "success"
                        ? "text-green-400"
                        : log.type === "warning"
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    <span className="text-gray-500 shrink-0 min-w-[70px]">
                      {log.timestamp}
                    </span>
                    <span className="break-words flex-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) {
                onClose?.();
              }
            }}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-teal-500 dark:bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 dark:hover:bg-teal-500 transition disabled:opacity-60"
          >
            {isSubmitting 
              ? "Генерация статей..." 
              : (() => {
                  const topicsCount = formValues.topics
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line && !line.startsWith("#")).length;
                  return topicsCount > 0 
                    ? `Создать статьи (${topicsCount} ${topicsCount === 1 ? "тема" : topicsCount < 5 ? "темы" : "тем"})`
                    : "Создать статьи";
                })()}
          </button>
        </div>
      </div>
    </div>
  );
};

ArticleCreateModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default ArticleCreateModal;

