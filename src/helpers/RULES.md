# Helpers Rules

Helpers - вспомогательные функции, константы и утилиты для приложения.
Содержит переиспользуемую логику и конфигурацию.

# Structure
Основная директория для работы: `src/helpers`.
`constants.js` - константы и конфигурация приложения.
    Экспортирует основные константы:
        `locales` - массив доступных локалей (UK, ES, BR, CO, RS, MX).
        `fields` - строка полей для API запросов бонусов.
        `bonusListInitial` - начальные данные для списка бонусов.
        `statuses` - доступные статусы бонусов.
        `manualFlags` - конфигурация ручных флагов.
        `notionLinks` - ссылки на документацию Notion.
        `today` - текущая дата в формате ISO.
        `plusYear` - дата через год от текущей.
        `normalizeDate` - функция нормализации дат.
`bonus-convert.js` - функции конвертации данных бонусов.
    Содержит утилиты для преобразования данных бонусов:
        Конвертация между форматами API и UI.
        Нормализация данных бонусов.
        Обработка специальных полей.
`terms-convert.js` - функции конвертации условий бонусов.
    Содержит логику для работы с terms:
        Парсинг JSON строк условий.
        Конвертация между форматами.
        Валидация структуры условий.
`getStatusBadge.jsx` - компонент для отображения статусов.
    `getStatusBadge` - функция возвращающая JSX для статуса.
        Принимает status строку.
        Возвращает стилизованный badge компонент.
        Поддерживает различные статусы (new, active, expired, etc.).
`redirect-if-server-page.js` - логика редиректов для серверных страниц.
    `RedirectIfServerPage` - компонент для обработки редиректов.
        Проверяет URL на серверные пути.
        Выполняет редирект при необходимости.
        Обрабатывает специальные случаи роутинга.

# Helper Categories

## Constants and Configuration
Централизованное хранение конфигурации приложения.

### Locales Configuration
```javascript
export const locales = [
  { value: "", label: "Select Locale" },
  { value: "UK", label: "UK" },
  { value: "ES", label: "Spain" },
  { value: "BR", label: "Brazil" },
  { value: "CO", label: "Colombia" },
  { value: "RS", label: "Serbia" },
  { value: "MX", label: "Mexico" }
];
```

### API Fields Configuration
```javascript
export const fields = 
  "id,name,bookmaker,bonus_type,bonus_age,expiration_status," +
  "override_manual_url,override_manual_type,override_manual_terms," +
  "override_manual_expiration,expiration_date,url,terms," +
  "min_coefficient,min_deposit,terms_update_date,updated_at," +
  "terms_history,bookmaker_id";
```

### Status Configuration
```javascript
export const statuses = [
  { value: "new", label: "New", color: "blue" },
  { value: "active", label: "Active", color: "green" },
  { value: "expired", label: "Expired", color: "red" },
  { value: "need_manual_check", label: "Need Manual Check", color: "orange" }
];
```

### Manual Flags Configuration
```javascript
export const manualFlags = {
  manual_url: { label: "Manual URL", description: "URL requires manual verification" },
  manual_type: { label: "Manual Type", description: "Bonus type needs manual check" },
  manual_terms: { label: "Manual Terms", description: "Terms require manual review" },
  manual_expiration: { label: "Manual Expiration", description: "Expiration date needs verification" }
};
```

## Data Conversion Utilities

### Bonus Data Conversion
```javascript
// bonus-convert.js
export const convertBonusForAPI = (bonus) => {
  return {
    ...bonus,
    terms: typeof bonus.terms === 'object' 
      ? JSON.stringify(bonus.terms) 
      : bonus.terms,
    expiration_date: normalizeDate(bonus.expiration_date)
  };
};

export const convertBonusFromAPI = (bonus) => {
  return {
    ...bonus,
    terms: typeof bonus.terms === 'string' 
      ? JSON.parse(bonus.terms) 
      : bonus.terms,
    expiration_date: new Date(bonus.expiration_date)
  };
};

export const normalizeBonusData = (bonus) => {
  return {
    id: bonus.id,
    name: bonus.name || '',
    bonus_type: bonus.bonus_type || '',
    expiration_status: bonus.expiration_status || 'new',
    expiration_date: bonus.expiration_date || null,
    url: bonus.url || '',
    terms: bonus.terms || '{}',
    min_deposit: bonus.min_deposit || 0,
    min_coefficient: bonus.min_coefficient || 1.0,
    override_manual_url: bonus.override_manual_url || false,
    override_manual_type: bonus.override_manual_type || false,
    override_manual_terms: bonus.override_manual_terms || false,
    override_manual_expiration: bonus.override_manual_expiration || false
  };
};
```

### Terms Conversion
```javascript
// terms-convert.js
export const parseTerms = (termsString) => {
  try {
    return typeof termsString === 'string' 
      ? JSON.parse(termsString) 
      : termsString;
  } catch (error) {
    console.error('Error parsing terms:', error);
    return {};
  }
};

export const stringifyTerms = (termsObject) => {
  try {
    return typeof termsObject === 'object' 
      ? JSON.stringify(termsObject, null, 2) 
      : termsObject;
  } catch (error) {
    console.error('Error stringifying terms:', error);
    return '{}';
  }
};

export const validateTermsStructure = (terms) => {
  const parsed = parseTerms(terms);
  
  return {
    isValid: typeof parsed === 'object' && parsed !== null,
    hasPromotion: !!parsed.promotion_essence,
    hasDomain: !!parsed.domain,
    domain: parsed.domain || 'sport' // default to sport
  };
};

export const getTermsDomain = (terms) => {
  const parsed = parseTerms(terms);
  return parsed.domain || 'sport';
};
```

## UI Helper Components

### Status Badge Component
```javascript
// getStatusBadge.jsx
import React from 'react';

export const getStatusBadge = (status) => {
  const statusConfig = {
    new: { label: 'New', className: 'status-new', color: '#007bff' },
    active: { label: 'Active', className: 'status-active', color: '#28a745' },
    expired: { label: 'Expired', className: 'status-expired', color: '#dc3545' },
    need_manual_check: { 
      label: 'Manual Check', 
      className: 'status-manual', 
      color: '#ffc107' 
    }
  };

  const config = statusConfig[status] || statusConfig.new;

  return (
    <span 
      className={`status-badge ${config.className}`}
      style={{ 
        backgroundColor: config.color,
        color: 'white',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}
    >
      {config.label}
    </span>
  );
};

export default getStatusBadge;
```

## Navigation and Routing Helpers

### Redirect Logic
```javascript
// redirect-if-server-page.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RedirectIfServerPage = () => {
  const location = useLocation();

  useEffect(() => {
    const serverPaths = ['/api/', '/admin/', '/server/'];
    const currentPath = location.pathname;

    // Check if current path is a server-side route
    const isServerPath = serverPaths.some(path => 
      currentPath.startsWith(path)
    );

    if (isServerPath) {
      // Redirect to appropriate client route
      const redirectPath = getClientRedirectPath(currentPath);
      window.location.href = redirectPath;
    }
  }, [location]);

  return null;
};

const getClientRedirectPath = (serverPath) => {
  if (serverPath.startsWith('/api/bonuses/')) {
    const bonusId = serverPath.split('/').pop();
    return `/bonuses/${bonusId}`;
  }
  
  if (serverPath.startsWith('/api/bookmakers/')) {
    return '/bookmakers';
  }

  return '/'; // Default redirect
};

export default RedirectIfServerPage;
```

# Date and Time Utilities

## Date Normalization
```javascript
export const normalizeDate = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

export const today = new Date().toISOString().split("T")[0];

export const plusYear = new Date(
  new Date().getFullYear() + 1,
  new Date().getMonth(),
  new Date().getDate()
);

export const formatDateForDisplay = (date) => {
  if (!date) return 'No date';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const isDateExpired = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

export const getDaysUntilExpiration = (date) => {
  if (!date) return null;
  
  const expirationDate = new Date(date);
  const today = new Date();
  const diffTime = expirationDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};
```

# Usage Guidelines

## Import Patterns
```javascript
// Named imports for specific utilities
import { locales, statuses, normalizeDate } from './helpers/constants';
import { parseTerms, getTermsDomain } from './helpers/terms-convert';
import { convertBonusForAPI } from './helpers/bonus-convert';

// Default import for components
import getStatusBadge from './helpers/getStatusBadge';
import RedirectIfServerPage from './helpers/redirect-if-server-page';
```

## Best Practices
- Централизованное хранение констант
- Переиспользуемые функции конвертации
- Обработка ошибок в утилитах
- Документирование сложной логики
- Тестирование критических функций

## Error Handling
```javascript
export const safeParseJSON = (jsonString, fallback = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing error:', error);
    return fallback;
  }
};

export const safeApiCall = async (apiFunction, fallback = null) => {
  try {
    return await apiFunction();
  } catch (error) {
    console.error('API call error:', error);
    return fallback;
  }
};
```

# Testing Guidelines

## Helper Function Testing
```javascript
describe('terms-convert', () => {
  describe('parseTerms', () => {
    it('should parse valid JSON string', () => {
      const result = parseTerms('{"domain": "sport"}');
      expect(result).toEqual({ domain: 'sport' });
    });

    it('should return empty object for invalid JSON', () => {
      const result = parseTerms('invalid json');
      expect(result).toEqual({});
    });

    it('should return object as-is if already parsed', () => {
      const input = { domain: 'casino' };
      const result = parseTerms(input);
      expect(result).toEqual(input);
    });
  });
});
```