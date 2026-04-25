import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || "Unexpected error" };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("[AppErrorBoundary]", err, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ margin: "24px auto", maxWidth: 520 }}>
          <p className="step-label">Something broke</p>
          <h1 className="hero-question">We hit an unexpected UI error</h1>
          <p className="hero-sub" style={{ marginTop: 8 }}>
            {this.state.message}
          </p>
          <div className="flow-nav" style={{ marginTop: 16 }}>
            <button type="button" className="btn-primary" onClick={() => window.location.assign("/")}>
              Reload home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
