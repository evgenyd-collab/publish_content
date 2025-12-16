import React from 'react';

// Компонент "светофор" с 4 индикаторами для manual flags
const FlagsIndicator = ({ flags, onClick }) => {
  const getColorClass = (isTrue) => (isTrue ? "bg-yellow-400" : "bg-green-400");

  return (
    <button
      onClick={onClick}
      className="flex space-x-1 p-1 border rounded hover:bg-gray-100"
      title="Manual flags status"
    >
      {Object.keys(flags).map((key, index) => (
        <div
          key={index}
          className={`w-4 h-4 rounded-full ${getColorClass(flags[key])}`}
          title={key}
        ></div>
      ))}
    </button>
  );
};

export default FlagsIndicator;
