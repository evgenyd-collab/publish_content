# Utils Rules

Utils - утилиты для форматирования и обработки данных.
Содержит чистые функции для трансформации данных.

# Structure
Основная директория для работы: `src/utils`.
`formatters.js` - функции форматирования данных.
    Содержит утилиты для форматирования:
        `bonusAgeFormat` - форматирование возраста бонуса.
        `formatDate` - форматирование дат для отображения.
        `formatCurrency` - форматирование валютных значений.
        `formatPercentage` - форматирование процентных значений.
        `formatNumber` - форматирование числовых значений.
        `formatDuration` - форматирование временных интервалов.

# Utility Categories

## Date and Time Formatters
Функции для работы с датами и временем.

### Bonus Age Formatting
```javascript
export const bonusAgeFormat = (createdDate, updatedDate = null) => {
  const referenceDate = updatedDate || createdDate;
  if (!referenceDate) return 'Unknown';

  const now = new Date();
  const date = new Date(referenceDate);
  const diffMs = now - date;
  
  // Convert to different time units
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Return appropriate format based on age
  if (diffYears > 0) {
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  } else if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  } else if (diffWeeks > 0) {
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};
```

### Date Formatting
```javascript
export const formatDate = (date, options = {}) => {
  if (!date) return 'No date';

  const dateObj = new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  return dateObj.toLocaleDateString('en-US', defaultOptions);
};

export const formatDateTime = (date, options = {}) => {
  if (!date) return 'No date';

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  return dateObj.toLocaleDateString('en-US', defaultOptions);
};

export const formatRelativeDate = (date) => {
  if (!date) return 'No date';

  const now = new Date();
  const dateObj = new Date(date);
  const diffMs = now - dateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays === -1) {
    return 'Tomorrow';
  } else if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < -1 && diffDays > -7) {
    return `In ${Math.abs(diffDays)} days`;
  } else {
    return formatDate(date);
  }
};
```

### Duration Formatting
```javascript
export const formatDuration = (startDate, endDate = null) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid duration';
  }

  const diffMs = Math.abs(end - start);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
};
```

## Numeric Formatters
Функции для форматирования числовых значений.

### Currency Formatting
```javascript
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatCurrencyCompact = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(amount);
};
```

### Percentage Formatting
```javascript
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatPercentageFromDecimal = (decimal, decimals = 1) => {
  if (decimal === null || decimal === undefined || isNaN(decimal)) {
    return 'N/A';
  }

  return `${decimal.toFixed(decimals)}%`;
};
```

### Number Formatting
```javascript
export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined || isNaN(number)) {
    return 'N/A';
  }

  const defaultOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  };

  return new Intl.NumberFormat('en-US', defaultOptions).format(number);
};

export const formatNumberCompact = (number, decimals = 1) => {
  if (number === null || number === undefined || isNaN(number)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: decimals
  }).format(number);
};

export const formatCoefficient = (coefficient) => {
  if (coefficient === null || coefficient === undefined || isNaN(coefficient)) {
    return 'N/A';
  }

  return coefficient.toFixed(2);
};
```

## Text Formatters
Функции для форматирования текстовых данных.

### String Utilities
```javascript
export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
};

export const capitalizeFirst = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const formatCamelCase = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

export const formatSnakeCase = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};
```

### URL Formatting
```javascript
export const formatUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }

  return url;
};

export const extractDomain = (url) => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const urlObj = new URL(formatUrl(url));
    return urlObj.hostname;
  } catch (error) {
    return url;
  }
};

export const shortenUrl = (url, maxLength = 50) => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const domain = extractDomain(url);
  
  if (domain.length <= maxLength) {
    return domain;
  }

  return truncateText(domain, maxLength);
};
```

## Validation Utilities
Функции для валидации данных.

### Data Validation
```javascript
export const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

export const isValidNumber = (value) => {
  return !isNaN(value) && isFinite(value);
};

export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(formatUrl(url));
    return true;
  } catch {
    return false;
  }
};

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

# Usage Guidelines

## Import Patterns
```javascript
// Named imports for specific formatters
import { 
  bonusAgeFormat, 
  formatDate, 
  formatCurrency,
  formatPercentage 
} from '../utils/formatters';

// Use in components
const BonusItem = ({ bonus }) => {
  return (
    <div>
      <span>{formatDate(bonus.created_at)}</span>
      <span>{bonusAgeFormat(bonus.created_at, bonus.updated_at)}</span>
      <span>{formatCurrency(bonus.min_deposit)}</span>
    </div>
  );
};
```

## Best Practices
- Всегда проверять входные данные
- Возвращать fallback значения для невалидных данных
- Использовать Intl API для локализации
- Документировать сложные форматы
- Тестировать edge cases

## Error Handling
```javascript
export const safeFormat = (formatter, value, fallback = 'N/A') => {
  try {
    return formatter(value);
  } catch (error) {
    console.error('Formatting error:', error);
    return fallback;
  }
};

// Usage
const formattedValue = safeFormat(formatCurrency, bonus.amount, '$0.00');
```

# Testing Guidelines

## Formatter Testing
```javascript
describe('formatters', () => {
  describe('bonusAgeFormat', () => {
    it('should format recent dates correctly', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(bonusAgeFormat(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('should handle null dates', () => {
      expect(bonusAgeFormat(null)).toBe('Unknown');
    });

    it('should format old dates correctly', () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      expect(bonusAgeFormat(oneYearAgo)).toBe('1 year ago');
    });
  });

  describe('formatCurrency', () => {
    it('should format valid amounts', () => {
      expect(formatCurrency(100)).toBe('$100');
      expect(formatCurrency(100.50)).toBe('$100.50');
    });

    it('should handle invalid amounts', () => {
      expect(formatCurrency(null)).toBe('N/A');
      expect(formatCurrency(undefined)).toBe('N/A');
      expect(formatCurrency('invalid')).toBe('N/A');
    });
  });
});
```

## Performance Considerations
- Мемоизация для тяжелых вычислений
- Кэширование результатов форматирования
- Оптимизация для больших списков
- Lazy loading для сложных форматов

```javascript
import { useMemo } from 'react';

const BonusList = ({ bonuses }) => {
  const formattedBonuses = useMemo(() => {
    return bonuses.map(bonus => ({
      ...bonus,
      formattedAge: bonusAgeFormat(bonus.created_at),
      formattedAmount: formatCurrency(bonus.min_deposit)
    }));
  }, [bonuses]);

  return (
    <div>
      {formattedBonuses.map(bonus => (
        <BonusItem key={bonus.id} bonus={bonus} />
      ))}
    </div>
  );
};
```