import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    resetKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[error-boundary] uncaught-render-error', error, info.componentStack);
    }
  }

  resetUi = () => {
    this.setState((prev) => ({ hasError: false, error: undefined, resetKey: prev.resetKey + 1 }));
  };

  goHome = () => {
    window.location.hash = '#/';
    this.resetUi();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page error-boundary-screen">
          <h2>Algo falló</h2>
          <p>Ocurrió un error inesperado en la UI.</p>
          <div className="toolbar">
            <button onClick={this.goHome}>Volver a Home</button>
            <button onClick={this.resetUi}>Reset UI</button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details>
              <summary>Detalles</summary>
              <pre>{this.state.error.stack ?? this.state.error.message}</pre>
            </details>
          )}
        </div>
      );
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
