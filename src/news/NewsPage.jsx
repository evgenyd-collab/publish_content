import { useCallback, useEffect, useMemo, useState } from "react";
import Loader from "../components/atoms/loader";
import Pagination from "../components/molecules/pagination";
import NewsTable from "./components/NewsTable";
import NewsSportsFilter from "./components/NewsSportsFilter";
import NewsWriterModal from "./components/NewsWriterModal";
import { fetchNewsInbox, fetchNewsFromSource } from "./api/newsService";
import { extractSportFromUrl } from "./utils/extractSportFromUrl";
import { capitalize } from "./utils/capitalize";
import useAuthStore from "../store/auth-store";
import { NewsProvider, useNews } from "./context/NewsContext";

const DARK_MODE_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const resolvePreferredTheme = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = window.localStorage.getItem("theme");
  if (stored === "dark") {
    return true;
  }
  if (stored === "light") {
    return false;
  }

  return window.matchMedia?.(DARK_MODE_MEDIA_QUERY)?.matches ?? false;
};

const applyThemeClasses = (isDark) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) {
    return;
  }

  if (isDark) {
    body.classList.add("dark-theme");
    root.classList.add("dark");
  } else {
    body.classList.remove("dark-theme");
    root.classList.remove("dark");
  }
};

const syncRootWithBodyTheme = () => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) {
    return;
  }

  const shouldBeDark = body.classList.contains("dark-theme");
  root.classList.toggle("dark", shouldBeDark);
};

const NewsPageContent = () => {
  const isLogged = useAuthStore((state) => state.isLogged);
  const { runNewsPipeline, processingMap } = useNews();
  const [newsItems, setNewsItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [collectInProgress, setCollectInProgress] = useState(false);
  const [sportsOptions, setSportsOptions] = useState([
    { value: "all", label: "All" },
  ]);
  const [selectedSport, setSelectedSport] = useState("all");
  const [expandedNewsIds, setExpandedNewsIds] = useState([]);
  const [writerModalOpen, setWriterModalOpen] = useState(false);
  const [writerNews, setWriterNews] = useState(null);

  // Пагинация
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncTheme = () => {
      applyThemeClasses(resolvePreferredTheme());
    };

    syncTheme();
    syncRootWithBodyTheme();

    const observer = new MutationObserver(() => {
      syncRootWithBodyTheme();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const media = window.matchMedia?.(DARK_MODE_MEDIA_QUERY) || null;
    const handleMediaChange = (event) => {
      const stored = window.localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") {
        return;
      }
      applyThemeClasses(event.matches);
    };

    if (media) {
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", handleMediaChange);
      } else if (typeof media.addListener === "function") {
        media.addListener(handleMediaChange);
      }
    }

    const handleStorage = (event) => {
      if (event.key === "theme") {
        syncTheme();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (media) {
        if (typeof media.removeEventListener === "function") {
          media.removeEventListener("change", handleMediaChange);
        } else if (typeof media.removeListener === "function") {
          media.removeListener(handleMediaChange);
        }
      }
      window.removeEventListener("storage", handleStorage);
      observer.disconnect();
    };
  }, []);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      const response = await fetchNewsInbox({
        page,
        pageSize: pageSize === "all" ? 100 : pageSize,
        sortBy: "id",
        sortOrder: "desc",
      });

      const prepared = response.records.map((item) => ({
        ...item,
        sport_key: extractSportFromUrl(item.source_url),
      }));
      setNewsItems(prepared);
      setTotalPages(response.total_pages || 1);
      setTotalCount(response.total_count || 0);
    } catch (error) {
      console.error("Не удалось загрузить новости", error);
      setLoadingError(error?.message || "Ошибка загрузки новостей");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadNews();

    // Слушаем событие завершения пайплайна для обновления списка
    const handlePipelineCompleted = () => {
      loadNews();
    };

    window.addEventListener("news-pipeline-completed", handlePipelineCompleted);

    return () => {
      window.removeEventListener("news-pipeline-completed", handlePipelineCompleted);
    };
  }, [loadNews]);

  useEffect(() => {
    const uniqueSports = Array.from(
      new Set(newsItems.map((item) => item.sport_key).filter(Boolean))
    );

    const formatted = uniqueSports.map((sport) => ({
      value: sport,
      label: capitalize(sport),
    }));

    const options = [{ value: "all", label: "All" }, ...formatted];
    setSportsOptions(options);

    if (selectedSport !== "all" && !uniqueSports.includes(selectedSport)) {
      setSelectedSport("all");
    }
  }, [newsItems, selectedSport]);

  const handleWrite = useCallback(
    (news) => {
      if (!news?.id) {
        return;
      }

      // Проверяем, не запущена ли уже генерация для этой новости
      const processingInfo = processingMap[news.id];
      if (processingInfo?.status === "running") {
        return; // Уже генерируется
      }

      // Запускаем автоматическую генерацию
      runNewsPipeline(news);
    },
    [runNewsPipeline, processingMap]
  );

  const handleCollectNews = useCallback(async (limit = 10) => {
    setCollectInProgress(true);
    try {
      const result = await fetchNewsFromSource({ sourceId: 2, limit });

      if (result?.success) {
        // Перезагрузить данные автоматически
        setPage(1);
        // Загружаем данные после небольшой задержки, чтобы дать серверу время обработать
        setTimeout(() => {
          loadNews();
        }, 1000);
      } else {
        alert("Не удалось собрать новости. Попробуйте позже.");
      }
    } catch (error) {
      console.error("Ошибка при сборе новостей:", error);
      alert(`Ошибка: ${error.message || "Не удалось собрать новости"}`);
    } finally {
      setCollectInProgress(false);
    }
  }, [loadNews]);

  const handleCloseWriterModal = useCallback(() => {
    setWriterModalOpen(false);
    setWriterNews(null);
  }, []);

  const handleView = useCallback((news) => {
    setWriterNews(news);
    setWriterModalOpen(true);
  }, []);

  const filteredNews = useMemo(() => {
    if (selectedSport === "all") {
      return newsItems;
    }

    return newsItems.filter((item) => item.sport_key === selectedSport);
  }, [newsItems, selectedSport]);

  const handleToggleExpanded = useCallback((newsId) => {
    setExpandedNewsIds((prev) =>
      prev.includes(newsId)
        ? prev.filter((id) => id !== newsId)
        : [...prev, newsId]
    );
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            News
          </h1>
        </div>
        <div className="flex justify-center items-center py-24">
          <Loader className="w-12 h-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 dark:text-gray-100">
      {isLogged ? (
        <>
          {" "}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              News
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
              Автоматически собранные новости для подготовки материалов.
            </p>
          </div>
          {loadingError ? (
            <div className="border border-red-200 dark:border-red-500/60 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-200 px-4 py-3 rounded">
              {loadingError}
            </div>
          ) : null}
          <NewsSportsFilter
            options={sportsOptions}
            value={selectedSport}
            onChange={setSelectedSport}
          />
          <div className="flex justify-end gap-3 mb-4">
            <button
              type="button"
              onClick={() => handleCollectNews(10)}
              disabled={collectInProgress}
              className={`px-4 py-2 rounded bg-teal-500 dark:bg-teal-600 text-white dark:text-white text-sm font-semibold shadow hover:bg-teal-600 dark:hover:bg-teal-500 transition ${
                collectInProgress ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {collectInProgress ? "Сбор..." : "Собрать 10"}
            </button>
            <button
              type="button"
              onClick={() => handleCollectNews(50)}
              disabled={collectInProgress}
              className={`px-4 py-2 rounded bg-teal-500 dark:bg-teal-600 text-white dark:text-white text-sm font-semibold shadow hover:bg-teal-600 dark:hover:bg-teal-500 transition ${
                collectInProgress ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {collectInProgress ? "Сбор..." : "Собрать 50"}
            </button>
          </div>
          <NewsTable
            items={filteredNews}
            isLoading={false}
            onWrite={handleWrite}
            onView={handleView}
            processingMap={processingMap}
            expandedIds={expandedNewsIds}
            onToggleExpand={handleToggleExpanded}
          />
          <Pagination
            bonuses={{
              total_pages: totalPages,
              amount: totalCount,
              data: filteredNews,
            }}
            selectedPage={page}
            setSelectedPage={setPage}
            itemsPerPage={pageSize}
            setItemsPerPage={setPageSize}
          />
          <NewsWriterModal
            isOpen={writerModalOpen}
            news={writerNews}
            onClose={handleCloseWriterModal}
          />
        </>
      ) : (
        <p className="text-red-600 text-center m-10">Please log in</p>
      )}
    </div>
  );
};

const NewsPage = () => {
  return (
    <NewsProvider>
      <NewsPageContent />
    </NewsProvider>
  );
};

export default NewsPage;

