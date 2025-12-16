import React, { useState } from "react";
import { Spinner } from "../atoms/spinner";
import { dataFetch } from "../../helpers/data-fetch";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;

const NewBonusModal = ({
  closeAddBonusModal,
  selectedLocale,
  bookmakerId,
  bookmakerName,
}) => {
  const initialNewBonusData = {
    bookmaker_id: bookmakerId,
    url: "",
    terms: "",
  };

  const [isLoading, setIsLoading] = useState(false);
  const [newBonusFormData, setNewBonusFormData] = useState(initialNewBonusData);
  const [urlWarning, setUrlWarning] = useState("");

  const checkUrlLength = (url) => {
    if (url.length > 75) {
      setUrlWarning(
        <>
          <div className="font-semibold mb-2">⚠️ Перепроверьте URL, он очень длинный</div>
          <div className="mb-2">Нет ли там лишних параметров после знака "?"</div>
          <div className="text-xs space-y-1">
            <div className="font-medium">Пример с лишними параметрами:</div>
            <div className="break-all bg-red-50 p-1 rounded">
              https://www.example.es/promotions/promo-la-liga?_gl=1*18tayqv...
            </div>
            <div className="font-medium mt-2">Чистая ссылка:</div>
            <div className="break-all bg-green-50 p-1 rounded">
              https://www.example.es/promotions/promo-la-liga
            </div>
          </div>
        </>
      );
    } else {
      setUrlWarning("");
    }
  };

  const handleTestButtonClick = async () => {
    setIsLoading(true);
    try {
      const response = await dataFetch(
        newBonusFormData,
        "PUT",
        `${API_ENDPOINT}/bonuses/`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.message || `HTTP ${response.status}`;
        console.error("Error adding bonus:", msg);
        alert(`Error adding bonus: ${msg}`);
        return;
      }

      console.log("Bonus added successfully!");
      closeAddBonusModal();
    } catch (error) {
      console.error("Bonus error:", error.message || error);
      alert(error?.message || "Network error while adding bonus");
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect(() => {
  //   async function fetchAuthToken() {
  //     const url = `${API_ENDPOINT}/auth`;
  //     const headers = new Headers({
  //       accept: "application/json",
  //       "Content-Type": "application/x-www-form-urlencoded",
  //       Authorization: `Basic ${AUTH_KEY}`,
  //     });

  //     const body = new URLSearchParams({
  //       username: "admin345543",
  //       password: "R6o5sVhzHPzBcZg",
  //     });

  //     try {
  //       const response = await fetch(url, {
  //         method: "POST",
  //         headers: headers,
  //         body: body,
  //       });

  //       if (!response.ok) {
  //         throw new Error(`HTTP error! Status: ${response.status}`);
  //       }

  //       const data = await response.json();
  //       setSessionToken(data.access_token || "");
  //     } catch (error) {
  //       console.error("Error fetching auth token:", error);
  //       setSessionToken("");
  //     }
  //   }

  //   fetchAuthToken();
  // }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">
            {`Add New Bonus for ${bookmakerName} (ID#${bookmakerId}) ${selectedLocale.toUpperCase()}`}
          </h3>
          <button
            onClick={closeAddBonusModal}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bonus URL (required)
            </label>
            <input
              type="url"
              value={newBonusFormData.url}
              onChange={(e) => {
                const newUrl = e.target.value;
                setNewBonusFormData({
                  ...newBonusFormData,
                  url: newUrl,
                });
                checkUrlLength(newUrl);
              }}
              className="w-full border rounded-md p-2 text-sm"
              placeholder="https://example.com/bonus"
            />
            {urlWarning && (
              <div className="mt-1 text-sm text-red-600">
                {urlWarning}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Terms & Conditions (optional)
              </label>
            </div>
            <textarea
              value={newBonusFormData.terms}
              onChange={(e) => {
                setNewBonusFormData({
                  ...newBonusFormData,
                  terms: e.target.value,
                });
              }}
              className="w-full border rounded-md p-2 text-sm"
              rows="4"
              placeholder="Enter terms and conditions..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={closeAddBonusModal}
            className="px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleTestButtonClick}
            className={`px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition ${
              newBonusFormData.url === ""
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : ""
            }`}
            disabled={newBonusFormData.url === ""}
          >
            {isLoading ? <Spinner /> : "Add & Process Bonus"}
          </button>
          {/* <button onClick={handleTestButtonClick}>TEST BUTTON</button> */}
        </div>
      </div>
    </div>
  );
};

export default NewBonusModal;
