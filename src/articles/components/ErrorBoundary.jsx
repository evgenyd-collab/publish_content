import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-[#141924] rounded-2xl shadow-xl w-full max-w-2xl p-6 relative">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
              Ошибка загрузки формы
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Произошла ошибка при открытии формы. Проверьте консоль браузера.
            </p>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto mb-4">
              {this.state.error?.toString()}
            </pre>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onClose) {
                  this.props.onClose();
                }
              }}
              className="px-4 py-2 bg-teal-500 dark:bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 dark:hover:bg-teal-500 transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

