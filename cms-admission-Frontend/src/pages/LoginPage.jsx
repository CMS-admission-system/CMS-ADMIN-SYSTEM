import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { loginApi } from '../services/api';

const demoCredentials = {
  officer: {
    username: 'officer',
    password: 'CMSdemo1!',
    title: 'Admission Officer',
  },
  vc: {
    username: 'vc',
    password: 'CMSdemo2!',
    title: 'Vice-Chairman',
  },
};

export default function LoginPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { auth, loginDemoUser } = useAppContext();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!demoCredentials[role]) {
    return <Navigate to="/" replace />;
  }

  if (auth.role === role) {
    return <Navigate to={role === 'officer' ? '/officer/dashboard' : '/vc/dashboard'} replace />;
  }

  const credentialSet = demoCredentials[role];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiRes = await loginApi(role, form.username, form.password);
      if (apiRes.ok) {
        loginDemoUser(role, apiRes.username || form.username);
        navigate(role === 'officer' ? '/officer/dashboard' : '/vc/dashboard', { replace: true });
        return;
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }

    if (form.username === credentialSet.username && form.password === credentialSet.password) {
      loginDemoUser(role, form.username);
      navigate(role === 'officer' ? '/officer/dashboard' : '/vc/dashboard', { replace: true });
      return;
    }
    setError('Invalid username or password.');
  };

  return (
    <main className="page-shell auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/cms-logo.png" alt="CMS College logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent">CMS College Portal</p>
            <h2>{credentialSet.title} Login</h2>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span style={{ color: '#000000', fontWeight: 700 }}>Username</span>
            <input
              type="text"
              style={{ color: '#000000' }}
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="Enter username"
            />
          </label>

          <label>
            <span style={{ color: '#000000', fontWeight: 700 }}>Password</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                style={{ color: '#000000', width: '100%', paddingRight: '42px' }}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error ? <div className="error-box">{error}</div> : null}

          <button type="submit" className="primary-btn full-width">
            <LogIn size={18} /> Sign in
          </button>
        </form>

      </div>
    </main>
  );
}
