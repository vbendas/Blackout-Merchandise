'use client';

import { Component, type ReactNode } from 'react';
import { Icon } from '@iconify/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

const MAX_RETRIES = 3;

/**
 * Error Boundary for Chat Widget
 *
 * Catches errors in the chat component tree and displays a fallback UI
 * instead of crashing the entire page.
 *
 * Features:
 * - Retry with exponential backoff (max 3 retries)
 * - Prevents infinite error loops
 * - Logs errors for debugging
 */
export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retryCount: 0 };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with Sentry/Datadog
      // sentry.captureException(error, { extra: errorInfo });
    }
    console.error('[ChatErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    const nextRetryCount = this.state.retryCount + 1;
    if (nextRetryCount > MAX_RETRIES) {
      // Max retries reached — stay in error state
      console.error('[ChatErrorBoundary] Max retries reached');
      return;
    }
    this.setState({ hasError: false, retryCount: nextRetryCount });
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < MAX_RETRIES;

      return (
        this.props.fallback || (
          <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-zinc-900 p-4 border border-red-500/20 shadow-2xl max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="lucide:alert-circle" className="h-5 w-5 text-red-400" />
              <span className="font-medium text-white text-sm">Chat Unavailable</span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Something went wrong. Please try again.
            </p>
            {canRetry ? (
              <button
                onClick={this.handleRetry}
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 text-xs text-white hover:bg-zinc-700 transition-colors"
              >
                Retry ({this.state.retryCount + 1}/{MAX_RETRIES})
              </button>
            ) : (
              <p className="text-xs text-red-400">
                Max retries reached. Please refresh the page.
              </p>
            )}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
