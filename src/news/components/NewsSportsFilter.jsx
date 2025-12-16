const NewsSportsFilter = ({ options, value, onChange }) => {
  if (!options?.length) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label="Sports"
      className="inline-flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const activeClasses =
          "bg-blue-500 text-white border-blue-500 dark:bg-blue-600 dark:border-blue-400 dark:text-white";
        const inactiveClasses =
          "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-[#1d2230] dark:text-gray-200 dark:border-gray-600 dark:hover:bg-[#242a3b]";

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1 text-sm rounded-full border transition ${
              isActive ? activeClasses : inactiveClasses
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default NewsSportsFilter;

