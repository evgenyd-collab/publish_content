export const getStatusBadge = (status) => {
  // Handle undefined, null, or non-string status
  if (!status || typeof status !== 'string') {
    status = 'unknown';
  }

  // Определяем классы для разных статусов
  const statusClasses = {
    active: "bg-green-100 text-green-800",
    check: "bg-yellow-100 text-yellow-800",
    expired: "bg-red-100 text-red-800",
    need_manual_check: "bg-yellow-100 text-yellow-800",
    unknown: "bg-gray-100 text-gray-800",
  };

  // Получаем базовый статус для отображения
  const getBaseStatus = (status) => {
    if (!status || typeof status !== 'string') {
      return 'unknown';
    }
    if (status.includes("active")) {
      return "active";
    } else if (status.includes("check")) {
      return "check";
    } else if (status.includes("expired")) {
      return "expired";
    } else return status;
  };

  // Получаем базовый статус для определения стилей
  const baseStatus = getBaseStatus(status);
  
  return (
    <div className="group relative inline-block">
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-sm bg-gray-800 text-white rounded shadow-lg">
        <div className="flex items-start gap-2">
          <span
            className={`inline-block w-2 h-2 mt-1 rounded-full flex-shrink-0
              ${baseStatus === "active" ? "bg-blue-400" : ""}
              ${
                baseStatus === "check" || baseStatus === "need_manual_check"
                  ? "bg-yellow-400"
                  : ""
              }
              ${baseStatus === "expired" ? "bg-red-400" : ""}
            `}
          ></span>
          <div>
            <div className="font-semibold text-white text-sm mb-0.5">
              Status
            </div>
            <div className="text-xs text-gray-200 leading-snug break-words whitespace-pre-line">
              {(() => {
                // Если статус содержит "check: last scan", переносим строку после этой подстроки
                if (status.includes("check: last scan")) {
                  return status.replace("check: last scan", "check: last scan\n");
                }
                // Иначе, если есть двоеточие, переносим после первого двоеточия
                const colonIndex = status.indexOf(":");
                if (colonIndex !== -1) {
                  return `${status.slice(0, colonIndex + 1)}\n${status.slice(colonIndex + 1).trimStart()}`;
                }
                // В остальных случаях возвращаем как есть
                return status;
              })()}
            </div>
          </div>
        </div>
      </div>
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
          statusClasses[baseStatus] || "bg-gray-100 text-gray-800"
        }`}
      >
        {getBaseStatus(status)}
      </span>
    </div>
  );
};