import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

type Props = { children: ReactNode; resetKey?: string }
type State = { failed: boolean }

/** Évite l'écran blanc : une erreur d'affichage propose de réessayer ou de recharger. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Subly render error', error, info.componentStack)
  }

  componentDidUpdate(previous: Props) {
    // Changer de page suffit à retenter l'affichage.
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="error-fallback" role="alert">
        <h2>Oups, quelque chose s’est mal passé</h2>
        <p>Cet écran n’a pas pu s’afficher. Tes données ne sont pas perdues.</p>
        <div className="error-fallback-actions">
          <button className="secondary-btn" onClick={() => this.setState({ failed: false })}>
            Réessayer
          </button>
          <button className="primary-btn" onClick={() => window.location.reload()}>
            <RefreshCw size={17} /> Recharger l’application
          </button>
        </div>
      </div>
    )
  }
}
