import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { AuroraOrb } from './AuroraOrb';
import { X, Eye, EyeOff, Lock, Mail, User, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register, loginAsDemo } = useAuth();
  const { t, currentLanguage } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setResetSuccess(true);
      }, 700);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'Invalid credentials.');
        }
      } else {
        const res = await register(name, email, password, currentLanguage);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'Registration failed.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setIsSubmitting(true);
    await loginAsDemo();
    setIsSubmitting(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#26382D]/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl bg-[#FFFFFF] border border-[#E3EADF] rounded-[22px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
        style={{
          boxShadow: '0 20px 60px -15px rgba(38, 56, 45, 0.15)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-[#788579] hover:text-[#26382D] p-1.5 rounded-full hover:bg-[#EEF3EA] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Welcoming Nature Brand Side */}
        <div className="w-full md:w-5/12 bg-[#EEF3EA] p-8 flex flex-col justify-between items-center text-center relative overflow-hidden border-b md:border-b-0 md:border-r border-[#E3EADF]">
          <div className="z-10 mt-4">
            <AuroraOrb size="md" state="idle" />
          </div>

          <div className="z-10 my-6">
            <h3 className="text-xl font-bold text-[#26382D] font-display">
              Aurora AI
            </h3>
            <p className="text-xs text-[#527653] font-medium mt-1">
              {t('tagline')}
            </p>
            <p className="text-xs text-[#788579] mt-3 leading-relaxed max-w-xs">
              {t('heroSubtitle')}
            </p>
          </div>

          <div className="z-10 text-[11px] text-[#899287] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#527653]" />
            <span>Argon2id Encrypted Security</span>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-10 flex flex-col justify-center bg-[#FFFFFF]">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#26382D] font-display">
              {mode === 'login' && t('welcomeBack')}
              {mode === 'register' && t('createAccountTitle')}
              {mode === 'forgot' && t('resetPasswordTitle')}
            </h2>
            <p className="text-xs text-[#788579] mt-1">
              {mode === 'login' && t('signInSubtitle')}
              {mode === 'register' && t('registerSubtitle')}
              {mode === 'forgot' && t('forgotSubtitle')}
            </p>
          </div>

          {/* Segmented Mode Selector */}
          {mode !== 'forgot' && (
            <div className="flex p-1 bg-[#EEF3EA] rounded-xl border border-[#E3EADF] mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#FFFFFF] text-[#26382D] shadow-xs'
                    : 'text-[#788579] hover:text-[#26382D]'
                }`}
              >
                {t('signInTab')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#FFFFFF] text-[#26382D] shadow-xs'
                    : 'text-[#788579] hover:text-[#26382D]'
                }`}
              >
                {t('createAccountTab')}
              </button>
            </div>
          )}

          {/* 1-Click Demo Shortcut */}
          {mode === 'login' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#FBE5D4] hover:bg-[#F4B183]/50 border border-[#F4B183]/60 text-[#26382D] text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E99A61]" />
                <span>{t('guestDemo')}</span>
              </button>
              <div className="flex items-center gap-3 my-4">
                <span className="flex-1 h-[1px] bg-[#E3EADF]" />
                <span className="text-[11px] text-[#899287] uppercase tracking-wider font-mono">{t('orEmailSignIn')}</span>
                <span className="flex-1 h-[1px] bg-[#E3EADF]" />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#CF7770]/10 border border-[#CF7770]/30 text-[#CF7770] text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CF7770] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccess && mode === 'forgot' && (
            <div className="mb-4 p-3 rounded-xl bg-[#62966A]/10 border border-[#62966A]/30 text-[#527653] text-xs">
              Password reset link has been dispatched to {email}.
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#26382D] mb-1.5">
                  {t('fullName')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#899287]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Amrutha Varshini"
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs sm:text-sm text-[#26382D] placeholder-[#899287] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#26382D] mb-1.5">
                {t('emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#899287]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs sm:text-sm text-[#26382D] placeholder-[#899287] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#26382D]">
                    {t('password')}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); }}
                      className="text-[11px] text-[#527653] hover:underline cursor-pointer"
                    >
                      {t('forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#899287]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs sm:text-sm text-[#26382D] placeholder-[#899287] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#899287] hover:text-[#26382D] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[#26382D] mb-1.5">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#899287]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-[#F7F8F2] border border-[#E3EADF] rounded-xl text-xs sm:text-sm text-[#26382D] placeholder-[#899287] focus:outline-none focus:ring-1 focus:ring-[#A8C3A0] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#899287] hover:text-[#26382D] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#527653] hover:bg-[#26382D] text-white font-semibold text-xs tracking-wide shadow-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? t('authenticating') : mode === 'login' ? t('signInButton') : mode === 'register' ? t('registerButton') : t('sendResetLink')}
            </button>
          </form>

          {/* Footer toggle */}
          <div className="mt-5 text-center text-xs text-[#788579]">
            {mode === 'forgot' ? (
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="text-[#527653] font-medium hover:underline cursor-pointer"
              >
                {t('backToSignIn')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
