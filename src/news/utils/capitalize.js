export const capitalize = (value) => {
  const str = String(value || "").trim();
  if (!str) {
    return "";
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export default capitalize;

