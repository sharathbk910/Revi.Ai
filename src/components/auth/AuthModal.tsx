import React, { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup' | 'forgot_password';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, signup, resetPassword, loginWithGoogle, isSupabaseOnline } = usePlanner();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.error) {
          setErrorMsg(res.error.message || 'Authentication failed. Check your credentials.');
        } else {
          onClose();
        }
      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }
        const res = await signup(email, password, displayName);
        if (res.error) {
          setErrorMsg(res.error.message || 'Registration failed.');
        } else {
          setSuccessMsg('Account created successfully. Welcome to Revisionly.');
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } else if (mode === 'forgot_password') {
        const res = await resetPassword(email);
        if (res.error) {
          setErrorMsg(res.error.message || 'Password reset request failed.');
        } else {
          setSuccessMsg('Password reset instructions dispatched to your email.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res?.error) {
        setErrorMsg(res.error.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] border border-[var(--border)] max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">
              [ ACCESS DIRECTORY ]
            </div>
            <h2 className="font-display text-xl text-[var(--foreground)] tracking-tight uppercase mt-0.5">
              SECURITY PORTAL
            </h2>
            <div className="font-mono text-[10px] text-[var(--muted-foreground)] mt-0.5">
              {isSupabaseOnline ? 'SUPABASE CLOUD AUTH // CONNECTED' : 'LOCAL GUEST MODE'}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 transition-colors"
            title="Close portal"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-3 border-b border-[var(--border)] font-mono text-xs">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-3 text-center transition-colors ${
              mode === 'login'
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--accent)]/5'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-3 text-center transition-colors ${
              mode === 'signup'
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--accent)]/5'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            REGISTER
          </button>
          <button
            type="button"
            onClick={() => { setMode('forgot_password'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-3 text-center transition-colors ${
              mode === 'forgot_password'
                ? 'border-b-2 border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--accent)]/5'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            RECOVERY
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono text-xs">
          {errorMsg && (
            <div className="p-3 border border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">ERROR:</span> {errorMsg}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 border border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)] flex items-start gap-2">
              <div>{successMsg}</div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
                Student Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                className="editorial-input text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-[var(--muted-foreground)] uppercase text-[10px] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="editorial-input text-xs"
            />
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[var(--muted-foreground)] uppercase text-[10px]">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot_password')}
                    className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--accent)]"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="editorial-input text-xs"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3 text-xs mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === 'login' ? (
              <span>Sign In</span>
            ) : mode === 'signup' ? (
              <span>Create Account</span>
            ) : (
              <span>Send Recovery Link</span>
            )}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">OR</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || !isSupabaseOnline}
              className="btn-secondary text-xs py-2 disabled:opacity-40"
            >
              Google
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2"
            >
              Guest Mode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
