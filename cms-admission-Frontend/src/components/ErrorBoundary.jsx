import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Application Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      window.localStorage.removeItem('cmsApplications');
      window.localStorage.removeItem('cmsDraftApplication');
      window.localStorage.removeItem('cmsBusRoutesConfig');
    } catch (e) {
      console.warn('Failed clearing storage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f1f5f9',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            background: '#ffffff',
            maxWidth: '520px',
            width: '100%',
            borderRadius: '16px',
            padding: '32px 28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            border: '1.5px solid #e2e8f0',
            textAlign: 'center',
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
              Temporary Display Error
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
              The portal encountered an unexpected display issue while rendering cached student records.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: '#991b1b',
              textAlign: 'left',
              wordBreak: 'break-word',
              marginBottom: '20px',
              maxHeight: '80px',
              overflow: 'auto',
            }}>
              {String(this.state.error?.message || this.state.error || 'Unknown rendering error')}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#004d38',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} /> Reload Dashboard
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={15} /> Clear Cache &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
