export function convertTermsToTextList(termsJson) {
  if (!termsJson) return "";

  // Карта переводов для названий полей
  const translations = {
    Bookmaker: "Bookmaker",
    "Bonus Name": "Bonus Name",
    "Bonus Amount": "Bonus Amount",
    "Offer Essence": "Offer Essence",
    "Deposit Requirements": "Deposit Requirements",
    "Minimum Qualifying Bet": "Minimum Qualifying Bet",
    "Maximum Qualifying Bet": "Maximum Qualifying Bet",
    "Required Odds": "Required Odds",
    "Betting Timeframe": "Betting Timeframe",
    "Type of Bet": "Type of Bet",
    "Sports Restrictions": "Sports Restrictions",
    "Wagering Requirements": "Wagering Requirements",
    "Time to Meet Requirements": "Time to Meet Requirements",
    "Allowed Sports Events": "Allowed Sports Events",
    "Types of Bets Counted": "Types of Bets Counted",
    "Qualifying Bet Types": "Qualifying Bet Types",
    "Free Bet Usage": "Free Bet Usage",
    "Withdrawable Winnings": "Withdrawable Winnings",
    Exclusivity: "Exclusivity",
    "Bonus Expiration": "Bonus Expiration",
    "Deposit Requirement": "Deposit Requirement",
    "Reward Type": "Reward Type",
    "Is Welcome": "Is Welcome",
  };

  let result = [];

  // Вспомогательная функция для добавления записи, если значение не пустое
  const addItem = (label, value) => {
    if (value !== null && value !== undefined && value !== "") {
      result.push(`- ${translations[label] || label}: ${value}`);
    }
  };

  // Определяем, используется ли новый формат (наличие is_welcome и reward_type)
  const newFormat =
    termsJson.hasOwnProperty("is_welcome") &&
    termsJson.hasOwnProperty("reward_type");

  // ---------------------------
  // ОСНОВЫ
  // ---------------------------
  result.push("ОСНОВЫ");

  // Объединяем основные поля: название букмекера, бонуса и суммы
  const basicsParts = [];
  if (termsJson.bookmaker_name) {
    basicsParts.push(termsJson.bookmaker_name);
  }
  if (termsJson.bonus_name) {
    basicsParts.push(termsJson.bonus_name);
  }
  if (termsJson.bonus_amount) {
    basicsParts.push(termsJson.bonus_amount);
  }
  if (basicsParts.length > 0) {
    result.push(basicsParts.join(" >> "));
  }

  // Если используется новый формат, добавляем дополнительные поля
  if (newFormat) {
    addItem("Is Welcome", termsJson.is_welcome);
    addItem("Reward Type", termsJson.reward_type);
  }

  // Добавляем описание акции (если присутствует)
  if (termsJson.promotion_essence) {
    let promoEssence = termsJson.promotion_essence;
    const index = promoEssence.indexOf("#_");
    if (index !== -1) {
      promoEssence = promoEssence.slice(0, index);
    }
    addItem("Offer Essence", promoEssence);
  }

  // ---------------------------
  // ШАГИ К ПОЛУЧЕНИЮ
  // ---------------------------
  // Если новый формат и присутствует поле bonus_steps, выводим его в отдельном блоке
  if (Array.isArray(termsJson.bonus_steps) && termsJson.bonus_steps.length > 0) {
    result.push("ШАГИ К ПОЛУЧЕНИЮ");
    termsJson.bonus_steps.forEach((step) => {
      if (typeof step === "string") {
        result.push(`- ${step}`);
      } else if (step && typeof step === "object") {
        let stepText = "";
        if (step.header) {
          stepText += `${step.header}: `;
        }
        if (step.text) {
          stepText += step.text.replace(/<[^>]+>/g, "");
        }
        if (stepText.trim()) {
          result.push(`- ${stepText.trim()}`);
        }
      }
    });
  }

  // ---------------------------
  // ДЕТАЛИ СТАВОК
  // ---------------------------
  if (termsJson.bet_details) {
    result.push("ДЕТАЛИ СТАВОК");
    const betDetails = termsJson.bet_details;
    addItem("Type of Bet", betDetails.type_of_bet);
    addItem("Required Odds", betDetails.required_odds);
    addItem("Betting Timeframe", betDetails.betting_timeframe);
    addItem("Maximum Qualifying Bet", betDetails.maximum_qualifying_bet);
    addItem("Minimum Qualifying Bet", betDetails.minimum_qualifying_bet);
    addItem("Sports Restrictions", betDetails.sports_specific_restrictions);
  }

  // ---------------------------
  // УСЛОВИЯ ОТЫГРЫША
  // ---------------------------
  if (termsJson.bonus_playthrough_requirements) {
    result.push("УСЛОВИЯ ОТЫГРЫША");
    const playthrough = termsJson.bonus_playthrough_requirements;
    addItem("Wagering Requirements", playthrough.wagering_requirements);
    addItem(
      "Time to Meet Requirements",
      playthrough.duration_to_meet_requirements
    );
    if (playthrough.sports_events_allowed) {
      addItem("Allowed Sports Events", playthrough.sports_events_allowed);
    }
    // В новых данных может быть различная номенклатура для типов ставок:
    if (playthrough.types_of_bets_allowed) {
      addItem("Type of Bet", playthrough.types_of_bets_allowed);
    } else if (playthrough.types_of_bets_counted) {
      addItem("Types of Bets Counted", playthrough.types_of_bets_counted);
    }
    // Обрабатываем дополнительные поля для квалификационных ставок
    addItem(
      "Qualifying Bet Types",
      playthrough.types_of_bets_to_get_freebet ||
        playthrough.qualifying_bet_types
    );
    addItem("Free Bet Usage", playthrough.types_of_bets_to_use_freebet);
    addItem(
      "Withdrawable Winnings",
      playthrough.withdrawable_winnings || playthrough.withdrawable_winnings_cap
    );
  }

  // ---------------------------
  // ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ
  // ---------------------------
  result.push("ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ");
  addItem("Deposit Requirements", termsJson.deposit_requirements);

  // Дата истечения бонуса
  if (
    termsJson.bonus_expiration_date &&
    typeof termsJson.bonus_expiration_date === "string" &&
    termsJson.bonus_expiration_date.trim() !== "" &&
    !termsJson.bonus_expiration_date.includes("NO EXPIRATION DATE FOUND")
  ) {
    addItem("Bonus Expiration", termsJson.bonus_expiration_date);
  }

  // Обработка дополнительных метрик: в новом формате они приходят как additional_rating_metrics,
  // в старом формате — additional_metrics.
  const additionalMetrics =
    termsJson.additional_rating_metrics || termsJson.additional_metrics;
  if (additionalMetrics) {
    addItem("Exclusivity", additionalMetrics.exclusivity_of_bonus);
    addItem("Deposit Requirement", additionalMetrics.deposit_requirement);
    addItem("Wagering Requirements", additionalMetrics.wagering_requirements);
    addItem("Bonus Amount Type", additionalMetrics.bonus_amount_type);
  }

  // Другие детали
  if (termsJson.other_details && Array.isArray(termsJson.other_details)) {
    termsJson.other_details.forEach((detail) => {
      if (detail) {
        result.push(`- ${detail}`);
      }
    });
  }

  // Собираем и возвращаем итоговый текст
  return result.join("\n");
}
