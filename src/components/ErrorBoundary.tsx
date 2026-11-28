import { Component, type ReactNode } from 'react'
import { clearStored } from '../state/persist'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  reset = () => {
    clearStored()
    window.location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#eafbdc',
          color: '#05310a',
          fontFamily: 'Manrope, Segoe UI, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 12px' }}>Не получилось открыть приложение</h1>
          <p style={{ margin: '0 0 16px' }}>Сохранённые данные могли устареть.</p>
          <button
            type="button"
            onClick={this.reset}
            style={{
              minHeight: 44,
              padding: '10px 16px',
              border: 0,
              borderRadius: 999,
              background: '#0f5a05',
              color: '#fff',
              font: 'inherit',
            }}
          >
            Сбросить данные
          </button>
        </div>
      </div>
    )
  }
}
