import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

interface StartingAuthPageProps {
  onBypassToWebsite?: () => void;
}

export const StartingAuthPage: React.FC<StartingAuthPageProps> = ({ onBypassToWebsite }) => {
  const {
    login,
    signup,
    loginWithGoogle,
    loginWithApple,
    signInWithOtp,
    verifyOtp,
    isSupabaseOnline,
    addToast,
  } = usePlanner();

  const [mode, setMode] = useState<'signup' | 'login' | 'otp'>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    { title: 'Master Every Exam,', subtitle: 'Accelerate Your Academic Future' },
    { title: 'Deterministic Spaced Repetition,', subtitle: 'Zero Concepts Forgotten' },
    { title: 'High-Yield Precision,', subtitle: 'Study Smarter, Not Harder' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (mode === 'signup' && !agreedToTerms) {
      setErrorMsg('Please accept the Terms & Conditions to proceed.');
      return;
    }

    if (mode !== 'otp' && (!password || password.length < 6)) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || undefined;
        const res = await signup(email.trim(), password, fullName);
        if (res.error) {
          setErrorMsg(res.error.message || 'Failed to create account.');
        } else {
          addToast('SUCCESS', '> ACCOUNT.ACTIVE', 'Welcome to Revision.AI! Loading your workspace...');
        }
      } else if (mode === 'login') {
        const res = await login(email.trim(), password);
        if (res.error) {
          setErrorMsg(res.error.message || 'Invalid credentials. Please verify email and password.');
        } else {
          addToast('SUCCESS', '> VERIFIED', 'Authenticated successfully.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await signInWithOtp(email.trim());
      if (res?.error) {
        setErrorMsg(res.error.message || 'Failed to send OTP code.');
      } else {
        setIsOtpSent(true);
        addToast('INFO', '> OTP.DISPATCHED', `Verification code sent to ${email.trim()}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await verifyOtp(email.trim(), otpCode.trim());
      if (res.error) {
        setErrorMsg(res.error.message || 'Invalid or expired OTP code.');
      } else {
        addToast('SUCCESS', '> VERIFIED', 'Logged in via secure email code.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    try {
      const res = await loginWithGoogle();
      if (res?.error) setErrorMsg(res.error.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google OAuth failed.');
    }
  };

  const handleAppleLogin = async () => {
    setErrorMsg(null);
    try {
      const res = await loginWithApple();
      if (res?.error) setErrorMsg(res.error.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Apple OAuth failed.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans selection:bg-[#FF3D00] selection:text-white">
      {/* Centered Master Card */}
      <div className="w-full max-w-[1040px] bg-[#111114] border border-[#26262A] rounded-2xl shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col md:flex-row relative">
        
        {/* ── LEFT HERO PANEL ───────────────────────────────────────────── */}
        <div className="w-full md:w-[48%] p-3 sm:p-4 md:p-5 flex flex-col">
          <div
            className="relative w-full h-[360px] md:h-full min-h-[480px] rounded-xl overflow-hidden bg-cover bg-center flex flex-col justify-between p-6 sm:p-8 text-white select-none border border-white/5"
            style={{
              backgroundImage: "url('/images/auth-brand-bg.jpg')",
            }}
          >
            {/* Ambient gradients for text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FF3D00]/10 via-transparent to-transparent pointer-events-none" />

            {/* Top Bar inside Left Image */}
            <div className="relative z-10 flex items-center justify-between">
              {/* Brand Logo Monogram */}
              <div className="flex items-baseline gap-1.5 tracking-tight font-display font-bold text-xl sm:text-2xl text-white">
                <span className="tracking-tight-poster uppercase text-white font-extrabold">
                  REVISIONLY
                </span>
                <span className="font-mono text-xs text-[#FF3D00] font-bold">
                  / 2.6
                </span>
              </div>

              {/* Back to website button */}
              {onBypassToWebsite && (
                <button
                  type="button"
                  onClick={onBypassToWebsite}
                  className="backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
                >
                  <span>Back to website</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Bottom Caption & Carousel Dots */}
            <div className="relative z-10 space-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#FF3D00] font-bold mb-2">
                  [ ACADEMIC ENGINE ]
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-medium text-white tracking-tight leading-snug drop-shadow-md">
                  {slides[activeSlide].title}
                  <br />
                  <span className="text-[#E4E4E7] font-light">{slides[activeSlide].subtitle}</span>
                </h2>
              </div>

              {/* Carousel Indicators */}
              <div className="flex items-center gap-2 pt-1">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeSlide === idx
                        ? 'w-8 bg-[#FF3D00] shadow-[0_0_8px_rgba(255,61,0,0.6)]'
                        : 'w-4 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT AUTH FORM PANEL ─────────────────────────────────────── */}
        <div className="w-full md:w-[52%] p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-[#111114]">
          <div className="max-w-[420px] w-full mx-auto space-y-6">

            {/* Header Titles */}
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-[#FF3D00] font-semibold mb-1">
                {mode === 'signup' ? '[ SIGN UP ]' : '[ SECURE LOGIN ]'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight font-display uppercase">
                {mode === 'signup' && 'Create an account'}
                {mode === 'login' && 'Welcome back'}
                {mode === 'otp' && 'Email Verification'}
              </h1>
              
              <div className="text-sm text-[#A1A1AA] mt-1.5">
                {mode === 'signup' && (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrorMsg(null); }}
                      className="text-[#FF3D00] hover:text-[#FF6E40] hover:underline font-medium transition-colors cursor-pointer"
                    >
                      Log in
                    </button>
                  </span>
                )}
                {mode === 'login' && (
                  <span>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setErrorMsg(null); }}
                      className="text-[#FF3D00] hover:text-[#FF6E40] hover:underline font-medium transition-colors cursor-pointer"
                    >
                      Sign up
                    </button>
                  </span>
                )}
                {mode === 'otp' && (
                  <span>
                    Prefer password login?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrorMsg(null); }}
                      className="text-[#FF3D00] hover:text-[#FF6E40] hover:underline font-medium transition-colors cursor-pointer"
                    >
                      Use password
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Supabase status warning if offline */}
            {!isSupabaseOnline && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300">
                Cloud auth is running in offline demo mode. You can log in with any test email or continue to explore.
              </div>
            )}

            {/* ── FORM ─────────────────────────────────────────────────── */}
            {mode === 'otp' ? (
              /* OTP Form */
              <form onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isOtpSent}
                    placeholder="Enter your email"
                    required
                    className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] rounded-lg px-4 py-3 text-sm text-white placeholder-[#71717A] outline-none transition-all"
                  />
                </div>

                {isOtpSent && (
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="6-digit verification code"
                      autoFocus
                      required
                      className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] rounded-lg px-4 py-3 text-center tracking-[0.3em] font-mono text-base text-white placeholder-[#71717A] outline-none transition-all"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#FF3D00] hover:bg-[#E63700] active:scale-[0.99] text-white py-3.5 rounded-lg font-semibold text-sm shadow-lg shadow-[#FF3D00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isOtpSent ? (
                    'Verify & Enter Workspace'
                  ) : (
                    'Send 6-Digit Code'
                  )}
                </button>
              </form>
            ) : (
              /* Standard Sign Up / Log In Form */
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* 2-column Name row for Sign Up */}
                {mode === 'signup' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] rounded-lg px-4 py-3 text-sm text-white placeholder-[#71717A] outline-none transition-all"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] rounded-lg px-4 py-3 text-sm text-white placeholder-[#71717A] outline-none transition-all"
                    />
                  </div>
                )}

                {/* Email row */}
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] rounded-lg px-4 py-3 text-sm text-white placeholder-[#71717A] outline-none transition-all"
                  />
                </div>

                {/* Password row with show/hide toggle */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00] rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder-[#71717A] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Terms & Conditions Checkbox (Sign up) */}
                {mode === 'signup' && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={agreedToTerms}
                      onClick={() => setAgreedToTerms(!agreedToTerms)}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer ${
                        agreedToTerms
                          ? 'bg-[#FF3D00] text-white border border-[#FF3D00]'
                          : 'bg-[#18181B] border border-[#27272A] text-transparent hover:border-[#3F3F46]'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span className="text-xs text-[#A1A1AA] select-none">
                      I agree to the{' '}
                      <span className="text-white hover:underline cursor-pointer">
                        Terms & Conditions
                      </span>
                    </span>
                  </div>
                )}

                {/* Submit CTA Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#FF3D00] hover:bg-[#E63700] active:scale-[0.99] text-white py-3.5 rounded-lg font-semibold text-sm shadow-lg shadow-[#FF3D00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 uppercase tracking-wider"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === 'signup' ? (
                    'Create Account'
                  ) : (
                    'Log In'
                  )}
                </button>
              </form>
            )}

            {/* Separator */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#27272A] w-full" />
              <span className="bg-[#111114] px-3 text-xs text-[#71717A] font-medium whitespace-nowrap">
                {mode === 'signup' ? 'Or register with' : 'Or sign in with'}
              </span>
              <div className="border-t border-[#27272A] w-full" />
            </div>

            {/* Social Auth Buttons (Google & Apple) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="bg-[#18181B] hover:bg-[#202024] border border-[#27272A] hover:border-[#3F3F46] text-white text-xs sm:text-sm font-medium py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Google</span>
              </button>

              {/* Apple Button */}
              <button
                type="button"
                onClick={handleAppleLogin}
                className="bg-[#18181B] hover:bg-[#202024] border border-[#27272A] hover:border-[#3F3F46] text-white text-xs sm:text-sm font-medium py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
              >
                <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 0.92-2.85-.92.04-2.04.62-2.69 1.38-.57.66-.99 1.73-.86 2.76 1.03.08 2.01-.54 2.63-1.29"/>
                </svg>
                <span>Apple</span>
              </button>
            </div>

            {/* Email OTP alternate link */}
            {mode !== 'otp' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('otp'); setErrorMsg(null); }}
                  className="text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                >
                  Prefer passwordless login? <span className="text-[#FF3D00] hover:underline font-medium">Use Email OTP</span>
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
