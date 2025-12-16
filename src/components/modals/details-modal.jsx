import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Copy,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import useAuthStore from "../../store/auth-store";
import { plusYear, normalizeDate, today } from "../../helpers/constants";
import { convertTermsToTextList } from "../../helpers/terms-convert";
import { convertTranslationToHTML } from "../../helpers/bonus-convert";
import { Spinner } from "../atoms/spinner";
import { dataFetch } from "../../helpers/data-fetch";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;
const AUTH_KEY = import.meta.env.VITE_AUTH_KEY;

const DetailsModal = ({ bonus, onSuccess, fetchBonus }) => {
  const isLogged = useAuthStore((state) => state.isLogged);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);

  const initialBonusData = {
    terms: bonus?.terms || "",
    expiration_date: normalizeDate(bonus?.expiration_date),
    bonus_type: bonus?.bonus_type,
    manual_url: bonus?.override_manual_url,
    manual_type_override: bonus?.override_manual_type,
    manual_terms: bonus?.override_manual_terms,
    manual_expiration: bonus?.override_manual_expiration,
    tc: bonus?.tc || "",
    rus_translation: bonus?.texts?.lb_translation,
    legalbet_url: bonus?.legalbet_url || "",
  };

  const [refresh, setRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bonusFormData, setBonusFormData] = useState(initialBonusData);
  const [termsChanged, setTermsChanged] = useState(false);
  const [paramsChanged, setParamsChanged] = useState(false);
  const [blocksOpened, setBlocksOpened] = useState({
    terms: true,
    params: false,
    genInfo: true,
  });

  const [activeTextsTab, setActiveTextsTab] = useState("struct");
  const [isEditingLegalbetUrl, setIsEditingLegalbetUrl] = useState(false);
  const legalbetInputRef = useRef(null);

  const [copiedTab, setCopiedTab] = useState("");

  const navigate = useNavigate();

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Maybe show a success message
        console.log("Text copied to clipboard");
      })
      .catch((err) => {
        console.error("Error copying text: ", err);
      });
  };

  const handleCopy = (text, tab) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTab(tab);
      setTimeout(() => setCopiedTab(""), 2000);
    });
  };

  async function handleSaveData() {
    if (!isLogged) return;
    setIsLoading(true);

    try {
      // Собираем запросы как функции, исполняем последовательно
      const requestThunks = [];

      if (termsChanged) {
        // 1) PUT /bonuses/ с новыми T&C
        requestThunks.push(() =>
          dataFetch(
            {
              bookmaker_id: bonus.bookmaker_id,
              url: bonus.url,
              terms: bonusFormData.tc,
            },
            "PUT",
            `${API_ENDPOINT}/bonuses/`
          )
        );

        // 2) PATCH /bonuses/:id manual_terms=true
        requestThunks.push(() =>
          dataFetch(
            { manual_terms: true },
            "PATCH",
            `${API_ENDPOINT}/bonuses/${bonus.id}`
          )
        );
      }

      if (paramsChanged) {
        const patchData = {};

        // expiration_date и manual_expiration
        if (bonusFormData.expiration_date === "") {
          patchData.expiration_date = plusYear.toISOString().split("T")[0];
          patchData.manual_expiration = true;
        }

        if (
          normalizeDate(bonusFormData.expiration_date) !==
            normalizeDate(bonus.expiration_date) &&
          bonusFormData.expiration_date !== ""
        ) {
          patchData.expiration_date = bonusFormData.expiration_date;
          patchData.manual_expiration = true;
        }

        // bonus_type и manual_type_override
        if (bonusFormData.bonus_type !== bonus.bonus_type) {
          patchData.bonus_type =
            bonusFormData.bonus_type === "Common"
              ? "sportbonus_common"
              : "sportbonus_welcome";
          patchData.manual_type_override = true;
        }

        // флаги manual_*
        [
          "manual_url",
          "manual_type_override",
          "manual_terms",
          "manual_expiration",
        ].forEach((flag) => {
          if (bonusFormData[flag] !== bonus[flag]) {
            patchData[flag] = bonusFormData[flag];
          }
        });

        if (Object.keys(patchData).length > 0) {
          requestThunks.push(() =>
            dataFetch(patchData, "PATCH", `${API_ENDPOINT}/bonuses/${bonus.id}`)
          );
        }
      }

      let allOk = true;

      for (let i = 0; i < requestThunks.length; i++) {
        let resp;
        try {
          resp = await requestThunks[i]();
        } catch (err) {
          // сюда попадём, если refresh не смог выдать новый access (в сторе уже будет logout)
          console.error(`Request ${i + 1} rejected:`, err);
          allOk = false;
          break;
        }

        if (resp.status === 401) {
          // после попытки рефреша сервер всё ещё вернул 401 — считаем неуспех
          console.error(`Request ${i + 1} failed with 401 after refresh`);
          allOk = false;
          break;
        }

        if (!resp.ok) {
          console.error(
            `Request ${i + 1} failed: ${resp.status} ${resp.statusText}`
          );
          allOk = false;
          // при желании можно break; оставляю продолжение, чтобы собрать максимум ошибок
          continue;
        }

        // пробуем прочитать success:false в теле
        try {
          const data = await resp.clone().json();
          if (data?.success === false) {
            console.error(
              `Request ${i + 1} returned success:false —`,
              data.message || data
            );
            allOk = false;
          }
        } catch {
          // тело пустое/не JSON — игнорируем
        }
      }

      if (allOk) {
        onSuccess?.();
        setTermsChanged(false);
        setParamsChanged(false);
        navigate(`/bookmakers/${bonus?.locale_code}&${bonus?.bookmaker_id}`);
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveLegalbetUrl() {
    if (!isLogged) return;
    setIsLoading(true);
    try {
      const response = await dataFetch(
        { legalbet_url: bonusFormData.legalbet_url },
        "PATCH",
        `${API_ENDPOINT}/bonuses/${bonus.id}`
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`);
      }

      await fetchBonus?.();
      setIsEditingLegalbetUrl(false);
    } catch (error) {
      console.error("Failed to save legalbet_url:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const tcValue =
      typeof bonusFormData?.tc === "string" ? bonusFormData.tc : "";
    const initialTcValue =
      typeof initialBonusData?.tc === "string" ? initialBonusData.tc : "";
    setTermsChanged(tcValue.trim() !== initialTcValue.trim());
  }, [bonusFormData.tc]);

  useEffect(() => {
    setParamsChanged(
      bonusFormData.expiration_date !== initialBonusData.expiration_date ||
        bonusFormData.bonus_type !== initialBonusData.bonus_type ||
        bonusFormData.manual_url !== initialBonusData.manual_url ||
        bonusFormData.manual_type_override !==
          initialBonusData.manual_type_override ||
        bonusFormData.manual_terms !== initialBonusData.manual_terms ||
        bonusFormData.manual_expiration !== initialBonusData.manual_expiration
    );
  }, [bonusFormData]);

  useEffect(() => {
    if (bonusFormData.expiration_date !== initialBonusData.expiration_date) {
      setBonusFormData((prevState) => ({
        ...prevState,
        manual_expiration: true,
      }));
    }
  }, [bonusFormData.expiration_date]);

  useEffect(() => {
    if (isEditingLegalbetUrl && legalbetInputRef.current) {
      legalbetInputRef.current.focus();
    }
  }, [isEditingLegalbetUrl]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto max-w-[100%]  w-[100%] h-[100%]">
      <div className="bg-white rounded-lg w-[95%] max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">
            Bonus Details: <span className="font-bold">{bonus?.name}</span>
          </h3>
          <div className="flex items-center space-x-2">
            {refresh ? (
              <Spinner size={24} />
            ) : (
              <button
                className="w-[25px] h-[25px] flex items-center justify-center p-0 bg-transparent border-none outline-none"
                aria-label="Refresh"
                type="button"
                onClick={async () => {
                  setRefresh(true);
                  await fetchBonus();
                  setRefresh(false);
                  setTermsChanged(false);
                  setParamsChanged(false);
                }}
              >
                <RefreshCw size={20} color="#3591FD" />
              </button>
            )}
            <button
              className="w-[25px] h-[25px] flex items-center justify-center p-0 bg-transparent border-none outline-none"
              aria-label="Close"
              onClick={() => {
                if (window.history.length > 2) {
                  history.back();
                } else {
                  navigate(
                    `/bookmakers/${bonus?.locale_code}&${bonus?.bookmaker_id}`
                  );
                }
              }}
              type="button"
            >
              <X size={20} color="#3591FD" />
            </button>
          </div>
        </div>
        {/* Содержимое с прокруткой */}
        <div className="overflow-y-auto flex-grow px-4 py-2">
          {/* 1. Блок "Общая информация" */}
          <div className="mb-4 border rounded-lg overflow-hidden">
            <div
              className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer"
              onClick={() =>
                setBlocksOpened((prevState) => ({
                  ...prevState,
                  genInfo: !prevState.genInfo,
                }))
              }
            >
              <h4 className="font-medium">Информация и управление бонусом</h4>
              {blocksOpened.genInfo ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div
              className={blocksOpened.genInfo ? "p-4 visible" : "p-4 hidden"}
            >
              {/* Название бонуса и URL */}
              <div className="mb-3">
                <h5 className="font-semibold text-lg">{bonus?.name}</h5>
                <div className="mt-2 space-y-1">
                  <label className="block text-sm text-gray-500">
                    Bonus URL
                  </label>
                  <a
                    href={bonus?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-500 hover:underline text-sm truncate max-w-full"
                  >
                    {bonus?.url}
                  </a>
                </div>
                <div className="mt-2 space-y-1">
                  <label className="block text-sm text-gray-500">
                    Legalbet URL
                  </label>
                  {!isEditingLegalbetUrl ? (
                    bonusFormData.legalbet_url ? (
                      <div className="flex items-center space-x-2">
                        <a
                          href={bonusFormData.legalbet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-500 hover:underline text-sm truncate max-w-full"
                        >
                          {bonusFormData.legalbet_url}
                        </a>
                        <button
                          onClick={() => setIsEditingLegalbetUrl(true)}
                          className="text-teal-500 hover:text-teal-700 text-sm py-1 px-3 rounded"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        title={isLogged ? "Add URL" : "Please login first"}
                        disabled={!isLogged}
                        onClick={() => setIsEditingLegalbetUrl(true)}
                        className={`${
                          isLogged
                            ? "text-teal-500 hover:text-teal-700"
                            : "text-gray-500 hover:text-gray-500 cursor-not-allowed"
                        } text-sm py-1 px-3 rounded`}
                      >
                        Add
                      </button>
                    )
                  ) : (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={bonusFormData.legalbet_url}
                        onChange={(e) =>
                          setBonusFormData((prev) => ({
                            ...prev,
                            legalbet_url: e.target.value,
                          }))
                        }
                        ref={legalbetInputRef}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveLegalbetUrl();
                          }
                        }}
                        className="border rounded p-1 text-sm flex-1"
                        placeholder="Введите URL"
                      />
                      <button
                        onClick={handleSaveLegalbetUrl}
                        disabled={isLoading}
                        className="bg-teal-500 hover:bg-teal-600 text-white py-1 px-3 rounded text-sm"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Основная информация */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-sm text-gray-500">Букмекер</p>
                  <p className="font-medium">{bonus?.bookmaker}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Сумма</p>
                  <p className="font-medium">{bonus?.amount}</p>
                </div>

                {bonus?.min_coefficient && (
                  <div>
                    <p className="text-sm text-gray-500">Мин. коэффициент</p>
                    <p className="font-medium">{bonus?.min_coefficient}</p>
                  </div>
                )}

                {bonus?.min_deposit && (
                  <div>
                    <p className="text-sm text-gray-500">Мин. депозит</p>
                    <p className="font-medium">{bonus?.min_deposit}</p>
                  </div>
                )}
              </div>
              {/* Дата изменения условий - кликабельная */}
              <div
                className="flex items-center mt-3 p-2 bg-teal-50 rounded-md cursor-pointer hover:bg-teal-100"
                aria-label="Scroll to terms"
              >
                <Calendar className="w-4 h-4 mr-2 text-teal-500" />
                <p className="text-sm">
                  Условия обновлены:{" "}
                  <span className="font-medium">
                    {bonus?.terms_update_date?.split("T")[0] || "No data"}
                  </span>
                </p>
              </div>
              {/* Управление бонусом (moved here) */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Дата истечения
                  </label>
                  <input
                    type="date"
                    defaultValue={
                      bonus?.expiration_date ||
                      plusYear.toISOString().split("T")[0]
                    }
                    className={`w-full border rounded-md p-1 text-sm border \
                      ${
                        bonusFormData.expiration_date === ""
                          ? "bg-gray-100 text-gray-400"
                          : ""
                      }
                      ${
                        bonusFormData.expiration_date !== "" &&
                        bonusFormData.expiration_date !== null &&
                        bonusFormData.expiration_date <= today
                          ? "bg-red-100"
                          : ""
                      }
                      focus:border-[#3591FD] focus:ring-2 focus:ring-[#3591FD] caret-[#3591FD]`}
                    onChange={(e) =>
                      setBonusFormData({
                        ...bonusFormData,
                        expiration_date: e.target.value,
                      })
                    }
                  />
                </div>
                {/* Тип бонуса */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Тип бонуса
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="bonus_type"
                        value="Welcome"
                        checked={bonusFormData.bonus_type === "Welcome"}
                        className="mr-1"
                        onChange={() =>
                          setBonusFormData({
                            ...bonusFormData,
                            bonus_type: "Welcome",
                          })
                        }
                      />
                      <span className="text-sm">Welcome</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="bonus_type"
                        value="Common"
                        className="mr-1"
                        checked={bonusFormData.bonus_type === "Common"}
                        onChange={() =>
                          setBonusFormData({
                            ...bonusFormData,
                            bonus_type: "Common",
                          })
                        }
                      />
                      <span className="text-sm">Common</span>
                    </label>
                  </div>
                </div>
              </div>
              {/* Save Changes button moved here */}
              <div className="pt-6">
                <button
                  title={
                    isLogged
                      ? "Save changes"
                      : "Saving is not available. Please login first"
                  }
                  className={`w-full px-4 py-3 text-white font-medium rounded ${
                    !termsChanged && !paramsChanged
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  } ${
                    !isLogged
                      ? "bg-gray-200 cursor-not-allowed hover:bg-gray-200"
                      : ""
                  }`}
                  onClick={() => handleSaveData(bonusFormData)}
                  disabled={(!termsChanged && !paramsChanged) || !isLogged}
                >
                  {isLoading ? <Spinner /> : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
          {/* 2. Блок "Условия и ограничения" */}
          <div
            className="mb-4 border rounded-lg overflow-hidden"
            id="terms-block"
          >
            <div className="p-3 bg-gray-50">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() =>
                  setBlocksOpened((prevState) => ({
                    ...prevState,
                    terms: !prevState.terms,
                  }))
                }
              >
                <h4 className="font-medium">Тексты бонуса</h4>
                {blocksOpened.terms ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div className="mt-2 text-sm">
                <div className="flex items-center text-teal-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>
                    Последнее обновление: {bonus?.updated_at?.split("T")[0]}
                  </span>
                </div>
                {/* <p className="mt-1 text-gray-700">
                  {bonus.terms.diff_summary?.[0]}
                </p> */}
              </div>
            </div>
            <div className={blocksOpened.terms ? "p-4 visible" : "p-4 hidden"}>
              {/* <h4 className="font-medium">Тексты бонуса</h4> */}
              <div className="flex border-b mt-3">
                <button
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    activeTextsTab === "struct"
                      ? "text-teal-600 border-b-2 border-teal-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTextsTab("struct")}
                >
                  Structured Terms
                </button>
                <button
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    activeTextsTab === "changes"
                      ? "text-teal-600 border-b-2 border-teal-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTextsTab("changes")}
                >
                  Changes
                </button>
                <button
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    activeTextsTab === "tc"
                      ? "text-teal-600 border-b-2 border-teal-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTextsTab("tc")}
                >
                  Raw T&C
                </button>
                <button
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    activeTextsTab === "legalbet"
                      ? "text-teal-600 border-b-2 border-teal-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTextsTab("legalbet")}
                >
                  Legalbet-like bonus
                </button>
                <button
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    activeTextsTab === "rus"
                      ? "text-teal-600 border-b-2 border-teal-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTextsTab("rus")}
                >
                  RUS Translation
                </button>
              </div>
              <div className="p-4">
                {activeTextsTab === "tc" && (
                  <div className="relative">
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Raw T&C
                        </label>
                        <button
                          className="flex items-center text-[#3591FD] text-sm font-medium p-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:outline-none active:ring-0 active:border-none"
                          onClick={() => handleCopy(bonusFormData.tc, "tc")}
                          tabIndex={0}
                        >
                          {copiedTab === "tc" ? (
                            <Check className="w-4 h-4 mr-1" color="#3591FD" />
                          ) : (
                            <Copy className="w-4 h-4 mr-1" color="#3591FD" />
                          )}
                        </button>
                      </div>
                      <textarea
                        className="w-full border rounded-md p-2 text-sm resize-none overflow-hidden"
                        value={bonusFormData.tc}
                        onChange={(e) => {
                          setBonusFormData((prevState) => ({
                            ...prevState,
                            tc: e.target.value,
                          }));
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        style={{ minHeight: 'auto' }}
                      />
                    </div>
                  </div>
                )}
                {activeTextsTab === "rus" && (
                  <div className="relative">
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Русский перевод
                        </label>
                        <button
                          className="flex items-center text-[#3591FD] text-sm font-medium p-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:outline-none active:ring-0 active:border-none"
                          onClick={() =>
                            handleCopy(
                              convertTranslationToHTML(
                                bonusFormData.rus_translation
                              ),
                              "rus"
                            )
                          }
                          tabIndex={0}
                        >
                          {copiedTab === "rus" ? (
                            <Check className="w-4 h-4 mr-1" color="#3591FD" />
                          ) : (
                            <Copy className="w-4 h-4 mr-1" color="#3591FD" />
                          )}
                        </button>
                      </div>
                      <textarea
                        className="w-full border rounded-md p-2 text-sm resize-none overflow-hidden"
                        readOnly
                        value={convertTranslationToHTML(
                          bonusFormData.rus_translation
                        )}
                        style={{ 
                          minHeight: 'auto',
                          height: 'auto'
                        }}
                        ref={(textarea) => {
                          if (textarea) {
                            textarea.style.height = 'auto';
                            textarea.style.height = textarea.scrollHeight + 'px';
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                {activeTextsTab === "struct" && (
                  <div className="relative">
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Structured Terms
                        </label>
                        <button
                          className="flex items-center text-[#3591FD] text-sm font-medium p-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:outline-none active:ring-0 active:border-none"
                          onClick={() =>
                            handleCopy(
                              convertTermsToTextList(bonus.terms),
                              "struct"
                            )
                          }
                          tabIndex={0}
                        >
                          {copiedTab === "struct" ? (
                            <Check className="w-4 h-4 mr-1" color="#3591FD" />
                          ) : (
                            <Copy className="w-4 h-4 mr-1" color="#3591FD" />
                          )}
                        </button>
                      </div>
                      <div className="border p-2 mb-2 border-gray-400 flex flex-col bg-white rounded-[10px]">
                        <h3 className="font-semibold">ОСНОВЫ</h3>
                        <br />
                        <p className="pb-1">{`${bonusFormData.terms?.bookmaker_name} >> ${bonusFormData.terms?.bonus_name} >> ${bonusFormData.terms?.bonus_amount}`}</p>
                        {bonusFormData.terms?.promotion_essence && (
                          <p className="pb-1">
                            <span className="font-semibold">Offer Essence</span>
                            :{" "}
                            {
                              bonusFormData.terms.promotion_essence
                                .replace("CHANGES:", "")
                                .split("#_")[0]
                            }
                          </p>
                        )}
                        {bonusFormData.terms?.is_welcome && (
                          <p className="pb-1">
                            <span className="font-semibold">Is Welcome</span>:{" "}
                            {bonusFormData.terms.is_welcome}
                          </p>
                        )}
                        {bonusFormData.terms?.reward_type && (
                          <p className="pb-1">
                            <span className="font-semibold">Reward Type</span>:{" "}
                            {bonusFormData.terms.reward_type}
                          </p>
                        )}
                      </div>
                    </div>
                    {bonus?.terms?.bonus_steps ? (
                      <div className="border p-2 mb-2 border-gray-400 flex flex-col bg-white rounded-[10px]">
                        <h3 className="font-semibold">БОНУСНЫЕ ШАГИ</h3> <br />
                        <ul className="list-disc pl-5">
                          {bonus?.terms?.bonus_steps.map((item, index) => (
                            <li className="pb-1" key={index}>
                              {typeof item === "string" ? (
                                item
                              ) : (
                                <>
                                  {item.header && (
                                    <span className="font-semibold">
                                      {item.header}:{" "}
                                    </span>
                                  )}
                                  {item.text &&
                                    item.text.replace(/<[^>]+>/g, "")}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="border p-2 mb-2 border-gray-400 flex flex-col bg-white rounded-[10px]">
                      {" "}
                      <h3 className="font-semibold">ДЕТАЛИ СТАВОК</h3> <br />
                      {bonusFormData.terms?.bet_details?.type_of_bet && (
                        <p className="pb-1">
                          <span className="font-semibold">Type of Bet</span>:{" "}
                          {bonusFormData.terms.bet_details.type_of_bet}
                        </p>
                      )}
                      {bonusFormData.terms?.bet_details?.required_odds && (
                        <p className="pb-1">
                          <span className="font-semibold">Required Odds</span>:{" "}
                          {bonusFormData.terms.bet_details.required_odds}
                        </p>
                      )}
                      {bonusFormData.terms?.bet_details?.betting_timeframe && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Betting Timeframe
                          </span>
                          : {bonusFormData.terms.bet_details.betting_timeframe}
                        </p>
                      )}
                      {bonusFormData.terms?.bet_details
                        ?.maximum_qualifying_bet && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Maximum Qualifying Bet
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bet_details
                              .maximum_qualifying_bet
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.bet_details
                        ?.minimum_qualifying_bet && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Minimum Qualifying Bet
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bet_details
                              .minimum_qualifying_bet
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.bet_details
                        ?.sports_specific_restrictions && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Sports Restrictions
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bet_details
                              .sports_specific_restrictions
                          }
                        </p>
                      )}
                    </div>
                    <div className="border p-2 mb-2 border-gray-400 flex flex-col bg-white rounded-[10px]">
                      <h3 className="font-semibold">УСЛОВИЯ ОТЫГРЫША</h3> <br />
                      {bonusFormData.terms?.bonus_playthrough_requirements
                        ?.wagering_requirements && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Wagering Requirements
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .wagering_requirements
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.bonus_playthrough_requirements
                        ?.duration_to_meet_requirements && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Time to Meet Requirements
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .duration_to_meet_requirements
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.bonus_playthrough_requirements
                        ?.sports_events_allowed && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Allowed Sports Events
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .sports_events_allowed
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.bonus_playthrough_requirements
                        ?.types_of_bets_allowed && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Types of Bets Allowed
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .types_of_bets_allowed
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.bonus_playthrough_requirements
                        ?.types_of_bets_counted && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Types of Bets Counted
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .types_of_bets_counted
                          }
                        </p>
                      )}
                      {(bonusFormData.terms?.bonus_playthrough_requirements
                        ?.types_of_bets_to_get_freebet ||
                        bonusFormData.terms?.bonus_playthrough_requirements
                          ?.qualifying_bet_types) && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Qualifying Bet Types
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .types_of_bets_to_get_freebet
                          }
                          {bonusFormData.terms.bonus_playthrough_requirements
                            .types_of_bets_to_get_freebet &&
                            bonusFormData.terms.bonus_playthrough_requirements
                              .qualifying_bet_types &&
                            " | "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .qualifying_bet_types
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.bonus_playthrough_requirements
                        ?.types_of_bets_to_use_freebet && (
                        <p className="pb-1">
                          <span className="font-semibold">Free Bet Usage</span>:{" "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .types_of_bets_to_use_freebet
                          }
                        </p>
                      )}
                      {(bonusFormData.terms?.bonus_playthrough_requirements
                        ?.withdrawable_winnings ||
                        bonusFormData.terms?.bonus_playthrough_requirements
                          ?.withdrawable_winnings_cap) && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Withdrawable Winnings
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .withdrawable_winnings
                          }
                          {bonusFormData.terms.bonus_playthrough_requirements
                            .withdrawable_winnings &&
                            bonusFormData.terms.bonus_playthrough_requirements
                              .withdrawable_winnings_cap &&
                            " | "}
                          {
                            bonusFormData.terms.bonus_playthrough_requirements
                              .withdrawable_winnings_cap
                          }
                        </p>
                      )}
                    </div>
                    <div className="border p-2 mb-2 border-gray-400 flex flex-col bg-white rounded-[10px]">
                      <h3 className="font-semibold">
                        ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ
                      </h3>
                      <br />
                      {bonusFormData.terms?.deposit_requirements && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Deposit Requirements
                          </span>
                          : {bonusFormData.terms.deposit_requirements}
                        </p>
                      )}
                      {bonusFormData.terms?.bonus_expiration_date &&
                        typeof bonusFormData.terms.bonus_expiration_date ===
                          "string" &&
                        bonusFormData.terms.bonus_expiration_date.trim() !==
                          "" && (
                          <p className="pb-1">
                            <span className="font-semibold">
                              Bonus Expiration
                            </span>
                            : {bonusFormData.terms.bonus_expiration_date}
                          </p>
                        )}
                      {bonusFormData.terms?.additional_metrics
                        ?.exclusivity_of_bonus && (
                        <p className="pb-1">
                          <span className="font-semibold">Exclusivity</span>:{" "}
                          {
                            bonusFormData.terms.additional_metrics
                              .exclusivity_of_bonus
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.additional_metrics
                        ?.deposit_requirement && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Deposit Requirement
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.additional_metrics
                              .deposit_requirement
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.additional_metrics
                        ?.bonus_amount_type && (
                        <p className="pb-1">
                          <span className="font-semibold">
                            Bonus Amount Type
                          </span>
                          :{" "}
                          {
                            bonusFormData.terms.additional_metrics
                              .bonus_amount_type
                          }
                        </p>
                      )}
                      {bonusFormData.terms?.other_details &&
                        bonusFormData.terms.other_details.length > 0 && (
                          <>
                            <span className="font-semibold pb-1">
                              Other details:
                            </span>
                            <ul className="list-disc pl-5">
                              {bonusFormData.terms.other_details.map(
                                (item, index) => (
                                  <li key={index}>{item}</li>
                                )
                              )}
                            </ul>
                          </>
                        )}
                    </div>
                  </div>
                )}
                {activeTextsTab === "legalbet" && (
                  <div className="relative">
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Legalbet-like Format
                        </label>
                        <button
                          className="flex items-center text-[#3591FD] text-sm font-medium p-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none active:outline-none active:ring-0 active:border-none"
                          onClick={() =>
                            handleCopy(
                              convertTranslationToHTML(bonus.texts),
                              "legalbet"
                            )
                          }
                          tabIndex={0}
                        >
                          {copiedTab === "legalbet" ? (
                            <Check className="w-4 h-4 mr-1" color="#3591FD" />
                          ) : (
                            <Copy className="w-4 h-4 mr-1" color="#3591FD" />
                          )}
                        </button>
                      </div>
                      <textarea
                        className="w-full border rounded-md p-2 text-sm resize-none overflow-hidden"
                        readOnly
                        value={convertTranslationToHTML(bonus.texts)}
                        style={{ 
                          minHeight: 'auto',
                          height: 'auto'
                        }}
                        ref={(textarea) => {
                          if (textarea) {
                            textarea.style.height = 'auto';
                            textarea.style.height = textarea.scrollHeight + 'px';
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
                {activeTextsTab === "changes" && (
                  <div>
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        История изменений условий
                      </h5>
                      <div className="border rounded p-3 bg-gray-50">
                        <div className="mb-2">
                          <p className="text-sm text-gray-500">
                            Последнее обновление:
                          </p>
                          <p className="font-medium">
                            {bonus?.terms_update_date?.split("T")[0] ||
                              "No data"}
                          </p>
                        </div>
                        {/* <p className="text-sm">
                          {bonus?.terms?.diff_summary?.[0] ||
                            "Нет данных об изменениях"}
                        </p> */}
                        {bonus.terms_history?.slice(0, 3).map((item, index) => (
                          <div
                            key={index}
                            className={`border p-2 mb-2 border-gray-400 flex flex-col bg-white rounded-[10px] ${
                              item.terms_diff?.changes_level &&
                              item.terms_diff?.changes_level.includes("major")
                                ? "bg-yellow-100"
                                : ""
                            }`}
                          >
                            <p className="mb-2 text-gray-500 text-sm font-semibold">
                              Дата: {item.created_at.split("T")[0]}
                            </p>

                            {item.terms_diff.changed
                              ? item.terms_diff.changes.map((item, index) => (
                                  <p className="mb-5" key={index}>
                                    {item}
                                    <br />
                                  </p>
                                ))
                              : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    {bonus?.terms?.history &&
                      bonus.terms.history.length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">
                            Предыдущие изменения условий
                          </h6>
                          <div className="space-y-3">
                            {bonus.terms.history.map((item, index) => (
                              <div
                                key={index}
                                className="border rounded p-2 text-sm"
                              >
                                <p className="text-gray-500">
                                  Дата:{" "}
                                  {new Date(item.date).toLocaleDateString()}
                                </p>
                                <p>{item.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        История изменений статуса
                      </h5>
                      {bonus?.status_history &&
                      bonus.status_history.length > 0 ? (
                        <div className="space-y-3">
                          {bonus.status_history.map((item, index) => (
                            <div
                              key={index}
                              className="border rounded p-2 text-sm"
                            >
                              <p className="text-gray-500">
                                Дата: {new Date(item.date).toLocaleDateString()}
                              </p>
                              <p>
                                Изменение: {item.from} → {item.to}
                              </p>
                              {item.reason && <p>Причина: {item.reason}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Нет данных об изменениях статуса
                        </p>
                      )}
                    </div> */}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* <button onClick={() => setAccessToken("")}>CLEAR ACCESS TOKEN</button>
        <button onClick={() => setRefreshToken("")}>CLEAR REFRESH TOKEN</button> */}
      </div>
    </div>,
    document.body
  );
};

export default DetailsModal;
