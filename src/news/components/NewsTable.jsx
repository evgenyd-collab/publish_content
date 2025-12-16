import { Fragment, useState, useRef, useEffect } from "react";
import Loader from "../../components/atoms/loader";
import { extractBodyText } from "../utils/extractBodyText";
import { regenerateBodyRaw, fetchInboxRecord } from "../api/newsService";

const formatTimer = (elapsedMs = 0) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const PROGRESS_LIMIT_MS = 5 * 60 * 1000; // 5 минут

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

const getSourceLabel = (news) => {
  if (news?.as_mentioned_source?.title) {
    return news.as_mentioned_source.title;
  }

  try {
    const url = new URL(news.source_url);
    const hostname = url.hostname;
    // Сокращаем championat.com до champ
    if (hostname.includes("championat.com")) {
      return "champ";
    }
    return hostname;
  } catch (error) {
    return news.created_by || "—";
  }
};

const NewsTable = ({
  items,
  isLoading,
  onWrite,
  processingMap = {},
  expandedIds = [],
  onToggleExpand,
  onView,
}) => {
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [cleanedBodyById, setCleanedBodyById] = useState({});
  const [pendingWriteId, setPendingWriteId] = useState(null);
  const [writeCountdown, setWriteCountdown] = useState(0);
  const writeIntervalRef = useRef(null);
  const writeTimeoutRef = useRef(null);

  // Cleanup таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (writeIntervalRef.current) clearInterval(writeIntervalRef.current);
      if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader className="w-12 h-12" />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="text-center text-gray-500 py-16">
        Новостей пока нет
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
              Источник
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Дата
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Прогресс
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Действия
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-[#181d2a]">
          {items.map((news) => {
            const raw = cleanedBodyById[news.id] ?? (news.body_raw || "");
            const needsCleanup = !(news.id in cleanedBodyById) && raw.length > 5000;
            const bodyText = needsCleanup ? "" : extractBodyText(raw);
            const sourceLabel = getSourceLabel(news);
            const isExpanded = expandedIds.includes(news.id);

            const processingInfo = processingMap?.[news.id];
            const elapsedMs = processingInfo?.elapsedMs ?? 0;
            const isProcessing = processingInfo?.status === "running";
            const isErrored = processingInfo?.status === "error";
            const isOverLimit = elapsedMs >= PROGRESS_LIMIT_MS;
            const progressPercent = Math.min((elapsedMs / PROGRESS_LIMIT_MS) * 100, 100);

            return (
              <Fragment key={news.id}>
                <tr
                  className={`border-b transition-colors dark:border-gray-700 cursor-pointer ${
                    isExpanded
                      ? "bg-gray-50 dark:bg-[#202838]"
                      : "hover:bg-gray-50 dark:hover:bg-[#232c3f]"
                  }`}
                  onClick={async () => {
                    if (!onToggleExpand) return;
                    // Если нужен клинап и ещё не запускали — запустим и подморозим разворот
                    if (!expandedIds.includes(news.id) && needsCleanup) {
                      setRegeneratingId(news.id);
                      try {
                        await regenerateBodyRaw({ inboxId: news.id, gptPromptId: 2 });
                        // Подтягиваем актуальный body_raw после регенерации
                        const rec = await fetchInboxRecord({ inboxId: news.id });
                        const updatedBody = rec?.body_raw || "";
                        setCleanedBodyById((prev) => ({ ...prev, [news.id]: updatedBody }));
                      } catch (e) {
                        console.error("Ошибка очистки body_raw", e);
                      } finally {
                        setRegeneratingId(null);
                        onToggleExpand(news.id);
                      }
                    } else {
                      onToggleExpand(news.id);
                    }
                  }}
                >
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {news.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[350px] block">
                      {news.headline_raw}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <a
                      href={news.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 dark:text-teal-300 font-medium hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {sourceLabel}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {formatDateTime(news.scraped_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200">
                      {news.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {processingInfo ? (
                      <div className="space-y-1 min-w-[200px]">
                        {processingInfo.stepLabel ? (
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {processingInfo.stepLabel}
                          </div>
                        ) : null}
                        {isProcessing ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Loader className="w-3 h-3" />
                              <span
                                className={`text-xs font-medium ${
                                  isOverLimit
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {formatTimer(elapsedMs)}
                                {isOverLimit ? " (долго)" : ""}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                              <div
                                className={`h-1 rounded-full transition-all ${
                                  isOverLimit
                                    ? "bg-red-500"
                                    : "bg-teal-500"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        ) : isErrored ? (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            Ошибка: {processingInfo.error || "Неизвестная ошибка"}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex justify-end items-center gap-2 flex-wrap">
                      {news.article_payload ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (onView) {
                              onView(news);
                            }
                          }}
                          className="inline-flex items-center px-3 py-1 rounded border border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition whitespace-nowrap"
                        >
                          Посмотреть
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          
                          // Если уже запущен таймер для этой новости, отменяем
                          if (pendingWriteId === news.id) {
                            if (writeIntervalRef.current) clearInterval(writeIntervalRef.current);
                            if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
                            writeIntervalRef.current = null;
                            writeTimeoutRef.current = null;
                            setPendingWriteId(null);
                            setWriteCountdown(0);
                            return;
                          }

                          // Если уже генерируется, не запускаем
                          if (isProcessing) {
                            return;
                          }

                          // Запускаем 4-секундный таймер с возможностью отмены
                          setPendingWriteId(news.id);
                          setWriteCountdown(4);

                          writeIntervalRef.current = setInterval(() => {
                            setWriteCountdown((prev) => {
                              const next = prev - 1;
                              return next >= 0 ? next : 0;
                            });
                          }, 1000);

                          writeTimeoutRef.current = setTimeout(() => {
                            if (writeIntervalRef.current) clearInterval(writeIntervalRef.current);
                            if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
                            writeIntervalRef.current = null;
                            writeTimeoutRef.current = null;
                            setPendingWriteId(null);
                            setWriteCountdown(0);
                            // По истечении 4 сек запускаем генерацию
                            onWrite(news);
                          }, 4000);
                        }}
                        disabled={isProcessing && pendingWriteId !== news.id}
                        className={`inline-flex items-center px-3 py-1 rounded border border-teal-500 dark:border-teal-400 text-teal-600 dark:text-teal-300 text-sm font-semibold hover:bg-teal-50 dark:hover:bg-teal-500/10 transition whitespace-nowrap ${
                          isProcessing && pendingWriteId !== news.id ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        {isProcessing ? (
                          "Создание..."
                        ) : pendingWriteId === news.id ? (
                          `Отмена ${writeCountdown} >`
                        ) : (
                          "Написать"
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="bg-white dark:bg-[#181d2a] border-b dark:border-gray-700">
                    <td colSpan={7} className="px-4 pb-6 pt-0 text-sm text-gray-800 dark:text-gray-100">
                      {regeneratingId === news.id ? (
                        <div className="border border-amber-200 dark:border-amber-400/60 bg-amber-50 dark:bg-amber-500/15 rounded-lg p-4 text-amber-800 dark:text-amber-200">
                          Очищаем текст новости, секундочку...
                        </div>
                      ) : (
                        <div className="border border-blue-100 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                          {extractBodyText(cleanedBodyById[news.id] ?? news.body_raw)}
                        </div>
                      )}
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

export default NewsTable;

