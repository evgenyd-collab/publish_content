import { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Plus, X } from "lucide-react";
import { dataFetch } from "../../helpers/data-fetch";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;
const SPORT_FIELDS = ["football", "basket", "tennis", "volleyball", "cs2"];
const BONUS_HUB_PAGE_TYPE = 18;
const SPORT_PAGE_TYPES = {
  football: 3,
  basket: 4,
  tennis: 5,
  volleyball: 6,
  cs2: 7,
};
const TASK_PROFILE_BONUSES = 99;
const TASK_PROFILE_MARGINS = 98;

// Простейшая валидация URL с поддержкой http/https
function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeBookmakerPayload(raw, fallbackId) {
  if (!raw && !fallbackId) return { bookmaker: null, bookmakerId: undefined };

  const candidates = [
    raw?.bookmaker,
    raw?.data?.bookmaker,
    raw?.data,
    raw,
  ].filter(Boolean);

  let bookmaker = null;
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      bookmaker = candidate;
      break;
    }
  }

  const tryGetId = (obj) => {
    if (!obj || typeof obj !== "object") return undefined;
    return (
      obj.id ??
      obj.bookmaker_id ??
      obj.bookmakerId ??
      (Array.isArray(obj.bookmaker_ids) ? obj.bookmaker_ids[0] : undefined) ??
      (Array.isArray(obj.ids) ? obj.ids[0] : undefined)
    );
  };

  let bookmakerId;
  if (bookmaker) {
    bookmakerId = tryGetId(bookmaker);
  }
  if (bookmakerId === undefined) {
    bookmakerId = tryGetId(raw);
  }
  if (bookmakerId === undefined) {
    bookmakerId = tryGetId(raw?.data);
  }
  if (bookmakerId === undefined) {
    bookmakerId = fallbackId;
  }

  if (bookmaker && bookmakerId !== undefined && bookmaker.id === undefined) {
    bookmaker = { ...bookmaker, id: bookmakerId };
  }

  return { bookmaker: bookmaker || (bookmakerId !== undefined ? { id: bookmakerId } : null), bookmakerId };
}

export default function AddBookmakerModal({
  selectedLocale,
  onClose,
  onCreated, // (bookmaker) => void
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [localesDict, setLocalesDict] = useState({}); // { UK: 1, ES: 2, ... }

  const [seoName, setSeoName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [bonusHubUrls, setBonusHubUrls] = useState([""]);
  const [showSportUrls, setShowSportUrls] = useState(false);
  const [sportUrls, setSportUrls] = useState(() =>
    SPORT_FIELDS.reduce((acc, field) => {
      acc[field] = [""];
      return acc;
    }, {})
  );

  // Загружаем список локалей для маппинга к loc_id
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const resp = await dataFetch(null, "GET", `${API_ENDPOINT}/locales/`);
        if (!resp.ok) return;
        const raw = await resp.json().catch(() => ({}));
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.results || []);
        const map = {};
        list.forEach((loc) => {
          if (loc?.locale_code && loc?.id) map[loc.locale_code] = loc.id;
        });
        if (isMounted) setLocalesDict(map);
      } catch {
        // ignore, пусть провалится валидация ниже
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const locId = useMemo(() => localesDict?.[selectedLocale], [localesDict, selectedLocale]);

  const allSportUrlsValid = useMemo(() => {
    return SPORT_FIELDS.every((field) => {
      const list = sportUrls[field] || [];
      const cleaned = list
        .map((v) => v.trim())
        .filter((v) => v !== "");
      return cleaned.every((v) => isValidHttpUrl(v));
    });
  }, [sportUrls]);

  const hasAnySportUrl = useMemo(() => {
    return SPORT_FIELDS.some((field) => {
      const list = sportUrls[field] || [];
      return list.some((value) => value.trim() !== "");
    });
  }, [sportUrls]);

  const canSubmit = useMemo(() => {
    if (!seoName.trim()) return false;
    if (!isValidHttpUrl(siteUrl.trim())) return false;
    // bonusHubUrls могут быть пустыми; если есть — все валидные
    const cleaned = bonusHubUrls
      .map((v) => v.trim())
      .filter((v) => v !== "");
    if (!cleaned.every((v) => isValidHttpUrl(v))) return false;
    return allSportUrlsValid;
  }, [seoName, siteUrl, bonusHubUrls, allSportUrlsValid]);

  const isBonusesDisabled = !canSubmit || isLoading;
  const isMarginsDisabled = isBonusesDisabled || !hasAnySportUrl;

  const handleAddHubField = () => setBonusHubUrls((arr) => [...arr, ""]);
  const handleRemoveHubField = (idx) =>
    setBonusHubUrls((arr) => arr.filter((_, i) => i !== idx));
  const handleChangeHub = (idx, value) =>
    setBonusHubUrls((arr) => arr.map((v, i) => (i === idx ? value : v)));

  const handleToggleSportSection = () => setShowSportUrls((prev) => !prev);
  const handleAddSportField = (field) =>
    setSportUrls((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), ""],
    }));
  const handleRemoveSportField = (field, idx) =>
    setSportUrls((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== idx),
    }));
  const handleChangeSportField = (field, idx, value) =>
    setSportUrls((prev) => ({
      ...prev,
      [field]: (prev[field] || []).map((v, i) => (i === idx ? value : v)),
    }));

  const handleSubmit = async (taskProfileId) => {
    if (!locId) {
      alert("Не удалось определить loc_id для выбранной локали. Повторите попытку позже.");
      return;
    }

    if (!canSubmit) return;

    setIsLoading(true);
    try {
      const payload = {
        loc_id: locId,
        seo_name: seoName.trim(),
        site_url: siteUrl.trim(),
      };
      if (brandName.trim()) payload.brand_name = brandName.trim();

      const pageUrls = [];

      const hubs = bonusHubUrls
        .map((v) => v.trim())
        .filter((v) => v !== "");
      if (hubs.length) {
        pageUrls.push({ page_type: BONUS_HUB_PAGE_TYPE, urls: hubs });
      }

      SPORT_FIELDS.forEach((field) => {
        const pageType = SPORT_PAGE_TYPES[field];
        const list = (sportUrls[field] || [])
          .map((v) => v.trim())
          .filter((v) => v !== "");
        if (pageType && list.length) {
          pageUrls.push({ page_type: pageType, urls: list });
        }
      });

      if (pageUrls.length) {
        payload.page_urls = pageUrls;
      }

      const resp = await dataFetch(payload, "POST", `${API_ENDPOINT}/bookmakers/`);

      // Тело ответа может понадобиться в обеих ветках
      let body = null;
      try {
        body = await resp.clone().json();
      } catch {
        body = null;
      }

      if (resp.status === 201) {
        const locationHeader = resp.headers?.get?.("Location") || resp.headers?.get?.("location");
        let locationId = undefined;
        if (locationHeader) {
          const match = String(locationHeader).match(/(\d+)(?:\/?$)/);
          if (match) {
            locationId = Number(match[1]);
          }
        }

        const { bookmaker, bookmakerId: newId } = normalizeBookmakerPayload(body, locationId);

        // Создаём задачу первичного сбора
        if (newId && taskProfileId) {
          const taskPayload = { profile_id: taskProfileId, bookmaker_ids: newId };
          try {
            const tResp = await dataFetch(taskPayload, "POST", `${API_ENDPOINT}/tasks/`);
            if (!tResp.ok) {
              const tText = await tResp.text().catch(() => "");
              console.error(`TASK ${taskProfileId} create failed: ${tResp.status} ${tText}`);
              alert(`Не удалось создать задачу профиля ${taskProfileId}. ${tText || "Попробуйте позже."}`);
            }
          } catch (e) {
            console.error(`TASK ${taskProfileId} create error:`, e);
            alert(`Не удалось создать задачу профиля ${taskProfileId}: ${e?.message || "Ошибка сети"}`);
          }
        } else if (!newId) {
          console.warn("Bookmaker created, но не удалось определить его id для запуска задачи.");
        }

        onCreated?.(bookmaker);
        onClose?.();
      } else if (resp.status === 200) {
        const { bookmaker, bookmakerId: existingId } = normalizeBookmakerPayload(body);
        alert(`Букмекер уже существует. ID: ${existingId ?? "неизвестен"}`);
        onClose?.();
      } else if (resp.status === 401) {
        alert("Сессия истекла. Пожалуйста, войдите снова.");
      } else {
        const text = await resp.text().catch(() => "");
        alert(`Не удалось создать букмекера: HTTP ${resp.status}${text ? `: ${text}` : ""}`);
      }
    } catch (e) {
      console.error("Create bookmaker error:", e);
      alert(e?.message || "Ошибка сети при создании букмекера");
    } finally {
      setIsLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto max-w-[100%]  w-[100%] h-[100%]">
      <div className="bg-white rounded-lg w-[95%] max-w-[700px] max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Добавить букмекера</h3>
          <div className="flex items-center space-x-2">
            <button
              className="w-[25px] h-[25px] flex items-center justify-center p-0 bg-transparent border-none outline-none"
              aria-label="Close"
              onClick={() => onClose?.()}
              type="button"
            >
              <X size={20} color="#3591FD" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-grow px-4 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">seo_name</label>
              <input
                type="text"
                value={seoName}
                onChange={(e) => setSeoName(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Например: bet365"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">brand_name (optional)</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Например: Bet365"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">site_url</label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className={`w-full border rounded-md p-2 text-sm ${siteUrl && !isValidHttpUrl(siteUrl) ? "border-red-400" : ""}`}
                placeholder="https://example.com/"
              />
              {siteUrl && !isValidHttpUrl(siteUrl) && (
                <p className="text-xs text-red-500 mt-1">Введите валидный URL (http/https)</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-1">bonus_hub_urls</label>
                <button
                  type="button"
                  onClick={handleAddHubField}
                  className="w-[25px] h-[25px] flex items-center justify-center p-0 bg-transparent border-none outline-none"
                  title="Добавить URL"
                >
                  <Plus size={18} color="#3591FD" />
                </button>
              </div>
              <div className="space-y-2">
                {bonusHubUrls.map((value, idx) => (
                  <div className="flex items-center gap-2" key={idx}>
                    <input
                      type="url"
                      value={value}
                      onChange={(e) => handleChangeHub(idx, e.target.value)}
                      className={`flex-1 border rounded-md p-2 text-sm ${value && !isValidHttpUrl(value) ? "border-red-400" : ""}`}
                      placeholder="https://example.com/bonuses/"
                    />
                    {bonusHubUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHubField(idx)}
                        className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={handleToggleSportSection}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showSportUrls ? "Скрыть ссылки по видам спорта" : "Добавить ссылки по видам спорта"}
              </button>
              {showSportUrls && (
                <div className="mt-3 space-y-4">
                  {SPORT_FIELDS.map((field) => (
                    <div key={field}>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{`${field}_urls`}</label>
                        <button
                          type="button"
                          onClick={() => handleAddSportField(field)}
                          className="w-[25px] h-[25px] flex items-center justify-center p-0 bg-transparent border-none outline-none"
                          title="Добавить URL"
                        >
                          <Plus size={18} color="#3591FD" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(sportUrls[field] || []).map((value, idx) => (
                          <div className="flex items-center gap-2" key={idx}>
                            <input
                              type="url"
                              value={value}
                              onChange={(e) => handleChangeSportField(field, idx, e.target.value)}
                              className={`flex-1 border rounded-md p-2 text-sm ${value && !isValidHttpUrl(value) ? "border-red-400" : ""}`}
                              placeholder="https://example.com/sport/"
                            />
                            {(sportUrls[field]?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSportField(field, idx)}
                                className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">Локаль: <span className="font-medium">{selectedLocale}</span> {locId ? `(id=${locId})` : "(загрузка id...)"}</div>
          </div>
        </div>
        <div className="p-4 border-t space-y-2 sm:flex sm:space-y-0 sm:space-x-2">
          <button
            onClick={() => handleSubmit(TASK_PROFILE_BONUSES)}
            disabled={isBonusesDisabled}
            className={`w-full px-4 py-3 text-white font-medium rounded ${isBonusesDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`}
          >
            Создать и собрать бонусы
          </button>
          <button
            onClick={() => handleSubmit(TASK_PROFILE_MARGINS)}
            disabled={isMarginsDisabled}
            className={`w-full px-4 py-3 text-white font-medium rounded ${isMarginsDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}
          >
            Создать и собрать данные о марже
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


