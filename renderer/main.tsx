import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './appearance.css';
import './premium.css';
import './session.css';
import { NotificationApp } from './Reminders';
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="error-screen">
        <h1>Let’s start fresh.</h1>
        <p>ScreenWell encountered a display problem. Your saved data is still on this computer.</p>
        <button onClick={() => location.reload()}>Reopen ScreenWell</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>{location.hash === '#reminder' ? <NotificationApp /> : <App />}</ErrorBoundary>,
);
