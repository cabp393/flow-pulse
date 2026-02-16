import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  resetKey: number;
  errorId?: string;
}

const createErrorId = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}-${now.getMilliseconds().toString().padStart(3, '0')}`;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    resetKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: createErrorId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[error-boundary] uncaught-render-error', error, info.componentStack);
    }
  }

  resetUi = () => {
    this.setState((prev) => ({ hasError: false, error: undefined, resetKey: prev.resetKey + 1, errorId: undefined }));
  };

  goHome = () => {
    window.location.hash = '#/';
    this.resetUi();
  };

  copyDetails = async () => {
    if (!this.state.error) return;
    const payload = [
      `errorId: ${this.state.errorId ?? 'unknown'}`,
      `message: ${this.state.error.message}`,
      this.state.error.stack ? `stack:\n${this.state.error.stack}` : undefined,
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // noop
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page error-boundary-screen">
          <h2>Algo falló</h2>
          <p>Ocurrió un error inesperado en la UI.</p>
          <p><strong>Error ID:</strong> {this.state.errorId}</p>
          <p><strong>Resumen:</strong> {this.state.error?.message ?? 'Error no identificado.'}</p>
          <div className="toolbar">
            <button onClick={this.goHome}>Volver a Home</button>
            <button onClick={() => void this.copyDetails()}>Copiar detalles</button>
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
