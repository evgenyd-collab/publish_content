import React from 'react';

// Компонент кнопки с иконкой для открытия модального окна
const IconButton = ({ onClick, icon, label, className }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600 text-sm flex items-center ${
        className || ''
      }`}
      title={label}
    >
      <span className="mr-1">{icon}</span>
      <span>{label}</span>
    </button>
  );
};

export default IconButton;
