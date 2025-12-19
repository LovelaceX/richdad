import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 * Prevents a crash in one panel from taking down the entire app
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onRetry?.()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-red-900/20 border border-red-500/30 rounded-lg min-h-[100px]">
          <AlertTriangle className="text-red-400 mb-2" size={24} />
          <h3 className="text-red-400 font-medium text-sm mb-1">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h3>
          <p className="text-gray-500 text-xs text-center mb-3 max-w-[300px]">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1 px-3 py-1.5 bg-terminal-border hover:bg-terminal-panel rounded text-xs text-gray-300 transition-colors"
          >
            <RefreshCw size={12} />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallbackTitle?: string
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallbackTitle={fallbackTitle}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}
