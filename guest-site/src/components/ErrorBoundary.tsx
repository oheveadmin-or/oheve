import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '1.5rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          color: '#991b1b',
          fontSize: '0.88rem',
          lineHeight: 1.5,
        }}>
          <strong>Erreur d'affichage</strong>
          <br />
          {this.state.message || 'Un problème est survenu lors du rendu.'}
          <br />
          <button
            style={{ marginTop: 8, padding: '0.35rem 0.75rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', color: '#991b1b', fontSize: '0.82rem' }}
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
