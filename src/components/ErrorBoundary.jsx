import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // Intentionally no console spam; UI shows the error.
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || String(this.state.error);

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-mesh bg-dots">
        <div className="w-full max-w-2xl rounded-2xl border border-destructive/30 bg-destructive/10 p-6 shadow-soft-lg">
          <div className="text-lg font-bold text-foreground">Something crashed while rendering</div>
          <div className="text-sm text-muted-foreground mt-2">
            Open the console for full details, or copy the message below and send it to me.
          </div>
          <pre className="mt-4 whitespace-pre-wrap break-words text-sm text-destructive font-semibold">
            {message}
          </pre>
          <button
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-primary-foreground font-semibold"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

