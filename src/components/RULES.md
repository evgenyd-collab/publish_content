# Components Rules

Components - директория компонентов, организованная по принципу атомарного дизайна.
Содержит переиспользуемые UI компоненты разного уровня сложности.

# Structure
Основная директория для работы: `src/components`.
Организация по атомарному дизайну:
- `atoms/` - базовые неделимые компоненты
- `molecules/` - составные компоненты из атомов  
- `modals/` - модальные окна для взаимодействия

## Atoms Directory
`atoms/` - базовые компоненты, не содержащие других компонентов:
- `add-bonus-button/` - кнопка добавления нового бонуса
- `flags-indicator/` - индикатор флагов (manual flags)
- `icon-button/` - универсальная кнопка с иконкой
- `spinner/` - индикатор загрузки
- `table-head/` - заголовок таблицы с сортировкой

## Molecules Directory  
`molecules/` - составные компоненты из атомов:
- `bonus-details-page/` - страница деталей конкретного бонуса
- `bonus-item/` - элемент списка бонусов в таблице
- `pagination/` - компонент пагинации с навигацией

## Modals Directory
`modals/` - модальные окна для различных операций:
- `add-terms-modal.jsx` - модал для добавления/редактирования условий бонуса
- `details-modal.jsx` - модал с детальной информацией
- `manual-flags-edit-modal.jsx` - модал редактирования ручных флагов
- `new-bonus-modal.jsx` - модал создания нового бонуса
- `status-edit-modal.jsx` - модал изменения статуса бонуса

# Component Architecture

## Atomic Design Principles
Следуем принципам атомарного дизайна:

### Atoms (Атомы)
- Самые простые компоненты
- Не содержат других компонентов
- Максимально переиспользуемые
- Минимальная бизнес-логика

### Molecules (Молекулы)
- Состоят из атомов
- Имеют определенную функциональность
- Переиспользуемые в разных контекстах
- Содержат локальную логику

### Modals (Модальные окна)
- Специализированные компоненты
- Содержат сложную логику взаимодействия
- Управляют собственным состоянием
- Интегрируются с API

# Component Guidelines

## File Structure
Каждый компонент в отдельной директории:
```
component-name/
├── index.jsx          # Основной файл компонента
├── styles.css         # Стили (если нужны)
└── README.md          # Документация (опционально)
```

## Component Pattern
```jsx
import React, { useState, useEffect } from 'react';

const ComponentName = ({ prop1, prop2, onAction }) => {
  // Хуки состояния
  const [localState, setLocalState] = useState(initialValue);
  
  // Эффекты
  useEffect(() => {
    // Логика эффекта
  }, [dependencies]);
  
  // Обработчики событий
  const handleEvent = () => {
    // Логика обработки
    onAction?.(data);
  };
  
  // JSX
  return (
    <div className="component-name">
      {/* Контент */}
    </div>
  );
};

export default ComponentName;
```

## Props Guidelines
- Деструктуризация props в параметрах
- Опциональные props с default значениями
- Callback props для взаимодействия с родителем
- Валидация props через PropTypes (рекомендуется)

## State Management
- Локальное состояние для UI логики
- Подъем состояния для общих данных
- Передача callbacks для изменения родительского состояния
- Использование useEffect для синхронизации

# Specific Components

## Atoms

### AddBonusButton
- Кнопка для открытия модала создания бонуса
- Принимает onClick callback
- Стилизована для основного действия

### FlagsIndicator  
- Отображает статус ручных флагов
- Принимает объект флагов
- Показывает цветные индикаторы

### IconButton
- Универсальная кнопка с иконкой
- Принимает icon, onClick, disabled
- Поддерживает разные размеры

### Spinner
- Индикатор загрузки
- Принимает size, color
- Центрируется автоматически

### TableHead
- Заголовок таблицы с сортировкой
- Принимает columns, sortConfig, onSort
- Показывает направление сортировки

## Molecules

### BonusDetailsPage
- Полная страница деталей бонуса
- Загружает данные по ID из URL
- Интегрируется с API
- Показывает историю изменений

### BonusItem
- Строка таблицы с данными бонуса
- Принимает bonus объект
- Обрабатывает клики для деталей
- Показывает иконки доменов (sport/casino)

### Pagination
- Навигация по страницам
- Принимает currentPage, totalPages, onPageChange
- Показывает номера страниц и стрелки

## Modals

### NewBonusModal
- Форма создания нового бонуса
- Валидация полей
- Отправка данных в API
- Обработка ошибок

### StatusEditModal
- Изменение статуса бонуса
- Выбор из предопределенных статусов
- Подтверждение изменений

### ManualFlagsEditModal
- Редактирование ручных флагов
- Чекбоксы для каждого флага
- Сохранение изменений

# Testing Guidelines

## Component Testing
- Тестирование рендеринга
- Тестирование пользовательских взаимодействий
- Мокирование props и callbacks
- Тестирование состояний загрузки и ошибок

## Test Structure
```javascript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Тест рендеринга
  });
  
  it('should handle user interactions', () => {
    // Тест взаимодействий
  });
  
  it('should call callbacks', () => {
    // Тест callbacks
  });
});
```