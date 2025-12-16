export const plusYear = new Date(
  new Date().getFullYear() + 1,
  new Date().getMonth(),
  new Date().getDate()
);

export const today = new Date().toISOString().split("T")[0];

export const normalizeDate = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

export const fields =
  "id,name,bookmaker,bonus_type,bonus_age,expiration_status,override_manual_url,override_manual_type,override_manual_terms,override_manual_expiration,expiration_date,url,terms,min_coefficient,min_deposit,terms_update_date,updated_at,terms_history,bookmaker_id,legalcasino_payload,legalbet_url";

// Списки для селекторов
export const locales = [
  { value: "", label: "Select Locale" },
  { value: "UK", label: "UK" },
  { value: "ES", label: "Spain" },
  { value: "BR", label: "Brazil" },
  { value: "CO", label: "Colombia" },
  { value: "RS", label: "Serbia" },
  { value: "MX", label: "Mexico" },
  { value: "RO", label: "Romania" },
];

export const bonusListInitial = [
  {
    id: 1,
    locale: "UK",
    bookmaker: "Bet365",
    name: "Welcome Bonus",
    url: "https://bet365.com/welcome-bonus",
    manual_url: false,
    bonus_type: "welcome", // "welcome" или "common"
    manual_type_override: false,
    raw_text: "Получите 100% на первый депозит до 10000₽",
    sum: "10000₽",
    terms: "Минимальный депозит 1000₽. Отыгрыш х5. Срок действия 30 дней.",
    manual_terms: false,
    expiration_date: "2024-12-31",
    manual_expiration: false,
    expiration_status: "active", // допустимые значения: "new", "active", "expired", "need_manual_check"
    updated_at: "2024-02-07 10:00:00",
    history: [
      { date: "2024-01-01 09:00:00", status: "new" },
      { date: "2024-02-07 10:00:00", status: "active" },
    ],
    hasChanges: false,
    override_manual_expiration: false,
    override_manual_terms: true,
    override_manual_type: false,
    override_manual_url: true,
  },
  {
    id: 2,
    locale: "ES",
    bookmaker: "1xBet",
    name: "Deposit Bonus",
    url: "https://1xbet.es/bonus",
    manual_url: true,
    bonus_type: "common",
    manual_type_override: true,
    raw_text: "Get 50% bonus on your deposit",
    sum: "50%",
    terms: "Minimum deposit €10. Wager x10. Valid for 15 days.",
    manual_terms: true,
    expiration_date: "2024-10-15",
    manual_expiration: false,
    expiration_status: "active",
    updated_at: "2024-01-20 14:30:00",
    history: [{ date: "2024-01-20 14:30:00", status: "active" }],
    hasChanges: false,
    override_manual_expiration: false,
    override_manual_terms: false,
    override_manual_type: true,
    override_manual_url: false,
  },
  {
    id: 5,
    locale: "UK",
    bookmaker: "Bet365",
    name: "Welcome Bonus",
    url: "https://bet365.com/welcome-bonus",
    manual_url: false,
    bonus_type: "welcome", // "welcome" или "common"
    manual_type_override: false,
    raw_text: "Получите 100% на первый депозит до 10000₽",
    sum: "10000₽",
    terms: "Минимальный депозит 1000₽. Отыгрыш х5. Срок действия 30 дней.",
    manual_terms: false,
    expiration_date: "2024-12-31",
    manual_expiration: false,
    expiration_status: "active", // допустимые значения: "new", "active", "expired", "need_manual_check"
    updated_at: "2024-02-07 10:00:00",
    history: [
      { date: "2024-01-01 09:00:00", status: "new" },
      { date: "2024-02-07 10:00:00", status: "active" },
    ],
    hasChanges: false,
    override_manual_expiration: false,
    override_manual_terms: true,
    override_manual_type: true,
    override_manual_url: false,
  },
  {
    id: 4,
    locale: "UK",
    bookmaker: "Bet365",
    name: "Welcome Bonus",
    url: "https://bet365.com/welcome-bonus",
    manual_url: false,
    bonus_type: "welcome", // "welcome" или "common"
    manual_type_override: false,
    raw_text: "Получите 100% на первый депозит до 10000₽",
    sum: "10000₽",
    terms: "Минимальный депозит 1000₽. Отыгрыш х5. Срок действия 30 дней.",
    manual_terms: false,
    expiration_date: "2024-12-31",
    manual_expiration: false,
    expiration_status: "active", // допустимые значения: "new", "active", "expired", "need_manual_check"
    updated_at: "2024-02-07 10:00:00",
    history: [
      { date: "2024-01-01 09:00:00", status: "new" },
      { date: "2024-02-07 10:00:00", status: "active" },
    ],
    hasChanges: false,
    override_manual_expiration: true,
    override_manual_terms: false,
    override_manual_type: false,
    override_manual_url: true,
  },
  {
    id: 5,
    locale: "UK",
    bookmaker: "Bet365",
    name: "Welcome Bonus",
    url: "https://bet365.com/welcome-bonus",
    manual_url: false,
    bonus_type: "welcome", // "welcome" или "common"
    manual_type_override: false,
    raw_text: "Получите 100% на первый депозит до 10000₽",
    sum: "10000₽",
    terms: "Минимальный депозит 1000₽. Отыгрыш х5. Срок действия 30 дней.",
    manual_terms: false,
    expiration_date: "2024-12-31",
    manual_expiration: false,
    expiration_status: "active", // допустимые значения: "new", "active", "expired", "need_manual_check"
    updated_at: "2024-02-07 10:00:00",
    history: [
      { date: "2024-01-01 09:00:00", status: "new" },
      { date: "2024-02-07 10:00:00", status: "active" },
    ],
    hasChanges: false,
    override_manual_expiration: true,
    override_manual_terms: true,
    override_manual_type: false,
    override_manual_url: true,
  },
];

export const statuses = ["new", "active", "need_manual_check"];

export const manualFlags = [
  { key: "manual_url", label: "URL" },
  { key: "manual_type", label: "Bonus Type" },
  { key: "manual_terms", label: "T&C" },
  { key: "manual_expiration", label: "Expiration" },
];

// Добавляю notionLinks в constants.js
export const notionLinks = {
  UK: "https://www.notion.so/legalwiki/aea44e2555b848e4a1b4d9268cd48a6a?v=1de066c96f7480d9ba2e000c05059090&pvs=4",
  ES: "https://www.notion.so/legalwiki/aea44e2555b848e4a1b4d9268cd48a6a?v=1de066c96f7480a5aef6000ca8556c85&pvs=4",
  BR: "https://www.notion.so/legalwiki/aea44e2555b848e4a1b4d9268cd48a6a?v=1de066c96f74807a864a000c5ebe086b&pvs=4",
  CO: "https://www.notion.so/legalwiki/aea44e2555b848e4a1b4d9268cd48a6a?v=1de066c96f748086990d000cd1e9185b&pvs=4",
  RS: "https://www.notion.so/legalwiki/aea44e2555b848e4a1b4d9268cd48a6a?v=1de066c96f7480f1b904000c775ecbd9&pvs=4"
};
