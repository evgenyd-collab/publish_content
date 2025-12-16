import { useState } from "react";
import { dataFetch } from "../../../helpers/data-fetch";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;

const CollectNewBonusesButton = ({ bookmakerId, disabled }) => {
  const [isLoading, setIsLoading] = useState(false);

  const collectNewBonuses = async () => {
    if (!bookmakerId) {
      alert("Не удалось создать задачу: отсутствует bookmakerId");
      return;
    }

    setIsLoading(true);

    const payload = {
      profile_id: 99,
      bookmaker_ids: bookmakerId,
    };

    try {
      const response = await dataFetch(
        payload,
        "POST",
        `${API_ENDPOINT}/tasks/`
      );

      if (response.status === 201) {
        alert(
          "AI Browser Use пошел искать бонусы. Он старательный, но не очень быстрый. Если у букмекера много бонусов, это займет около получаса"
        );
      } else if (response.status === 401) {
        alert("Сессия истекла. Пожалуйста, войдите снова.");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}`;
        alert(`Не удалось создать задачу: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      alert(error?.message || "Не удалось создать задачу: ошибка сети");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={collectNewBonuses}
      disabled={disabled || isLoading}
      className={`px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition ${
        disabled || isLoading
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : ""
      }`}
    >
      {isLoading ? (
        <span className="w-4 h-4 mr-2 inline-block align-middle">
          <svg className="animate-spin" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
          </svg>
        </span>
      ) : null}
      Collect New Bonuses
    </button>
  );
};


export default CollectNewBonusesButton;
