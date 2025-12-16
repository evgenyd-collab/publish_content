# Molecules Rules

Molecules - составные компоненты, состоящие из атомов и имеющие определенную функциональность.
Второй уровень в иерархии атомарного дизайна.

# Structure
Основная директория для работы: `src/components/molecules`.
`bonus-details-page/` - страница деталей конкретного бонуса.
    `BonusDetailsPage` - компонент полной страницы деталей бонуса.
        Загружает данные бонуса по ID из URL параметров.
        Отображает полную информацию о бонусе.
        Показывает историю изменений условий.
        Интегрируется с API для получения данных.
        Обрабатывает состояния загрузки и ошибок.
`bonus-item/` - элемент списка бонусов в таблице.
    `BonusItem` - компонент строки таблицы с данными бонуса.
        Принимает объект bonus с полными данными.
        Отображает основную информацию (название, тип, статус, даты).
        Показывает иконки доменов (⚽️ для sport, 🐖 для casino).
        Обрабатывает клики для перехода к деталям.
        Парсит JSON из поля terms для определения домена.
        Интегрируется с модалами редактирования.
`pagination/` - компонент пагинации с навигацией.
    `Pagination` - компонент для навигации по страницам.
        Принимает currentPage, totalPages, onPageChange.
        Отображает номера страниц и стрелки навигации.
        Показывает многоточие для больших диапазонов.
        Обрабатывает клики и передает новую страницу.

# Molecular Design Principles

## Characteristics of Molecules
- **Составные**: Состоят из атомов и других простых элементов
- **Функциональные**: Имеют определенную бизнес-функциональность
- **Переиспользуемые**: Могут использоваться в разных контекстах
- **Самодостаточные**: Содержат необходимую логику
- **Интерактивные**: Обрабатывают пользовательские взаимодействия

## Design Guidelines
- Композиция из атомов
- Локальное управление состоянием
- Четкий интерфейс через props
- Обработка edge cases
- Интеграция с внешними системами

# Component Specifications

## BonusDetailsPage
```jsx
const BonusDetailsPage = () => {
  const { id } = useParams();
  const [bonus, setBonus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBonusDetails(id);
  }, [id]);

  const fetchBonusDetails = async (bonusId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINT}/bonuses/${bonusId}`);
      const data = await response.json();
      setBonus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner size="large" />;
  if (error) return <div className="error">{error}</div>;
  if (!bonus) return <div className="not-found">Bonus not found</div>;

  return (
    <div className="bonus-details-page">
      <BonusHeader bonus={bonus} />
      <BonusInfo bonus={bonus} />
      <BonusTermsHistory history={bonus.terms_history} />
    </div>
  );
};
```

**Features:**
- Загрузка данных по URL параметру
- Обработка состояний загрузки и ошибок
- Отображение полной информации о бонусе
- История изменений условий

**Usage:**
```jsx
// Используется в роутинге
<Route path="/bonuses/:id" element={<BonusDetailsPage />} />
```

## BonusItem
```jsx
const BonusItem = ({ bonus, onEdit, onStatusChange }) => {
  const [updatedBonus, setUpdatedBonus] = useState(bonus);
  
  useEffect(() => {
    setUpdatedBonus(bonus);
  }, [bonus]);

  const getDomainIcon = () => {
    try {
      const terms = typeof updatedBonus.terms === 'string' 
        ? JSON.parse(updatedBonus.terms) 
        : updatedBonus.terms;
      
      return terms?.domain === 'casino' ? '🐖' : '⚽️';
    } catch (error) {
      console.error('Error parsing terms:', error);
      return '⚽️'; // Default to sport
    }
  };

  const handleClick = () => {
    navigate(`/bonuses/${updatedBonus.id}`);
  };

  return (
    <tr className="bonus-item" onClick={handleClick}>
      <td>
        <span role="img" aria-label={getDomainIcon() === '🐖' ? 'Casino' : 'Sport'}>
          {getDomainIcon()}
        </span>
      </td>
      <td>{updatedBonus.name}</td>
      <td>{updatedBonus.bonus_type}</td>
      <td>
        <StatusBadge status={updatedBonus.expiration_status} />
      </td>
      <td>{formatDate(updatedBonus.expiration_date)}</td>
      <td>
        <FlagsIndicator flags={{
          manual_url: updatedBonus.override_manual_url,
          manual_type: updatedBonus.override_manual_type,
          manual_terms: updatedBonus.override_manual_terms,
          manual_expiration: updatedBonus.override_manual_expiration
        }} />
      </td>
      <td>
        <IconButton 
          icon={<EditIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(updatedBonus);
          }}
          ariaLabel="Edit bonus"
        />
      </td>
    </tr>
  );
};
```

**Props:**
- `bonus` - объект с данными бонуса
- `onEdit` - callback для редактирования
- `onStatusChange` - callback для изменения статуса

**Features:**
- Парсинг JSON из поля terms
- Определение домена для иконки
- Обработка кликов для навигации
- Интеграция с атомами (StatusBadge, FlagsIndicator, IconButton)

## Pagination
```jsx
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  maxVisiblePages = 5 
}) => {
  const getVisiblePages = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="pagination">
      <IconButton
        icon={<ChevronLeftIcon />}
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
        ariaLabel="Previous page"
      />
      
      {visiblePages[0] > 1 && (
        <>
          <button onClick={() => handlePageClick(1)}>1</button>
          {visiblePages[0] > 2 && <span className="ellipsis">...</span>}
        </>
      )}

      {visiblePages.map(page => (
        <button
          key={page}
          className={page === currentPage ? 'active' : ''}
          onClick={() => handlePageClick(page)}
        >
          {page}
        </button>
      ))}

      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="ellipsis">...</span>
          )}
          <button onClick={() => handlePageClick(totalPages)}>
            {totalPages}
          </button>
        </>
      )}

      <IconButton
        icon={<ChevronRightIcon />}
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages}
        ariaLabel="Next page"
      />
    </div>
  );
};
```

**Props:**
- `currentPage` - текущая страница
- `totalPages` - общее количество страниц
- `onPageChange` - callback для изменения страницы
- `maxVisiblePages` - максимум видимых номеров страниц

**Features:**
- Умная логика отображения страниц
- Многоточие для больших диапазонов
- Стрелки навигации
- Обработка edge cases

# Data Management

## State Management
- Локальное состояние для UI логики
- Синхронизация с родительскими компонентами
- Обработка асинхронных операций
- Кэширование данных

## API Integration
- Fetch запросы в useEffect
- Обработка состояний загрузки
- Обработка ошибок
- Retry логика при необходимости

## Data Processing
- Парсинг JSON данных
- Форматирование для отображения
- Валидация входных данных
- Трансформация данных

# Testing Guidelines

## Component Testing
```javascript
describe('BonusItem', () => {
  const mockBonus = {
    id: 1,
    name: 'Test Bonus',
    terms: JSON.stringify({ domain: 'sport' }),
    expiration_status: 'active'
  };

  it('should render bonus information correctly', () => {
    render(<BonusItem bonus={mockBonus} />);
    expect(screen.getByText('Test Bonus')).toBeInTheDocument();
  });

  it('should show sport icon for non-casino domain', () => {
    render(<BonusItem bonus={mockBonus} />);
    expect(screen.getByLabelText('Sport')).toBeInTheDocument();
  });

  it('should handle click navigation', () => {
    const mockNavigate = jest.fn();
    render(<BonusItem bonus={mockBonus} />);
    fireEvent.click(screen.getByRole('row'));
    expect(mockNavigate).toHaveBeenCalledWith('/bonuses/1');
  });
});
```

## Integration Testing
- Тестирование взаимодействия с API
- Тестирование навигации
- Тестирование состояний загрузки
- Тестирование обработки ошибок

# Performance Guidelines

## Optimization
- Мемоизация тяжелых вычислений
- Оптимизация ре-рендеров
- Lazy loading для больших списков
- Debouncing для пользовательского ввода

## Memory Management
- Очистка подписок в useEffect
- Отмена запросов при размонтировании
- Оптимизация зависимостей useEffect