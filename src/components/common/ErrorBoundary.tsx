import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-500/30 bg-[var(--card)] text-[var(--foreground)] font-mono text-xs space-y-4 m-4">
          <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{this.props.fallbackTitle || 'Component Error Encountered'}</span>
          </div>
          <p className="text-[var(--muted-foreground)] leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
