const JSON_BLOCK_REGEXP = /^```json\s*([\s\S]*?)\s*```$/i;

const removeMarkdownFence = (raw = "") => {
  const trimmed = raw.trim();
  const match = trimmed.match(JSON_BLOCK_REGEXP);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed.replace(/```/g, "").trim();
};

export const extractBodyText = (bodyRaw) => {
  if (!bodyRaw) {
    return "";
  }

  const cleaned = removeMarkdownFence(bodyRaw);

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.news_raw)) {
      return parsed.news_raw
        .map((line) => (typeof line === "string" ? line.trim() : ""))
        .filter(Boolean)
        .join("\n\n");
    }

    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    // Не шумим в консоль для не-JSON входа: это валидный сценарий, просто вернём текст
    return cleaned;
  }
};

export default extractBodyText;

