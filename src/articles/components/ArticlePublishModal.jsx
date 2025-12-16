import { useState, useEffect } from "react";
import Loader from "../../components/atoms/loader";
import { publishArticle } from "../api/articlesService";

const ArticlePublishModal = ({ isOpen, article, onClose, onSuccess }) => {
  const [environment, setEnvironment] = useState("test");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEnvironment("test");
      setIsPublishing(false);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, article]);

  if (!isOpen || !article) {
    return null;
  }

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    setSuccess(false);

    try {
      await publishArticle({
        articleId: article.id,
        environment,
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1500);
    } catch (err) {
      console.error("Ошибка публикации:", err);
      setError(err?.message || "Не удалось опубликовать статью");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-[#141924] rounded-2xl shadow-xl w-full max-w-2xl p-6 relative">
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={() => {
            if (!isPublishing) {
              onClose?.();
            }
          }}
          aria-label="Закрыть модалку"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Публикация статьи
        </h2>

        {success ? (
          <div className="border border-green-200 dark:border-green-500/60 bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg mb-4">
            Статья успешно опубликована!
          </div>
        ) : null}

        {error ? (
          <div className="border border-red-200 dark:border-red-500/60 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Заголовок статьи
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-[#1d2230] rounded-lg text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600">
              {article.title || article.headline || "Без названия"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Окружение публикации
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              disabled={isPublishing}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 bg-white dark:bg-[#1d2230] text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="test">Test (тестовое окружение)</option>
              <option value="production">Production (продакшн)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Выберите окружение для публикации статьи
            </p>
          </div>

          {article.anons || article.summary ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Анонс
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-[#1d2230] rounded-lg text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 max-h-32 overflow-y-auto">
                {article.anons || article.summary}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (!isPublishing) {
                onClose?.();
              }
            }}
            disabled={isPublishing}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || success}
            className="px-4 py-2 bg-teal-500 dark:bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 dark:hover:bg-teal-500 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <>
                <Loader className="w-4 h-4" />
                <span>Публикация...</span>
              </>
            ) : success ? (
              "Опубликовано"
            ) : (
              "Опубликовать"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticlePublishModal;

