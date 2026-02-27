import { Component } from 'react';
import ErrorFallback from './ErrorFallback';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error) {
    // Filter out browser extension errors and DOM manipulation errors
    const msg = error?.message || '';
    if (
      msg.includes('removeChild') ||
      msg.includes('insertBefore') ||
      msg.includes('content-all.js') ||
      msg.includes('already has a listener')
    ) {
      console.warn('[ErrorBoundary] Ignoring browser extension error:', msg);
      return null;
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const msg = error?.message || '';
    if (
      msg.includes('removeChild') ||
      msg.includes('insertBefore') ||
      msg.includes('content-all.js')
    ) {
      return;
    }

    // Prevent infinite loop by capping the error count and time window
    const now = Date.now();
    if (this._lastErrorTime && now - this._lastErrorTime < 500) {
      this._quickErrorCount = (this._quickErrorCount || 0) + 1;
      if (this._quickErrorCount > 5) {
        console.error('ErrorBoundary: Stopped to prevent freeze');
        return;
      }
    } else {
      this._quickErrorCount = 0;
    }
    this._lastErrorTime = now;

    if (this.state.errorCount >= 10) {
      console.error('ErrorBoundary: Too many errors, stopping.');
      return;
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState(prev => ({
      error,
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorCount: 0 });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError && this.state.errorCount < 10) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          fallback={this.props.fallback}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
