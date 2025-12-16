import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  DEFAULT_TARGET_LANGUAGE,
  SOURCE_LANGUAGE,
  TRANSLATION_LANGUAGES,
} from "../constants";

const defaultFormState = {
  body_raw: "",
  notes: "",
};

const TranslationCreateModal = ({ isOpen, onClose, onSubmit }) => {
  const [formValues, setFormValues] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormValues(defaultFormState);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async ({ runLanguage } = {}) => {
    if (!formValues.body_raw.trim()) {
      setError("Введите текст для перевода");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const normalizedLanguage = runLanguage ? String(runLanguage).toUpperCase() : undefined;

    try {
      await onSubmit?.(
        {
          source_language: SOURCE_LANGUAGE,
          target_language: normalizedLanguage || DEFAULT_TARGET_LANGUAGE,
          body_raw: formValues.body_raw,
          notes: formValues.notes || null,
        },
        normalizedLanguage ? { autoTranslateLanguage: normalizedLanguage } : undefined
      );
      setIsSubmitting(false);
    } catch (submitError) {
      console.error("Не удалось создать запись перевода", submitError);
      setError(submitError?.message || "Не удалось создать запись");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative">
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={() => {
            if (!isSubmitting) {
              onClose?.();
            }
          }}
          aria-label="Закрыть модалку"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Добавить прогноз для перевода
        </h2>

        <div className="space-y-4">
          <label className="block text-sm text-gray-700">
            <span className="font-medium">Текст для перевода</span>
            <textarea
              name="body_raw"
              value={formValues.body_raw}
              onChange={handleChange}
              className="mt-1 w-full min-h-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
              placeholder="Введите прогноз для перевода"
              disabled={isSubmitting}
            />
          </label>

          <label className="block text-sm text-gray-700">
            <span className="font-medium">Notes (опционально)</span>
            <textarea
              name="notes"
              value={formValues.notes}
              onChange={handleChange}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
              placeholder="Дополнительные комментарии"
              disabled={isSubmitting}
            />
          </label>

          {error ? (
            <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) {
                onClose?.();
              }
            }}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-100 transition disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition disabled:opacity-60"
          >
            {isSubmitting ? "Создание..." : "Добавить"}
          </button>
          {TRANSLATION_LANGUAGES.map((languageCode) => (
            <button
              key={`run-${languageCode}`}
              type="button"
              onClick={() => handleSubmit({ runLanguage: languageCode })}
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition disabled:opacity-60"
            >
              {isSubmitting ? "Создание..." : `Add and run RU>>${languageCode}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

TranslationCreateModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default TranslationCreateModal;

