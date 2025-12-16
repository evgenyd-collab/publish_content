import React from 'react';

// Компонент для отображения иконки сортировки
const SortIcon = ({ direction }) => {
  if (!direction) {
    // Можно показывать иконку "сортировка возможна" или ничего
    return null; // Пока ничего не показываем
  }
  return (
    <span className="ml-1">
      {direction === 'ascending' ? '▲' : '▼'}
    </span>
  );
};

const TableHead = ({ sortConfig, requestSort }) => {

  const getThClasses = (key) => {
    let classes = "px-5 py-3 text-left text-sm font-medium text-gray-700";

    if (key === "name" || key === "expiration_date") {
      classes +=
        " cursor-pointer hover:bg-gray-100 transition-colors duration-150";
    }
    if (key === "expiration_date") {
      classes = classes.replace("px-4", "px-5");
    }
    if (key === "status") {
      classes = classes.replace("px-5", "px-2");
    }

    if (key === "sum") {
      classes = classes.replace("px-5", "px-5 text-center");
    }
    return classes;
  };

  const renderSortIcon = (key) => {
    if (sortConfig && sortConfig.key === key) {
      return <SortIcon direction={sortConfig.direction} />;
    }
    return null;
  };

  return (
    <thead className="bg-gray-50">
      <tr>
        <th className={getThClasses("bookmaker")}>Bookmaker</th>

        {/* Сортируемая колонка: Bonus Name */}
        <th
          className={getThClasses("name")}
          onClick={() => requestSort?.("name")}
        >
          <div className="flex items-center">
            Bonus Name
            {renderSortIcon("name")}
          </div>
        </th>

        <th
          className={
            getThClasses("sum") +
            " cursor-pointer hover:bg-gray-100 transition-colors duration-150"
          }
          onClick={() => requestSort?.("amount_number")}
        >
          <div className="flex items-center justify-center">
            Sum
            {renderSortIcon("amount_number")}
          </div>
        </th>

        <th className={getThClasses("type")}>Type</th>

        {/* Сортируемая колонка: Expiration Date */}
        <th
          className={getThClasses("expiration_date")}
          onClick={() => requestSort?.("expiration_date")}
        >
          <div className="flex items-center">
            Expiration&nbsp;Date
            {renderSortIcon("expiration_date")}
          </div>
        </th>
        <th className={getThClasses("details")}></th>
        <th className={getThClasses("details")}>Details</th>

        <th className={getThClasses("status")}>Status</th>

        {/* Скрываем заголовок Flags */}
        <th className={getThClasses("flags") + " hidden"}>Flags</th>

        <th className={getThClasses("action")}>Action</th>
      </tr>
    </thead>
  );
};

export default TableHead;
