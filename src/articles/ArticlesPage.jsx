import { useCallback, useEffect, useState } from "react";
import Loader from "../components/atoms/loader";
import Pagination from "../components/molecules/pagination";
import ArticlesTable from "./components/ArticlesTable";
import ArticlePublishModal from "./components/ArticlePublishModal";
import ArticleCreateModal from "./components/ArticleCreateModal";
import ErrorBoundary from "./components/ErrorBoundary";
import { fetchArticles, createArticle } from "./api/articlesService";

const DEFAULT_PAGE_SIZE = 20;

const ArticlesPage = () => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [expandedArticleIds, setExpandedArticleIds] = useState([]);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Пагинация
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);
    try {
      const response = await fetchArticles({
        page,
        pageSize: pageSize === "all" ? 100 : pageSize,
        sortBy: "id",
        sortOrder: "desc",
      });

      setArticles(response.records || []);
      setTotalPages(response.total_pages || 1);
      setTotalCount(response.total_count || 0);
    } catch (error) {
      console.error("Не удалось загрузить статьи", error);
      setLoadingError(error?.message || "Ошибка загрузки статей");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleToggleExpand = useCallback((articleId) => {
    setExpandedArticleIds((prev) =>
      prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId]
    );
  }, []);

  const handlePublish = useCallback((article) => {
    setSelectedArticle(article);
    setPublishModalOpen(true);
  }, []);

  const handleView = useCallback((article) => {
    // Можно открыть детальную страницу или модальное окно
    console.log("Просмотр статьи:", article);
    alert(`Просмотр статьи: ${article.title || article.headline || article.id}`);
  }, []);

  const handleEdit = useCallback((article) => {
    // Можно открыть редактор
    console.log("Редактирование статьи:", article);
    alert(`Редактирование статьи: ${article.title || article.headline || article.id}`);
  }, []);

  const handlePublishSuccess = useCallback(() => {
    loadArticles();
  }, [loadArticles]);

  const handleClosePublishModal = useCallback(() => {
    setPublishModalOpen(false);
    setSelectedArticle(null);
  }, []);

  const handleCreateArticle = useCallback(async (formData) => {
    try {
      console.log("[ArticlesPage] Начало создания статей, данные:", formData);
      const result = await createArticle(formData);
      console.log("[ArticlesPage] Статьи созданы, результат:", result);
      
      // Обновляем список статей только после успешного создания
      // Но не сразу, чтобы не сбрасывать форму
      setTimeout(async () => {
        console.log("[ArticlesPage] Обновление списка статей...");
        await loadArticles();
      }, 2000);
      
      // Показываем сообщение о количестве созданных статей
      const topicsCount = formData.topics?.length || 1;
      const successCount = Array.isArray(result) ? result.length : (result ? 1 : 0);
      console.log(`[ArticlesPage] Успешно создано статей: ${successCount} из ${topicsCount}`, result);
      
      return result;
    } catch (error) {
      console.error("[ArticlesPage] Ошибка создания статей:", error);
      throw error;
    }
  }, [loadArticles]);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  if (isLoading && articles.length === 0) {
    return (
      <div className="p-6 dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Публикация статей
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Публикация статей
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
            Управление статьями: просмотр, редактирование и публикация.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-teal-500 dark:bg-teal-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-teal-600 dark:hover:bg-teal-500 transition"
        >
          Добавить статью
        </button>
      </div>

      {loadingError ? (
        <div className="border border-red-200 dark:border-red-500/60 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          {loadingError}
        </div>
      ) : null}

      <ArticlesTable
        items={articles}
        isLoading={isLoading}
        onPublish={handlePublish}
        onView={handleView}
        onEdit={handleEdit}
        expandedIds={expandedArticleIds}
        onToggleExpand={handleToggleExpand}
      />

      <Pagination
        bonuses={{
          total_pages: totalPages,
          amount: totalCount,
          data: articles,
        }}
        selectedPage={page}
        setSelectedPage={setPage}
        itemsPerPage={pageSize}
        setItemsPerPage={setPageSize}
      />

      <ArticlePublishModal
        isOpen={publishModalOpen}
        article={selectedArticle}
        onClose={handleClosePublishModal}
        onSuccess={handlePublishSuccess}
      />

      <ErrorBoundary onClose={handleCloseCreateModal}>
        <ArticleCreateModal
          isOpen={createModalOpen}
          onClose={handleCloseCreateModal}
          onSubmit={handleCreateArticle}
        />
      </ErrorBoundary>
    </div>
  );
};

export default ArticlesPage;

