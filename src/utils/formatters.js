// Date formatting utilities
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// String formatting utilities
export function truncateString(str, length = 20) {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

// Currency formatting
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export const bonusAgeFormat = (isActive, isChecked, isNew) => {
  const data = `${isActive ? "1" : "0"}${isChecked ? "1" : "0"}${
    isNew ? "1" : "0"
  }`;  
  return data;
};