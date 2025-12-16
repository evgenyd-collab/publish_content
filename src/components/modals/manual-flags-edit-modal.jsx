import React from 'react';

const ManualFlagsEditModal = ({
  updateBonusField,
  closeFlagsModal,
  selectedBonusForFlags,handleSaveFlags 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Bonus Manual Override</h3>
          <button
            onClick={closeFlagsModal}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">URL Manual Override</label>
            <div className="relative inline-block w-10 align-middle select-none">
              <input
                type="checkbox"
                checked={selectedBonusForFlags.manual_url}
                onChange={() =>
                  updateBonusField(
                    selectedBonusForFlags.id,
                    'manual_url',
                    !selectedBonusForFlags.manual_url
                  )
                }
                className="sr-only"
              />
              <div className="w-10 h-5 bg-gray-300 rounded-full shadow-inner"></div>
              <div
                className={`absolute w-5 h-5 bg-white rounded-full shadow inset-y-0 left-0 transition-transform ${
                  selectedBonusForFlags.manual_url
                    ? 'transform translate-x-full bg-green-500'
                    : ''
                }`}
              ></div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">
              Bonus Type Manual Override
            </label>
            <div className="relative inline-block w-10 align-middle select-none">
              <input
                type="checkbox"
                checked={selectedBonusForFlags.manual_type_override}
                onChange={() =>
                  updateBonusField(
                    selectedBonusForFlags.id,
                    'manual_type_override',
                    !selectedBonusForFlags.manual_type_override
                  )
                }
                className="sr-only"
              />
              <div className="w-10 h-5 bg-gray-300 rounded-full shadow-inner"></div>
              <div
                className={`absolute w-5 h-5 bg-white rounded-full shadow inset-y-0 left-0 transition-transform ${
                  selectedBonusForFlags.manual_type_override
                    ? 'transform translate-x-full bg-green-500'
                    : ''
                }`}
              ></div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">T&C Manual Override</label>
            <div className="relative inline-block w-10 align-middle select-none">
              <input
                type="checkbox"
                checked={selectedBonusForFlags.manual_terms}
                onChange={() =>
                  updateBonusField(
                    selectedBonusForFlags.id,
                    'manual_terms',
                    !selectedBonusForFlags.manual_terms
                  )
                }
                className="sr-only"
              />
              <div className="w-10 h-5 bg-gray-300 rounded-full shadow-inner"></div>
              <div
                className={`absolute w-5 h-5 bg-white rounded-full shadow inset-y-0 left-0 transition-transform ${
                  selectedBonusForFlags.manual_terms
                    ? 'transform translate-x-full bg-green-500'
                    : ''
                }`}
              ></div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">
              Expiration Manual Override
            </label>
            <div className="relative inline-block w-10 align-middle select-none">
              <input
                type="checkbox"
                checked={selectedBonusForFlags.manual_expiration}
                onChange={() =>
                  updateBonusField(
                    selectedBonusForFlags.id,
                    'manual_expiration',
                    !selectedBonusForFlags.manual_expiration
                  )
                }
                className="sr-only"
              />
              <div className="w-10 h-5 bg-gray-300 rounded-full shadow-inner"></div>
              <div
                className={`absolute w-5 h-5 bg-white rounded-full shadow inset-y-0 left-0 transition-transform ${
                  selectedBonusForFlags.manual_expiration
                    ? 'transform translate-x-full bg-green-500'
                    : ''
                }`}
              ></div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveFlags}
            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualFlagsEditModal;
