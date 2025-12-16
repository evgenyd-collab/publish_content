import React from 'react';
import { statuses } from '../../helpers/constants.js';

const StatusEditModal = ({
  closeStatusEditModal,
  editStatus,
  setEditStatus,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Edit Status</h3>
          <button
            onClick={closeStatusEditModal}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="w-full appearance-none h-8 pl-2 pr-7 py-0.5 rounded bg-greybackground text-sm font-normal leading-tight text-[#000000cc] border-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            style={{
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.5rem center",
            }}
          >
            {statuses.map((status) => (
              <option
                key={status}
                value={status}
                className="bg-white text-black"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={closeStatusEditModal}
            className="px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveStatus}
            className="px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusEditModal;
