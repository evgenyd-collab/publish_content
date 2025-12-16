export const extractSportFromUrl = (sourceUrl) => {
  if (!sourceUrl) {
    return null;
  }

  try {
    const url = new URL(sourceUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    if (!segments.length) {
      return null;
    }

    return segments[0]?.toLowerCase() || null;
  } catch (error) {
    console.warn("Не удалось определить категорию новости из URL", sourceUrl, error);
    return null;
  }
};

export default extractSportFromUrl;

