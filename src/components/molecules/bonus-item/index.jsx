import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import DetailsModal from "../../modals/details-modal";
import useAuthStore from "../../../store/auth-store";
import { Spinner } from "../../atoms/spinner";
import FlagsIndicator from "../../atoms/flags-indicator";
import { getStatusBadge } from "../../../helpers/getStatusBadge";
import Loader from "../../atoms/loader";
import { dataFetch } from "../../../helpers/data-fetch";

const ensureAccessToken = async () => {
  const { accessToken, refreshAccessToken } = useAuthStore.getState();
  if (accessToken) return accessToken;
  const newToken = await refreshAccessToken();
  return newToken;
};

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;

// Функция для форматирования разницы в днях
const formatRelativeDate = (daysDiff) => {
  if (daysDiff === null || isNaN(daysDiff)) {
    return "No Date";
  }
  if (daysDiff < 0) {
    return `-${Math.abs(daysDiff)} Days`; // Например, "-2 Days"
  } else if (daysDiff === 0) {
    return "Today";
  } else if (daysDiff === 1) {
    return "1 Day";
  } else {
    return `${daysDiff} Days`;
  }
};

// Получаем ID бонуса на LegalCasino.
// Возможны два варианта структуры данных:
// 1. bonus.props.legalcasino_id — когда ID уже сохранён как пропса.
// 2. bonus.legalcasino_payload.data.attributes.id — когда объект payload сформирован в представлении.
// Если один из путей возвращает значение, считаем бонус размещённым на LC.
const getLegalCasinoId = (bonus) => {
  try {
    return (
      bonus?.props?.legalcasino_id ??
      bonus?.legalcasino_payload?.data?.attributes?.id ??
      null
    );
  } catch (e) {
    return null;
  }
};

const BonusItem = ({ bonus, onSuccess, selectedLocale }) => {
  const isLogged = useAuthStore((state) => state.isLogged);

  const [updatedBonus, setUpdatedBonus] = useState(bonus);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isLCPublishing, setIsLCPublishing] = useState(false);
  const [lcPublishError, setLcPublishError] = useState(false);
  // Состояния для новой логики истечения через задачу (profile_id 52)
  const [lcExpireError, setLcExpireError] = useState(false);
  // Таймер подтверждения Expire
  const [isExpirePending, setIsExpirePending] = useState(false);
  const [expireCountdown, setExpireCountdown] = useState(0);
  const expireIntervalRef = useRef(null);
  const expireTimeoutRef = useRef(null);
  const pendingStorageKey = useMemo(() => `expirePending:${bonus.id}`, [bonus?.id]);

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedBonus(null);
  };

  const getBonusFlags = (bonusData) => ({
    manual_url: bonusData.override_manual_url,
    manual_type: bonusData.override_manual_type,
    manual_terms: bonusData.override_manual_terms,
    manual_expiration: bonusData.override_manual_expiration,
  });

  const isExpiredFlag = (status) =>
    typeof status === "string" &&
    status.trim().toLowerCase().includes("expired");

  const expirationInfo = useMemo(() => {
    if (!bonus?.expiration_date) {
      return {
        text: formatRelativeDate(null),
        daysDiff: null,
        bgColor: "bg-gray-100 text-gray-500",
      };
    }

    try {
      const expirationDate = new Date(bonus.expiration_date);
      if (isNaN(expirationDate.getTime())) {
        throw new Error("Invalid date format");
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expirationDate.setHours(0, 0, 0, 0);

      const diffTime = expirationDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let bgColor = "bg-transparent";
      if (daysDiff < 0) {
        bgColor = "bg-red-100 text-red-700";
      } else if (daysDiff >= 0 && daysDiff <= 2) {
        bgColor = "bg-yellow-100 text-yellow-800";
      }

      return { text: formatRelativeDate(daysDiff), daysDiff, bgColor };
    } catch (error) {
      console.error(
        "Error parsing expiration date:",
        bonus.expiration_date,
        error
      );
      return {
        text: "Date Error",
        daysDiff: null,
        bgColor: "bg-red-100 text-red-700",
      };
    }
  }, [bonus?.expiration_date]);

  // Очистка таймеров при размонтировании/смене бонуса
  useEffect(() => {
    return () => {
      if (expireIntervalRef.current) clearInterval(expireIntervalRef.current);
      if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current);
    };
  }, []);

  // Восстановление таймера из sessionStorage (переживает обновление списка)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(pendingStorageKey);
      if (!raw) return;
      const { startedAt, durationMs } = JSON.parse(raw) || {};
      if (!startedAt || !durationMs) return;
      const elapsed = Date.now() - startedAt;
      const remaining = durationMs - elapsed;
      if (remaining <= 0) {
        sessionStorage.removeItem(pendingStorageKey);
        return;
      }

      setIsExpirePending(true);
      setExpireCountdown(Math.ceil(remaining / 1000));

      expireIntervalRef.current = setInterval(() => {
        setExpireCountdown((prev) => {
          const next = prev - 1;
          return next >= 0 ? next : 0;
        });
      }, 1000);

      expireTimeoutRef.current = setTimeout(() => {
        if (expireIntervalRef.current) clearInterval(expireIntervalRef.current);
        expireIntervalRef.current = null;
        expireTimeoutRef.current = null;
        setIsExpirePending(false);
        setExpireCountdown(0);
        sessionStorage.removeItem(pendingStorageKey);
        // Запускаем исходную логику Expire
        handlePatchBonus();
      }, remaining);
    } catch (e) {
      // ignore parse errors
    }
  }, [pendingStorageKey]);

  // Запрос PATCH для обновления бонуса
  const handlePatchBonus = async () => {
    const lcId = getLegalCasinoId(updatedBonus);
    const isLcBonus = !!lcId;
    const currentStatus = (updatedBonus.expiration_status || "")
      .trim()
      .toLowerCase();
    const isExpired = currentStatus.includes("expired");
    const action = isExpired ? "make_active" : "expire";

    // --- Новый сценарий истечения для бонуса на ЛЦ ---
    if (isLcBonus && action === "expire") {
      await handleLCExpire();
      return;
    }

    // Для остальных сценариев (make_active на ЛЦ или любой action для non-LC) — старая логика
    setIsLoading(true);

    if (isLcBonus && action === "make_active") {
      try {
        // Шаг 1: Вычисляем нужную дату
        let targetExpirationDate;
        if (action === "expire") {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          targetExpirationDate = yesterday.toISOString().split("T")[0];
        } else {
          // make_active
          const plusYear = new Date();
          plusYear.setFullYear(plusYear.getFullYear() + 1);
          targetExpirationDate = plusYear.toISOString().split("T")[0];
        }

        const patchForm = {
          expiration_status: action === "expire" ? "expired" : "active, auto",
          manual_expiration: true,
          expiration_date: targetExpirationDate,
        };

        const response = await dataFetch(
          patchForm,
          "PATCH",
          `${API_ENDPOINT}/bonuses/${bonus.id}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to update local bonus: ${response.statusText}`
          );
        }

        const updatedData = await response.json();
        setUpdatedBonus(updatedData);

        // Шаг 2: Polling для проверки обновления legalcasino_payload
        const pollForLCData = async () => {
          let attempts = 0;
          const maxAttempts = 7;
          const pollInterval = 1000;

          for (let i = 0; i < maxAttempts; i++) {
            try {
              const bonusResponse = await dataFetch(
                null,
                "GET",
                `${API_ENDPOINT}/bonuses/${bonus.id}`
              );
              const freshBonusData = await bonusResponse.json();
              const lcPayload = freshBonusData.legalcasino_payload;

              if (
                lcPayload?.data?.attributes?.expirationDate ===
                targetExpirationDate
              ) {
                console.log("Polling successful: legalcasino_payload updated.");
                return true; // Успех
              }

              setUpdatedBonus(freshBonusData);
            } catch (error) {
              console.error(`Polling attempt ${i + 1} failed:`, error);
            }
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }

          return false; // Таймаут
        };

        const isPayloadUpdated = await pollForLCData();

        if (!isPayloadUpdated) {
          throw new Error(
            "Polling timeout: legalcasino_payload was not updated in time."
          );
        }

        // Шаг 3: Запуск задачи для обновления на ЛЦ
        await handleLCPublish();
        onSuccess();
      } catch (error) {
        console.error("Error in LC bonus update process:", error);
        alert(`Error updating bonus with LC sync: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // --- Сценарий 2: Бонус НЕ на ЛЦ (или make_active для non-LC) ---
    let patchForm = {};
    if (action === "expire") {
      patchForm = { expiration_status: "expired", manual_expiration: true };
    } else {
      // make_active
      patchForm = {
        expiration_status: "active, auto",
        manual_expiration: true,
      };
    }

    try {
      const response = await dataFetch(
        patchForm,
        "PATCH",
        `${API_ENDPOINT}/bonuses/${bonus.id}`
      );

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const updatedData = await response.json();
      setUpdatedBonus(updatedData);
      onSuccess();
    } catch (error) {
      console.error("Network or other error updating bonus:", error);
      alert(`Error updating bonus: ${error.message || "Network error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLCPublish = async () => {
    setIsLCPublishing(true);
    setLcPublishError(false);

    const token = await ensureAccessToken();
    if (!token) {
      setLcPublishError(true);
      setIsLCPublishing(false);
      return;
    }

    const payload = {
      profile_id: 50,
      bookmaker_ids: bonus.id,
    };

    try {
      // Создаем задачу
      const response = await dataFetch(
        payload,
        "POST",
        `${API_ENDPOINT}/tasks/`
      );

      if (response.status !== 201) {
        setLcPublishError(true);
        setIsLCPublishing(false);
        return;
      }

      console.log("Task created successfully, waiting for completion...");

      // Запускаем polling для проверки результата
      const pollInterval = 1000; // Проверяем каждую секунду
      const maxAttempts = 5; // Максимум 5 попыток (5 секунд)
      let attempts = 0;

      const pollForResult = async () => {
        try {
          const ok = await ensureAccessToken();
          if (!ok) {
            setLcPublishError(true);
            setIsLCPublishing(false);
            return;
          }
          const bonusResponse = await dataFetch(
            null,
            "GET",
            `${API_ENDPOINT}/bonuses/${bonus.id}`
          );

          if (!bonusResponse.ok) {
            throw new Error(`Failed to fetch bonus: ${bonusResponse.status}`);
          }

          const updatedBonusData = await bonusResponse.json();
          const lcId = getLegalCasinoId(updatedBonusData);

          if (lcId) {
            // Задача выполнена успешно - ID появился
            console.log("LC ID found:", lcId);
            setUpdatedBonus(updatedBonusData);
            setIsLCPublishing(false);
            onSuccess(); // Вызываем для обновления общего списка
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            // Продолжаем polling
            setTimeout(pollForResult, pollInterval);
          } else {
            // Превышено максимальное количество попыток
            console.error("Task timeout: LC ID not found after 5 seconds");
            setLcPublishError(true);
            setIsLCPublishing(false);
          }
        } catch (error) {
          console.error("Error during polling:", error);
          setLcPublishError(true);
          setIsLCPublishing(false);
        }
      };

      // Запускаем первую проверку
      setTimeout(pollForResult, pollInterval);
    } catch (error) {
      console.error("Error creating task:", error);
      setLcPublishError(true);
      setIsLCPublishing(false);
    }
  };

  /**
   * Новая упрощённая логика для истечения бонуса, уже опубликованного на LegalCasino.
   * Шаги:
   * 1. Создаём задачу с profile_id = 52, bookmaker_ids = bonus.id
   * 2. Ожидаем (polling), пока expiration_status в бонусе не станет "expired"
   */
  const handleLCExpire = async () => {
    setIsLoading(true);
    setLcExpireError(false);

    const payload = {
      profile_id: 52,
      bookmaker_ids: bonus.id,
    };

    try {
      const response = await dataFetch(
        payload,
        "POST",
        `${API_ENDPOINT}/tasks/`
      );
      // Проверяем успешность создания задачи
      if (response.status !== 201) {
        setLcExpireError(true);
        setIsLoading(false);
        return;
      }

      // Polling: ждём, пока статус бонуса станет expired
      const pollInterval = 1000;
      const maxAttempts = 7;
      let attempts = 0;

      const pollForExpire = async () => {
        try {
          const bonusResponse = await dataFetch(
            null,
            "GET",
            `${API_ENDPOINT}/bonuses/${bonus.id}`
          );

          if (!bonusResponse.ok) {
            throw new Error(`Failed to fetch bonus: ${bonusResponse.status}`);
          }

          const refreshedBonus = await bonusResponse.json();
          setUpdatedBonus(refreshedBonus);

          const statusLower = (
            refreshedBonus.expiration_status || ""
          ).toLowerCase();
          if (statusLower.includes("expired")) {
            // Успех
            setIsLoading(false);
            onSuccess();
            return;
          }

          attempts += 1;
          if (attempts < maxAttempts) {
            setTimeout(pollForExpire, pollInterval);
          } else {
            setLcExpireError(true);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error during expire polling:", error);
          setLcExpireError(true);
          setIsLoading(false);
        }
      };

      // Запускаем первую проверку
      setTimeout(pollForExpire, pollInterval);
    } catch (error) {
      console.error("Error creating expire task:", error);
      setLcExpireError(true);
      setIsLoading(false);
    }
  };

  // Обработчик клика по кнопке действия с 4-секундной задержкой для Expire
  const handleActionClick = () => {
    if (!isLogged || isLoading) return;

    const currentStatus = (updatedBonus.expiration_status || "").trim().toLowerCase();
    const isExpired = currentStatus.includes("expired");

    // Для Make active — сразу выполняем
    if (isExpired) {
      handlePatchBonus();
      return;
    }

    // Для Expire — если уже запущен таймер, то отменяем
    if (isExpirePending) {
      if (expireIntervalRef.current) clearInterval(expireIntervalRef.current);
      if (expireTimeoutRef.current) clearTimeout(expireTimeoutRef.current);
      expireIntervalRef.current = null;
      expireTimeoutRef.current = null;
      setIsExpirePending(false);
      setExpireCountdown(0);
      try { sessionStorage.removeItem(pendingStorageKey); } catch (_) {}
      return;
    }

    // Запускаем 4-секундный таймер с возможностью отмены
    setIsExpirePending(true);
    setExpireCountdown(4);
    try {
      sessionStorage.setItem(pendingStorageKey, JSON.stringify({ startedAt: Date.now(), durationMs: 4000 }));
    } catch (_) {}

    expireIntervalRef.current = setInterval(() => {
      setExpireCountdown((prev) => {
        const next = prev - 1;
        return next >= 0 ? next : 0;
      });
    }, 1000);

    expireTimeoutRef.current = setTimeout(() => {
      if (expireIntervalRef.current) clearInterval(expireIntervalRef.current);
      expireIntervalRef.current = null;
      expireTimeoutRef.current = null;
      setIsExpirePending(false);
      setExpireCountdown(0);
      try { sessionStorage.removeItem(pendingStorageKey); } catch (_) {}
      // По истечении 4 сек запускаем исходную логику Expire
      handlePatchBonus();
    }, 4000);
  };

  // Update useEffect to sync updatedBonus with bonus prop
  useEffect(() => {
    setUpdatedBonus(bonus);
  }, [bonus]);

  let parsedTerms = {};
  try {
    if (bonus.terms && typeof bonus.terms === "string") {
      parsedTerms = JSON.parse(bonus.terms);
    } else if (bonus.terms && typeof bonus.terms === "object") {
      // In case bonus.terms is already an object (e.g. from a previous parse or different data structure)
      parsedTerms = bonus.terms;
    }
  } catch (e) {
    console.error(
      "Failed to parse bonus.terms in BonusItem for bonus ID:",
      bonus.id,
      bonus.terms,
      e
    );
    // parsedTerms will remain {} or you can set a default like { domain: 'sport' } if that's desired on error
  }
  const domainFromTerms = parsedTerms.domain;
  const lcId = getLegalCasinoId(bonus);
  const buttonText = lcPublishError
    ? "ERROR"
    : lcId
    ? `PATCH [${lcId}]`
    : "LC POST";

  return (
    <>
      {isDetailsLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <Loader className="w-12 h-12" />
        </div>
      )}
      <tr key={bonus.id} className="hover:bg-gray-50 border-b">
        {/* Bookmaker / ID */}
        <td
          className="px-4 py-3 text-sm whitespace-nowrap"
          title="Bookmaker name / Bonus ID"
        >
          <div className="flex items-center gap-2">
            <div>
              <a
                href={`/bookmakers/${selectedLocale}&${bonus.bookmaker_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 font-medium hover:underline"
                title={`Go to bookmaker page: ${bonus.bookmaker}`}
              >
                {bonus.bookmaker}
              </a>{" "}
              / {bonus.id}
            </div>
            {/* Legalbet URL indicator */}
            {bonus.legalbet_url && bonus.legalbet_url.trim() !== "" && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-green-800 bg-green-200 bg-opacity-60"
                title={`Legalbet URL: ${bonus.legalbet_url}`}
              >
                LB
              </span>
            )}
          </div>
        </td>

        {/* Bonus Name с tooltip */}
        <td className="px-4 py-3 max-w-[400px]">
          <div className="group relative">
            <a
              href={bonus.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 font-medium hover:underline cursor-pointer"
              title={`Go to bonus page: ${bonus.name}`}
            >
              {bonus.name}
            </a>
            {/* Tooltip с ограничениями по ширине: min 30% и max 70% от ширины экрана */}
            <div
              className="invisible group-hover:visible absolute z-10 
                         w-auto min-w-[65vw] max-w-[75vw] p-4 mt-1 text-sm bg-gray-800 text-white 
                         rounded shadow-lg left-0 whitespace-pre-wrap break-words"
            >
              <p className="font-semibold mb-1">Bonus Terms:</p>
              <p className="text-xs">
                {bonus.terms?.promotion_essence || "No terms provided"}
              </p>
            </div>
          </div>
        </td>

        {/* Sum */}
        <td className="px-9 py-3 text-sm font-medium text-left">
          <div className="group relative">
            <span
              className={
                bonus.amount && bonus.amount.length > 25 ? "cursor-help" : ""
              }
            >
              {bonus.amount && bonus.amount.length > 25
                ? `${bonus.amount.slice(0, 20)}...`
                : bonus.amount}
            </span>
            {/* Tooltip для полного описания суммы */}
            {bonus.amount && bonus.amount.length > 25 && (
              <div
                className="invisible group-hover:visible absolute z-10 
                           w-auto min-w-[30vw] max-w-[50vw] p-3 mt-1 text-sm bg-gray-800 text-white 
                           rounded shadow-lg left-0 whitespace-pre-wrap break-words"
              >
                <p className="text-xs">{bonus.amount}</p>
              </div>
            )}
          </div>
        </td>

        {/* Type */}
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center">
            <span
              className="text-xl mr-2"
              role="img"
              aria-label={
                (domainFromTerms || "sport").toLowerCase() === "casino"
                  ? "Casino"
                  : (domainFromTerms || "sport").toLowerCase() === "poker"
                  ? "Poker"
                  : (domainFromTerms || "sport").toLowerCase() === "bingo"
                  ? "Bingo"
                  : "Sport"
              }
            >
              {
                (domainFromTerms || "sport").toLowerCase() === "casino"
                  ? "🎰"
                  : (domainFromTerms || "sport").toLowerCase() === "poker"
                  ? "♦️"
                  : (domainFromTerms || "sport").toLowerCase() === "bingo"
                  ? "🅱️"
                  : "⚽️"
              }
            </span>
            <div className="flex flex-col">
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  bonus.bonus_type === "Welcome"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {bonus?.bonus_type || "No data"}
              </span>
              {bonus.terms?.reward_type && (
                <span className="text-xs text-gray-500 italic">
                  ({bonus.terms.reward_type})
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Expiration Date */}
        <td className="px-5 py-3 text-sm">
          <span
            className={`px-2 py-1 text-xs rounded ${expirationInfo.bgColor}`}
          >
            {expirationInfo.text}
          </span>
        </td>
        {bonus.legalcasino_payload !== null &&
        bonus.legalcasino_payload !== undefined ? (
          <td className="px-50 py-1 text-sm">
            <button
              disabled={isLCPublishing}
              onClick={handleLCPublish}
              className={`px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition ${
                lcPublishError ? "bg-red-600" : ""
              } ${
                isLCPublishing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : ""
              }`}
            >
              {isLCPublishing ? <Spinner /> : buttonText}
            </button>
          </td>
        ) : (
          <td className="px-50 py-1 text-sm"></td>
        )}
        {/* Details Button (SPA navigation) */}
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center space-x-2">
            <Link
              to={`/bonuses/${bonus.id}`}
              className={`px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center visited:text-white focus:text-white ${
                isLogged
                  ? "bg-blue-500 hover:bg-blue-300"
                  : "bg-gray-300 hover:bg-gray-300"
              }`}
              onClick={(e) => {
                if (!isLogged) {
                  e.preventDefault();
                  e.stopPropagation();
                } else setIsDetailsLoading(true);
              }}
              onAuxClick={(e) => {
                if (e.button === 1) setIsDetailsLoading(true);
              }}
              onMouseUp={(e) => {
                if (e.button === 1) setIsDetailsLoading(false);
              }}
            >
              📋&nbsp;Details
            </Link>
          </div>
        </td>
        {/* Status */}
        <td className="px-2 py-3 text-sm">
          <div className="flex items-center space-x-2">
            {getStatusBadge(updatedBonus.expiration_status)}
          </div>
        </td>

        {/* Flags (скрытая колонка) */}
        <td className="px-4 py-3 text-sm hidden">
          <FlagsIndicator flags={getBonusFlags(bonus)} />
        </td>

        {/* Action Button */}
        <td className="px-4 py-3 text-sm">
          <button
            disabled={(isLoading || !isLogged) && !isExpirePending}
            onClick={handleActionClick}
            className={`px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 
              ${
                (isLoading || !isLogged) && !isExpirePending
                  ? "hover:bg-gray-300 text-gray-500"
                  : "hover:bg-blue-600"
              }
              
              transition ${
                (isLoading || !isLogged) && !isExpirePending
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : ""
              }`}
          >
            {isLoading ? (
              <Loader className="w-5 h-5 mr-2" />
            ) : isExpiredFlag(updatedBonus.expiration_status) ? (
              "Make active"
            ) : (
              isExpirePending
                ? `Cancel ${expireCountdown} >`
                : "Expire"
            )}
          </button>
        </td>
      </tr>
      {isDetailsModalOpen && selectedBonus && (
        <DetailsModal
          bonus={selectedBonus}
          onSuccess={closeDetailsModal}
          fetchBonus={fetchBonusDetails}
        />
      )}
    </>
  );
};

export default BonusItem;
