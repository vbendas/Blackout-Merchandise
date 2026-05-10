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
}

/**
 * Error Boundary for Chat Widget
 *
 * Catches errors in the chat component tree and displays a fallback UI
 * instead of crashing the entire page.
 */
export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with Sentry/Datadog
      // sentry.captureException(error, { extra: errorInfo });
    }
    console.error('[ChatErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
            <button
              onClick={() => this.setState({ hasError: false })}
              className="w-full py-2 px-3 rounded-lg bg-zinc-800 text-xs text-white hover:bg-zinc-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
