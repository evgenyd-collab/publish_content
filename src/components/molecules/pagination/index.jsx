import React from "react";

// Новый современный компонент пагинации
const Pagination = ({
  bonuses,
  selectedPage,
  setSelectedPage,
  itemsPerPage,
  setItemsPerPage,
}) => {
  const totalPages = bonuses?.total_pages || 1;
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setSelectedPage(page);
    }
  };

  const handleItemsChange = (e) => {
    setItemsPerPage(e.target.value);
    setSelectedPage(1);
  };

  // Генерация массива страниц (сокращённая навигация)
  const getPages = () => {
    if (totalPages <= 7) {
      return [...Array(totalPages)].map((_, i) => i + 1);
    }
    if (selectedPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (selectedPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      selectedPage - 1,
      selectedPage,
      selectedPage + 1,
      "...",
      totalPages,
    ];
  };

  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 py-4 border-t bg-gray-100 px-3">
      <div className="flex items-center gap-2">
        <div className="relative w-32">
          <select
            className="appearance-none w-full h-8 pl-2 pr-7 py-0.5 rounded bg-greybackground text-sm font-normal leading-tight text-[#000000cc] border-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            onChange={handleItemsChange}
            value={itemsPerPage}
            style={{
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.5rem center",
            }}
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={"all"}>All</option>
          </select>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {bonuses?.data?.length > 0
            ? `Total: ${bonuses.amount} records${
                bonuses.data[0]?.bookmaker
                  ? ` for ${bonuses.data[0].bookmaker}`
                  : ""
              }`
            : null}
        </span>
      </div>
      <div className="flex items-center gap-1 justify-center">
        <button
          className="rounded-lg px-2 py-1 border bg-gray-100 dark:bg-[#23272f] text-gray-600 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-50"
          onClick={() => handlePageChange(selectedPage - 1)}
          disabled={selectedPage === 1}
          aria-label="Previous"
        >
          &larr;
        </button>
        {getPages().map((page, idx) =>
          page === "..." ? (
            <span key={idx} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={`${page}-${idx}`}
              className={`rounded-lg px-3 py-1 border text-sm font-semibold transition-colors
                  ${
                    selectedPage === page
                      ? "bg-blue-600 text-white border-blue-600 shadow"
                      : "bg-gray-100 dark:bg-[#23272f] text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-[#2a3140] border-gray-300 dark:border-gray-600"
                  }`}
              onClick={() => handlePageChange(page)}
              aria-current={selectedPage === page ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}
        <button
          className="rounded-lg px-2 py-1 border bg-gray-100 dark:bg-[#23272f] text-gray-600 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-50"
          onClick={() => handlePageChange(selectedPage + 1)}
          disabled={selectedPage === totalPages}
          aria-label="Next"
        >
          &rarr;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
