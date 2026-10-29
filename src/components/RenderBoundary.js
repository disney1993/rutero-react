import React from 'react';

/** Catches render errors so a bad child (chart, header chip) cannot blank the screen. */
export default class RenderBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (typeof this.props.onError === 'function') this.props.onError(error);
  }

  render() {
    if (this.state.error) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(this.state.error)
        : this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
