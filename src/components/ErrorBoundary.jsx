import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir="rtl">
          <div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow">
            <h1 className="text-xl font-bold text-gray-900">אירעה שגיאה</h1>
            <p className="mt-4 text-gray-600">מצטערים, משהו השתבש. נא לרענן את הדף או לחזור לדף הבית.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-primary-600 px-5 py-2.5 font-semibold text-white hover:bg-primary-700"
              aria-label="רענן דף"
            >
              רענן דף
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
