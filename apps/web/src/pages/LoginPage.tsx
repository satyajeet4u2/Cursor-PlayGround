import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { token, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('agent@demo.ops');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="panel login-card">
        <h1>Ops Cases</h1>
        <p className="muted">
          Sign in to manage case workflow. Seed the API first if you have no data.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn primary block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="demo-hints">
          <p className="muted">Demo accounts (password: <code>demo1234</code>)</p>
          <ul>
            <li>
              <button
                type="button"
                className="link-btn"
                onClick={() => setEmail('agent@demo.ops')}
              >
                agent@demo.ops
              </button>{' '}
              — start work, submit review
            </li>
            <li>
              <button
                type="button"
                className="link-btn"
                onClick={() => setEmail('manager@demo.ops')}
              >
                manager@demo.ops
              </button>{' '}
              — overview dashboard, reports, close cases
            </li>
          </ul>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
