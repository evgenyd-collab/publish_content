# Modals Rules

Modals - модальные окна для различных операций взаимодействия с пользователем.
Специализированные компоненты для сложных форм и диалогов.

# Structure
Основная директория для работы: `src/components/modals`.
`add-terms-modal.jsx` - модал для добавления/редактирования условий бонуса.
    `AddTermsModal` - компонент модального окна для работы с условиями.
        Принимает isOpen, onClose, bonus, onSave.
        Содержит форму с полями для редактирования terms.
        Валидирует JSON формат условий.
        Отправляет данные через API.
        Обрабатывает состояния загрузки и ошибок.
`details-modal.jsx` - модал с детальной информацией.
    `DetailsModal` - компонент для отображения подробной информации.
        Принимает isOpen, onClose, data, title.
        Отображает структурированную информацию.
        Поддерживает различные типы данных.
        Адаптивный дизайн для разных размеров контента.
`manual-flags-edit-modal.jsx` - модал редактирования ручных флагов.
    `ManualFlagsEditModal` - компонент для изменения manual flags.
        Принимает isOpen, onClose, bonus, onSave.
        Содержит чекбоксы для каждого флага.
        Отображает текущее состояние флагов.
        Сохраняет изменения через API.
`new-bonus-modal.jsx` - модал создания нового бонуса.
    `NewBonusModal` - компонент для добавления нового бонуса.
        Принимает isOpen, onClose, bookmaker, onSuccess.
        Содержит полную форму создания бонуса.
        Валидирует обязательные поля.
        Интегрируется с API для создания.
        Обновляет список после успешного создания.
`status-edit-modal.jsx` - модал изменения статуса бонуса.
    `StatusEditModal` - компонент для изменения статуса.
        Принимает isOpen, onClose, bonus, onSave.
        Отображает доступные статусы.
        Показывает текущий статус.
        Подтверждает изменения.

# Modal Design Principles

## Characteristics of Modals
- **Блокирующие**: Требуют взаимодействия перед продолжением
- **Фокусированные**: Содержат специфическую функциональность
- **Самодостаточные**: Управляют собственным состоянием
- **Интерактивные**: Сложные формы и валидация
- **Интегрированные**: Работают с API и внешними системами

## Design Guidelines
- Четкий заголовок и назначение
- Кнопки действий (Save/Cancel)
- Валидация форм
- Обработка ошибок
- Accessibility поддержка

# Component Specifications

## AddTermsModal
```jsx
const AddTermsModal = ({ isOpen, onClose, bonus, onSave }) => {
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && bonus) {
      setTerms(bonus.terms || '');
      setError('');
    }
  }, [isOpen, bonus]);

  const validateJSON = (jsonString) => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateJSON(terms)) {
      setError('Invalid JSON format');
      return;
    }

    setLoading(true);
    try {
      await updateBonusTerms(bonus.id, terms);
      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Terms</h2>
          <IconButton icon={<CloseIcon />} onClick={onClose} />
        </div>
        
        <div className="modal-body">
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Enter terms as JSON"
            rows={10}
            className={error ? 'error' : ''}
          />
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading || !terms.trim()}
            className="primary"
          >
            {loading ? <Spinner size="small" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Props:**
- `isOpen` - состояние открытия модала
- `onClose` - функция закрытия
- `bonus` - объект бонуса для редактирования
- `onSave` - callback после успешного сохранения

## NewBonusModal
```jsx
const NewBonusModal = ({ isOpen, onClose, bookmaker, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    bonus_type: '',
    url: '',
    terms: '',
    min_deposit: '',
    min_coefficient: '',
    expiration_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.bonus_type) {
      newErrors.bonus_type = 'Bonus type is required';
    }
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await createBonus({
        ...formData,
        bookmaker_id: bookmaker.id
      });
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      bonus_type: '',
      url: '',
      terms: '',
      min_deposit: '',
      min_coefficient: '',
      expiration_date: ''
    });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Bonus - {bookmaker.name}</h2>
          <IconButton icon={<CloseIcon />} onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Bonus Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bonus_type">Bonus Type *</label>
            <select
              id="bonus_type"
              value={formData.bonus_type}
              onChange={(e) => setFormData({...formData, bonus_type: e.target.value})}
              className={errors.bonus_type ? 'error' : ''}
            >
              <option value="">Select type</option>
              <option value="welcome">Welcome</option>
              <option value="deposit">Deposit</option>
              <option value="free_bet">Free Bet</option>
              <option value="cashback">Cashback</option>
            </select>
            {errors.bonus_type && <span className="error-text">{errors.bonus_type}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="url">URL *</label>
            <input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              className={errors.url ? 'error' : ''}
            />
            {errors.url && <span className="error-text">{errors.url}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="terms">Terms (JSON)</label>
            <textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => setFormData({...formData, terms: e.target.value})}
              rows={4}
              placeholder='{"domain": "sport", "promotion_essence": "..."}'
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="min_deposit">Min Deposit</label>
              <input
                id="min_deposit"
                type="number"
                value={formData.min_deposit}
                onChange={(e) => setFormData({...formData, min_deposit: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label htmlFor="min_coefficient">Min Coefficient</label>
              <input
                id="min_coefficient"
                type="number"
                step="0.01"
                value={formData.min_coefficient}
                onChange={(e) => setFormData({...formData, min_coefficient: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="expiration_date">Expiration Date</label>
            <input
              id="expiration_date"
              type="date"
              value={formData.expiration_date}
              onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
            />
          </div>

          {errors.submit && (
            <div className="error-message">{errors.submit}</div>
          )}
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
            className="primary"
          >
            {loading ? <Spinner size="small" /> : 'Create Bonus'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## ManualFlagsEditModal
```jsx
const ManualFlagsEditModal = ({ isOpen, onClose, bonus, onSave }) => {
  const [flags, setFlags] = useState({
    manual_url: false,
    manual_type: false,
    manual_terms: false,
    manual_expiration: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bonus) {
      setFlags({
        manual_url: bonus.override_manual_url || false,
        manual_type: bonus.override_manual_type || false,
        manual_terms: bonus.override_manual_terms || false,
        manual_expiration: bonus.override_manual_expiration || false
      });
    }
  }, [isOpen, bonus]);

  const handleFlagChange = (flagName) => {
    setFlags(prev => ({
      ...prev,
      [flagName]: !prev[flagName]
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateBonusFlags(bonus.id, flags);
      onSave();
      onClose();
    } catch (err) {
      console.error('Error updating flags:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Manual Flags</h2>
          <IconButton icon={<CloseIcon />} onClick={onClose} />
        </div>

        <div className="modal-body">
          <div className="flags-list">
            {Object.entries(flags).map(([flagName, value]) => (
              <label key={flagName} className="flag-item">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleFlagChange(flagName)}
                />
                <span className="flag-label">
                  {flagName.replace('manual_', '').replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="primary"
          >
            {loading ? <Spinner size="small" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

# Modal Management

## State Management
- Локальное состояние для форм
- Синхронизация с внешними данными
- Валидация в реальном времени
- Обработка состояний загрузки

## API Integration
- Асинхронные операции
- Обработка ошибок
- Retry логика
- Оптимистичные обновления

## User Experience
- Автофокус на первом поле
- Escape для закрытия
- Click outside для закрытия
- Keyboard navigation

# Accessibility Guidelines

## ARIA Support
```jsx
<div 
  className="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <div className="modal-content">
    <h2 id="modal-title">Modal Title</h2>
    {/* Content */}
  </div>
</div>
```

## Focus Management
- Trap focus внутри модала
- Возврат фокуса после закрытия
- Логичный порядок табуляции

## Keyboard Support
- Escape для закрытия
- Enter для подтверждения
- Tab для навигации

# Testing Guidelines

## Modal Testing
```javascript
describe('NewBonusModal', () => {
  it('should validate required fields', () => {
    render(<NewBonusModal isOpen={true} bookmaker={mockBookmaker} />);
    
    fireEvent.click(screen.getByText('Create Bonus'));
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Bonus type is required')).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const mockOnSuccess = jest.fn();
    render(
      <NewBonusModal 
        isOpen={true} 
        bookmaker={mockBookmaker}
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText('Bonus Name'), {
      target: { value: 'Test Bonus' }
    });
    
    fireEvent.click(screen.getByText('Create Bonus'));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
```

## Integration Testing
- Тестирование API вызовов
- Тестирование валидации
- Тестирование состояний загрузки
- Тестирование обработки ошибок