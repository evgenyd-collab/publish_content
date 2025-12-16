import { useMemo } from "react";
import PropTypes from "prop-types";
import Loader from "../../components/atoms/loader";
import { TRANSLATION_LANGUAGES, getLanguageLabel } from "../constants";
import {
  normalizeLocales,
  sortLocalesByDisplayOrder,
} from "../utils/locales";

const STATUS_CONFIG = {
  new: { label: "Новый", className: "bg-gray-100 text-gray-700" },
  processed: { label: "В работе", className: "bg-amber-100 text-amber-800" },
  ready_to_publish: { label: "Готово", className: "bg-green-100 text-green-700" },
  failed: { label: "Ошибка", className: "bg-red-100 text-red-700" },
  rejected: { label: "Отклонён", className: "bg-red-200 text-red-800" },
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
    console.warn("Не удалось отформатировать дату", value, error);
    return value;
  }
};

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

const formatTimer = (elapsedMs = 0) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const PROGRESS_LIMIT_MS = 4 * 60 * 1000; // 4 минуты

const TranslationsTable = ({
  items,
  isLoading,
  onTranslate,
  onRetranslate,
  onView,
  processingMap,
}) => {
  const hasItems = Array.isArray(items) && items.length > 0;

  const memoizedItems = useMemo(
    () =>
      (items || []).map((item) => ({
        ...item,
        _titleOrSnippet: getTitleOrSnippet(item),
        _locales: sortLocalesByDisplayOrder(
          normalizeLocales(item?.payload_json)
        ),
      })),
    [items]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader className="w-12 h-12" />
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="text-center text-gray-500 py-16">
        Переводов пока нет.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Название / описание
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Языки
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Статус
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Прогресс
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Создана
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Обновлена
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {memoizedItems.map((record, index) => {
            const rowKey =
              record?.id !== undefined && record?.id !== null
                ? `${record.id}-${index}`
                : `row-${index}`;
            const statusConfig = STATUS_CONFIG[record.status] || {
              label: record.status || "—",
              className: "bg-gray-100 text-gray-600",
            };

            const processingInfo = processingMap?.[record.id];
            const elapsedMs = processingInfo?.elapsedMs ?? 0;
            const isRunning = processingInfo?.status === "running";
            const isErrored = processingInfo?.status === "error";
            const isOverLimit = elapsedMs >= PROGRESS_LIMIT_MS;
            const progressPercent = Math.min((elapsedMs / PROGRESS_LIMIT_MS) * 100, 100);
            const activeLanguage = processingInfo?.language;

            const isRetryStatus =
              record.status === "ready_to_publish" || record.status === "failed";
            const shouldDisableAction =
              isRunning || (!isRetryStatus && record.status === "processed");

            return (
              <tr key={rowKey} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.id}</td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-[360px]">
                  <span className="line-clamp-2" title={record._titleOrSnippet}>
                    {record._titleOrSnippet}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {record._locales.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {record._locales.map((locale, index) => {
                        const languageCode = locale?.language || locale?.code || `unknown-${index}`;
                        const isActive = isRunning && activeLanguage === languageCode;
                        return (
                          <span
                            key={`${languageCode}-${index}`}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                              isActive
                                ? "border-teal-500 text-teal-700 bg-teal-50"
                                : "border-gray-200 text-gray-700 bg-gray-100"
                            }`}
                            title={getLanguageLabel(languageCode)}
                          >
                            {languageCode}
                            {isActive ? " ⏳" : ""}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}
                  >
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {processingInfo ? (
                    <div className="space-y-1">
                      {processingInfo.stepLabel ? (
                        <div className="text-xs text-gray-500">{processingInfo.stepLabel}</div>
                      ) : null}
                      <div
                        className={`font-mono text-xs ${
                          isOverLimit ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {formatTimer(elapsedMs)}
                        {isOverLimit ? <span className="ml-1">— долго</span> : null}
                        {activeLanguage ? (
                          <span className="ml-2 text-gray-500">
                            {getLanguageLabel(activeLanguage)}
                          </span>
                        ) : null}
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isOverLimit ? "bg-red-500" : "bg-teal-500"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      {processingInfo.error && isErrored ? (
                        <div className="text-xs text-red-600">{processingInfo.error}</div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {formatDateTime(record.created_at)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {formatDateTime(record.updated_at)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700 whitespace-nowrap">
                  <div className="flex justify-end items-center gap-2">
                    {TRANSLATION_LANGUAGES.map((languageCode) => {
                      const isActiveLanguage =
                        isRunning && activeLanguage === languageCode;
                      const handler = isRetryStatus ? onRetranslate : onTranslate;
                      const handleClick = () => {
                        if (shouldDisableAction || typeof handler !== "function") {
                          return;
                        }
                        handler(record, languageCode);
                      };
                      return (
                        <button
                          key={languageCode}
                          type="button"
                          onClick={handleClick}
                          disabled={shouldDisableAction}
                          className={`inline-flex items-center px-3 py-1 rounded border text-sm font-semibold transition ${
                            shouldDisableAction
                              ? "border-gray-300 text-gray-400 cursor-not-allowed"
                              : "border-teal-500 text-teal-600 hover:bg-teal-50"
                          }`}
                        >
                          {isActiveLanguage ? "В работе..." : `RU>>${languageCode}`}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => onView?.(record)}
                      className="inline-flex items-center px-3 py-1 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm font-semibold transition"
                    >
                      Смотреть
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

TranslationsTable.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  onTranslate: PropTypes.func,
  onRetranslate: PropTypes.func,
  onView: PropTypes.func,
  processingMap: PropTypes.object,
};

export default TranslationsTable;
