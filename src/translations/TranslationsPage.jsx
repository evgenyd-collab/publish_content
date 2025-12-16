import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Pagination from "../components/molecules/pagination";
import {
  createTranslationRecord,
  fetchTranslationRecord,
  fetchTranslationsInbox,
  updateTranslationStatus,
} from "./api/translationsService";
import { DEFAULT_TARGET_LANGUAGE } from "./constants";
import TranslationCreateModal from "./components/TranslationCreateModal";
import TranslationsTable from "./components/TranslationsTable";
import { useTranslations } from "./context/TranslationsContext";
import useAuthStore from "../store/auth-store";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE_FOR_ALL = 100;

const resolveLanguageCode = (languageCode = DEFAULT_TARGET_LANGUAGE) =>
  String(languageCode || DEFAULT_TARGET_LANGUAGE).toUpperCase();

const TranslationsPage = () => {
  const isLogged = useAuthStore((state) => state.isLogged);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [translations, setTranslations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const retranslateProcessedRef = useRef(false);

  const { processingMap, runPipeline } = useTranslations();

  const effectivePageSize = useMemo(() => {
    if (pageSize === "all") {
      return MAX_PAGE_SIZE_FOR_ALL;
    }
    const numeric = Number(pageSize);
    return Number.isFinite(numeric) && numeric > 0
      ? numeric
      : DEFAULT_PAGE_SIZE;
  }, [pageSize]);

  const loadTranslations = useCallback(
    async ({ resetPage = false } = {}) => {
      setLoadError(null);
      if (resetPage) {
        setPage(1);
      }

      setIsLoading(true);

      try {
        const response = await fetchTranslationsInbox({
          page: resetPage ? 1 : page,
          pageSize: effectivePageSize,
          sortBy: "id",
          sortOrder: "desc",
        });

        setTranslations(response.records || []);
        setTotalPages(response.total_pages || 1);
        setTotalCount(response.total_count || 0);
      } catch (error) {
        console.error("Не удалось загрузить список переводов", error);
        setLoadError(error?.message || "Не удалось загрузить список переводов");
      } finally {
        setIsLoading(false);
      }
    },
    [page, effectivePageSize]
  );

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  // Update local translations state when processing status changes
  useEffect(() => {
    setTranslations((prev) => {
      let hasChanges = false;
      const next = prev.map((item) => {
        const info = processingMap[item.id];
        if (info) {
          // If running, update status to processed if not already
          if (info.status === "running" && item.status !== "processed") {
            hasChanges = true;
            return { ...item, status: "processed" };
          }
          // If error, update status to failed
          if (info.status === "error" && item.status !== "failed") {
            hasChanges = true;
            return { ...item, status: "failed" };
          }
        }
        // If not in processing map but was processed, we might need to refresh?
        // Actually, when pipeline finishes, it removes itself from map.
        // We should probably reload the list or update the specific item if we knew it finished.
        // But runPipeline doesn't return the final record to here.
        // For now, let's rely on manual refresh or the user navigating.
        // Ideally, we should listen to completion events or poll.
        return item;
      });
      return hasChanges ? next : prev;
    });
  }, [processingMap]);

  const handleRunPipeline = useCallback(
    async (record, languageOrOptions) => {
      if (!record?.id) return;

      // Optimistically update UI
      setTranslations((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, status: "processed" } : item
        )
      );

      await runPipeline(record, languageOrOptions);

      // Refresh list after completion to get latest data (e.g. new locale in payload)
      // This might be too aggressive if multiple are running, but acceptable for now.
      // To avoid full reload, we could fetch just this record.
      const updated = await fetchTranslationRecord({ inboxId: record.id });
      setTranslations((prev) =>
        prev.map((item) => (item.id === record.id ? updated : item))
      );
    },
    [runPipeline]
  );

  const handleCreateRecord = useCallback(
    async (payload, { autoTranslateLanguage } = {}) => {
      const normalizedLanguage = autoTranslateLanguage
        ? resolveLanguageCode(autoTranslateLanguage)
        : undefined;

      const created = await createTranslationRecord(
        normalizedLanguage
          ? { ...payload, target_language: normalizedLanguage }
          : payload
      );
      setIsCreateModalOpen(false);
      await loadTranslations({ resetPage: true });

      if (normalizedLanguage) {
        const newId = created?.id || created?.record?.id;
        let record = null;
        if (newId) {
          record =
            created?.record ||
            (await fetchTranslationRecord({ inboxId: newId }));
        }
        if (record) {
          void handleRunPipeline(record, { language: normalizedLanguage });
        } else {
          alert(
            "Запись создана, но не удалось получить её данные. Попробуйте запустить перевод вручную."
          );
        }
      }
    },
    [loadTranslations, handleRunPipeline]
  );

  const handleRetranslate = useCallback(
    async (record, language) => {
      if (!record?.id) return;
      const inboxId = record.id;

      if (processingMap[inboxId]?.status === "running") {
        return;
      }

      try {
        await updateTranslationStatus({ inboxId, status: "new" });
        const updatedRecord = await fetchTranslationRecord({ inboxId });
        if (updatedRecord) {
          const languageCode = resolveLanguageCode(
            language || DEFAULT_TARGET_LANGUAGE
          );
          await handleRunPipeline(updatedRecord, { language: languageCode });
        }
      } catch (error) {
        console.error("Не удалось запустить повторный перевод", error);
        alert("Не удалось запустить повторный перевод");
      }
    },
    [processingMap, handleRunPipeline]
  );

  useEffect(() => {
    const retranslateId = searchParams.get("retranslate");
    if (!retranslateId) {
      retranslateProcessedRef.current = false;
      return;
    }

    if (isLoading || translations.length === 0) {
      return;
    }

    const inboxId = Number(retranslateId);
    if (!Number.isFinite(inboxId) || inboxId <= 0) {
      return;
    }

    const record = translations.find((item) => item.id === inboxId);
    if (!record || retranslateProcessedRef.current) {
      return;
    }

    const retranslateLanguage = searchParams.get("language");

    retranslateProcessedRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("retranslate");
    nextParams.delete("language");
    setSearchParams(nextParams, { replace: true });
    void handleRetranslate(record, retranslateLanguage);
  }, [
    searchParams,
    translations,
    handleRetranslate,
    setSearchParams,
    isLoading,
  ]);

  const handleViewRecord = useCallback(
    (record) => {
      if (record?.id) {
        navigate(`/translations/${record.id}`);
      }
    },
    [navigate]
  );

  const paginationData = useMemo(
    () => ({ total_pages: totalPages, amount: totalCount, data: translations }),
    [totalPages, totalCount, translations]
  );

  return (
    <div className="p-6 space-y-6">
      {isLogged ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Translations
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Управление переводами прогнозов: создание, запуск пайплайна и
                просмотр результатов.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg shadow hover:bg-teal-600 transition"
            >
              Добавить прогноз
            </button>
          </div>

          {loadError ? (
            <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded-lg">
              {loadError}
            </div>
          ) : null}

          <TranslationsTable
            items={translations}
            isLoading={isLoading}
            onTranslate={handleRunPipeline}
            onRetranslate={handleRetranslate}
            onView={handleViewRecord}
            processingMap={processingMap}
          />

          <Pagination
            bonuses={paginationData}
            selectedPage={page}
            setSelectedPage={setPage}
            itemsPerPage={pageSize}
            setItemsPerPage={setPageSize}
          />

          <TranslationCreateModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateRecord}
          />
        </>
      ) : (
        <p className="text-red-600 text-center m-10"></p>
      )}
    </div>
  );
};

export default TranslationsPage;

