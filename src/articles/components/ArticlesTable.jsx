import { Fragment } from "react";
import Loader from "../../components/atoms/loader";

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  try {
    const date = new Date(value);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}.${month} ${hours}:${minutes}`;
  } catch (error) {
    console.warn("Ошибка форматирования даты", value, error);
    return value;
  }
};

const STATUS_CONFIG = {
  draft: { label: "Черновик", className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  ready: { label: "Готово", className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  published: { label: "Опубликовано", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  archived: { label: "Архив", className: "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400" },
};

const ArticlesTable = ({
  items,
  isLoading,
  onPublish,
  onView,
  onEdit,
  expandedIds = [],
  onToggleExpand,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader className="w-12 h-12" />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-16">
        Статей пока нет
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm dark:bg-[#1b1f2a]">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-[#23293c]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Заголовок
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Автор
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Статус
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Создана
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Обновлена
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#181d2a]">
          {items.map((article) => {
            const isExpanded = expandedIds.includes(article.id);
            const statusConfig = STATUS_CONFIG[article.status] || {
              label: article.status || "—",
              className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
            };

            return (
              <Fragment key={article.id}>
                <tr
                  className={`border-b transition-colors dark:border-gray-700 cursor-pointer ${
                    isExpanded
                      ? "bg-gray-50 dark:bg-[#202838]"
                      : "hover:bg-gray-50 dark:hover:bg-[#232c3f]"
                  }`}
                  onClick={() => {
                    if (onToggleExpand) {
                      onToggleExpand(article.id);
                    }
                  }}
                >
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {article.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[350px] block">
                      {article.title || article.headline || "Без названия"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {article.author || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}
                    >
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDateTime(article.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDateTime(article.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex justify-end items-center gap-2 flex-wrap">
                      {onView && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onView(article);
                          }}
                          className="inline-flex items-center px-3 py-1 rounded border border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition whitespace-nowrap"
                        >
                          Посмотреть
                        </button>
                      )}
                      {onEdit && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(article);
                          }}
                          className="inline-flex items-center px-3 py-1 rounded border border-gray-500 dark:border-gray-400 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-500/10 transition whitespace-nowrap"
                        >
                          Редактировать
                        </button>
                      )}
                      {onPublish && article.status !== "published" && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onPublish(article);
                          }}
                          className="inline-flex items-center px-3 py-1 rounded border border-teal-500 dark:border-teal-400 text-teal-600 dark:text-teal-300 text-sm font-semibold hover:bg-teal-50 dark:hover:bg-teal-500/10 transition whitespace-nowrap"
                        >
                          Опубликовать
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="bg-white dark:bg-[#181d2a] border-b dark:border-gray-700">
                    <td colSpan={7} className="px-4 pb-6 pt-0 text-sm text-gray-800 dark:text-gray-100">
                      <div className="border border-blue-100 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                        <div className="mb-2">
                          <strong className="text-gray-700 dark:text-gray-300">Анонс:</strong>
                          <p className="mt-1 text-gray-600 dark:text-gray-400">
                            {article.anons || article.summary || "—"}
                          </p>
                        </div>
                        {article.content && (
                          <div className="mt-4">
                            <strong className="text-gray-700 dark:text-gray-300">Содержание:</strong>
                            <p className="mt-1 text-gray-600 dark:text-gray-400 line-clamp-3">
                              {article.content}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ArticlesTable;

