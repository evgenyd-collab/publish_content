# Atoms Rules

Atoms - базовые неделимые компоненты пользовательского интерфейса.
Самый низкий уровень в иерархии атомарного дизайна.

# Structure
Основная директория для работы: `src/components/atoms`.
`add-bonus-button/` - кнопка добавления нового бонуса.
    `AddBonusButton` - компонент кнопки для открытия модала создания бонуса.
        Принимает onClick callback для обработки клика.
        Стилизована как основная кнопка действия.
        Содержит иконку "плюс" и текст.
`flags-indicator/` - индикатор статуса ручных флагов.
    `FlagsIndicator` - компонент для отображения manual flags.
        Принимает объект флагов (manual_url, manual_type, manual_terms, manual_expiration).
        Отображает цветные индикаторы для каждого флага.
        Показывает количество активных флагов.
`icon-button/` - универсальная кнопка с иконкой.
    `IconButton` - переиспользуемый компонент кнопки с иконкой.
        Принимает icon (React элемент), onClick, disabled, size.
        Поддерживает разные размеры (small, medium, large).
        Автоматически обрабатывает состояние disabled.
`spinner/` - индикатор загрузки.
    `Spinner` - компонент индикатора загрузки.
        Принимает size (small, medium, large), color.
        Автоматически центрируется в контейнере.
        Анимированный CSS спиннер.
`table-head/` - заголовок таблицы с сортировкой.
    `TableHead` - компонент заголовка таблицы.
        Принимает columns (массив колонок), sortConfig, onSort.
        Отображает стрелки сортировки.
        Обрабатывает клики для изменения сортировки.

# Atomic Design Principles

## Characteristics of Atoms
- **Неделимые**: Не содержат других компонентов
- **Переиспользуемые**: Могут использоваться в разных контекстах
- **Простые**: Минимальная бизнес-логика
- **Независимые**: Не зависят от внешнего состояния
- **Стилизованные**: Имеют базовые стили

## Design Guidelines
- Фокус на одной функции
- Минимальный набор props
- Четкие названия props
- Обработка edge cases
- Доступность (accessibility)

# Component Specifications

## AddBonusButton
```jsx
const AddBonusButton = ({ onClick, disabled = false }) => {
  return (
    <button 
      className="add-bonus-button"
      onClick={onClick}
      disabled={disabled}
    >
      <PlusIcon />
      Add Bonus
    </button>
  );
};
```

**Props:**
- `onClick` - функция обработки клика
- `disabled` - состояние блокировки кнопки

**Usage:**
```jsx
<AddBonusButton onClick={() => setModalOpen(true)} />
```

## FlagsIndicator
```jsx
const FlagsIndicator = ({ flags }) => {
  const activeFlags = Object.values(flags).filter(Boolean).length;
  
  return (
    <div className="flags-indicator">
      {Object.entries(flags).map(([key, value]) => (
        <span 
          key={key}
          className={`flag ${value ? 'active' : 'inactive'}`}
        />
      ))}
      <span className="count">{activeFlags}</span>
    </div>
  );
};
```

**Props:**
- `flags` - объект с флагами (manual_url, manual_type, manual_terms, manual_expiration)

**Usage:**
```jsx
<FlagsIndicator flags={{
  manual_url: true,
  manual_type: false,
  manual_terms: true,
  manual_expiration: false
}} />
```

## IconButton
```jsx
const IconButton = ({ 
  icon, 
  onClick, 
  disabled = false, 
  size = 'medium',
  ariaLabel 
}) => {
  return (
    <button
      className={`icon-button ${size}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  );
};
```

**Props:**
- `icon` - React элемент иконки
- `onClick` - функция обработки клика
- `disabled` - состояние блокировки
- `size` - размер кнопки (small, medium, large)
- `ariaLabel` - метка для accessibility

**Usage:**
```jsx
<IconButton 
  icon={<EditIcon />}
  onClick={handleEdit}
  size="small"
  ariaLabel="Edit item"
/>
```

## Spinner
```jsx
const Spinner = ({ size = 'medium', color = 'primary' }) => {
  return (
    <div className={`spinner ${size} ${color}`}>
      <div className="spinner-circle" />
    </div>
  );
};
```

**Props:**
- `size` - размер спиннера (small, medium, large)
- `color` - цвет спиннера (primary, secondary, white)

**Usage:**
```jsx
<Spinner size="large" color="primary" />
```

## TableHead
```jsx
const TableHead = ({ columns, sortConfig, onSort }) => {
  const handleSort = (field) => {
    const direction = sortConfig.field === field && sortConfig.direction === 'asc' 
      ? 'desc' 
      : 'asc';
    onSort({ field, direction });
  };

  return (
    <thead>
      <tr>
        {columns.map(column => (
          <th 
            key={column.field}
            onClick={() => column.sortable && handleSort(column.field)}
            className={column.sortable ? 'sortable' : ''}
          >
            {column.label}
            {column.sortable && sortConfig.field === column.field && (
              <SortIcon direction={sortConfig.direction} />
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
};
```

**Props:**
- `columns` - массив объектов колонок с полями field, label, sortable
- `sortConfig` - текущая конфигурация сортировки
- `onSort` - функция обработки изменения сортировки

**Usage:**
```jsx
<TableHead 
  columns={[
    { field: 'name', label: 'Name', sortable: true },
    { field: 'date', label: 'Date', sortable: true },
    { field: 'actions', label: 'Actions', sortable: false }
  ]}
  sortConfig={{ field: 'name', direction: 'asc' }}
  onSort={handleSort}
/>
```

# Development Guidelines

## Component Creation
1. Создать директорию с именем компонента в kebab-case
2. Создать index.jsx файл с компонентом
3. Экспортировать компонент по умолчанию
4. Добавить базовые стили если нужно

## Props Design
- Минимальный набор props
- Четкие и понятные названия
- Default значения для опциональных props
- Деструктуризация в параметрах функции

## Styling
- CSS классы с префиксом имени компонента
- Модификаторы через дополнительные классы
- Поддержка темизации через CSS переменные
- Responsive дизайн где необходимо

## Accessibility
- Семантические HTML элементы
- ARIA атрибуты где необходимо
- Поддержка клавиатурной навигации
- Контрастные цвета

## Testing
- Тестирование рендеринга
- Тестирование props
- Тестирование пользовательских взаимодействий
- Тестирование accessibility