"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          className="rounded-xl px-5 py-8 text-center"
          style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
        >
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Something went wrong loading this section.
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-secondary text-xs mt-3"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
