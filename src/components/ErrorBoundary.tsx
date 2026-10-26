import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Changing this value clears a caught error. */
  // **
  resetKey?: unknown
  fallback: (error: Error, reset: () => void) => ReactNode
  children: ReactNode
}

interface State {
  error: Error | null
  resetKey: unknown
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D viewer error:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children
  }
}
