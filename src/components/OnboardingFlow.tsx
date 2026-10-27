import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Compass,
  Wrench,
  Sparkles,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react';
import { SupportedLang } from '../data/curriculum';
import { useI18n } from '../lib/i18n';
import { signInWithGooglePopup } from '../lib/firebase';
import { LANGUAGE_OPTIONS } from './FlagPickerModal';
import { LanguageFlagIcon, MadingoWordmark, MishaMascot } from './BrandVisuals';

interface OnboardingFlowProps {
  initialMode?: 'onboarding' | 'login';
  onBackToLanding: () => void;
  onAuthenticated: (token: string, dashboard: any) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialMode = 'onboarding',
  onBackToLanding,
  onAuthenticated,
}) => {
  const { lang, setLang, t } = useI18n();

  // Steps: 1=Lang, 2=Reason, 3=Goal, 4=Auth, 5=Welcome Misha
  const [step, setStep] = useState<number>(initialMode === 'login' ? 4 : 1);
  const [isLoginMode, setIsLoginMode] = useState<boolean>(initialMode === 'login');

  const [reason, setReason] = useState<'university' | 'travel' | 'work' | 'fun'>('university');
  const [goalMinutes, setGoalMinutes] = useState<5 | 10 | 20>(10);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [micPermissionAcknowledged, setMicPermissionAcknowledged] = useState(true);
  const [optionalRecordingStorageConsent, setOptionalRecordingStorageConsent] =
    useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAuthResult, setPendingAuthResult] = useState<{
    token: string;
    dashboard: any;
  } | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@') || !password) {
      setErrorMsg(t('onboarding.errorRequired'));
      return;
    }
    if (!isLoginMode && !displayName.trim()) {
      setErrorMsg(t('onboarding.errorRequired'));
      return;
    }
    if (password.length < 6) {
      setErrorMsg(t('onboarding.errorPasswordLength'));
      return;
    }
    if (!isLoginMode && !consentAccepted) {
      setErrorMsg(t('onboarding.errorConsent'));
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          displayName: displayName.trim() || trimmedEmail.split('@')[0],
          uiLang: lang,
          goalMinutes,
          learningReason: reason,
          consentAccepted: isLoginMode ? true : consentAccepted,
          micPermissionAcknowledged,
          optionalRecordingStorageConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed');
        setIsSubmitting(false);
        return;
      }

      if (isLoginMode) {
        onAuthenticated(data.token, data.dashboard);
      } else {
        setPendingAuthResult({ token: data.token, dashboard: data.dashboard });
        setStep(5);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setConsentAccepted(true);
    setIsSubmitting(true);
    try {
      const { user, idToken } = await signInWithGooglePopup();
      const res = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName: user.displayName || displayName.trim() || 'MADI Student',
          uiLang: lang,
          goalMinutes,
          learningReason: reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Google authentication sync failed');
        setIsSubmitting(false);
        return;
      }
      onAuthenticated(data.token || idToken, data.dashboard);
    } catch (err: any) {
      const code = err?.code || '';
      console.error('[OnboardingFlow] Google Sign-In failed:', code, err);
      if (code === 'auth/unauthorized-domain' || code === 'auth/popup-blocked') {
        setErrorMsg(
          lang === 'ar'
            ? 'تعذر فتح نافذة تسجيل الدخول بـ Google داخل المعاينة (نطاق غير مصرح به أو حظر النوافذ المنبثقة). يرجى التسجيل بالبريد الإلكتروني وكلمة المرور أعلاه.'
            : lang === 'ru'
            ? 'Окно входа Google заблокировано или домен превью не авторизован в Firebase. Используйте вход по Email и паролю выше.'
            : 'Google Sign-In popup was blocked or the preview domain is not yet authorized in Firebase Console. Please sign in with Email & Password above.'
        );
      } else {
        setErrorMsg(err.message || 'Google sign-in popup was closed or blocked.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasons = [
    {
      id: 'university' as const,
      icon: GraduationCap,
      title: t('onboarding.reasonUniversity'),
      desc: t('onboarding.reasonUniversityDesc'),
    },
    {
      id: 'travel' as const,
      icon: Compass,
      title: t('onboarding.reasonTravel'),
      desc: t('onboarding.reasonTravelDesc'),
    },
    {
      id: 'work' as const,
      icon: Wrench,
      title: t('onboarding.reasonWork'),
      desc: t('onboarding.reasonWorkDesc'),
    },
    {
      id: 'fun' as const,
      icon: Sparkles,
      title: t('onboarding.reasonFun'),
      desc: t('onboarding.reasonFunDesc'),
    },
  ];

  const goals = [
    { minutes: 5 as const, title: t('onboarding.goal5'), desc: t('onboarding.goal5Desc') },
    { minutes: 10 as const, title: t('onboarding.goal10'), desc: t('onboarding.goal10Desc') },
    { minutes: 20 as const, title: t('onboarding.goal20'), desc: t('onboarding.goal20Desc') },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => {
            if (step > 1 && !isLoginMode && step < 5) {
              setStep(step - 1);
            } else {
              onBackToLanding();
            }
          }}
          className="min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('common.back')}</span>
        </button>

        <MadingoWordmark size="sm" />

        {/* Step Indicator */}
        <div className="text-xs font-semibold text-slate-500 tabular-nums">
          {step}/5
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-lg">
          {/* STEP 1: UI Language */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
                  {t('onboarding.stepLanguageTitle')}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t('onboarding.stepLanguageSub')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {LANGUAGE_OPTIONS.map((opt) => {
                  const selected = lang === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setLang(opt.code as SupportedLang)}
                      className={`min-h-[68px] p-4 rounded-2xl border-2 flex items-center justify-between gap-3 transition cursor-pointer ${
                        selected
                          ? 'border-brand-blue dark:border-accent-orange bg-blue-50/70 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-800 hover:border-brand-blue/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <LanguageFlagIcon lang={opt.code} className="w-9 h-6" />
                        <div className="text-start">
                          <div className="font-display font-bold text-lg text-slate-900 dark:text-white">
                            {opt.nativeName}
                          </div>
                          <div className="text-xs text-slate-500">{opt.subLabel}</div>
                        </div>
                      </div>
                      {selected && (
                        <Check className="w-5 h-5 text-brand-blue dark:text-accent-orange" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full min-h-[52px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition cursor-pointer"
              >
                <span>{t('common.continue')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          )}

          {/* STEP 2: Learning Reason */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
                  {t('onboarding.stepReasonTitle')}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t('onboarding.stepReasonSub')}
                </p>
              </div>

              <div className="space-y-3">
                {reasons.map((r) => {
                  const Icon = r.icon;
                  const selected = reason === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setReason(r.id)}
                      className={`w-full min-h-[68px] p-4 rounded-2xl border-2 flex items-center justify-between gap-4 text-start transition cursor-pointer ${
                        selected
                          ? 'border-brand-blue dark:border-accent-orange bg-blue-50/70 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-800 hover:border-brand-blue/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-brand-blue/10 dark:bg-brand-blue/30 text-brand-blue dark:text-accent-orange flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-display font-bold text-base text-slate-900 dark:text-white">
                            {r.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {r.desc}
                          </div>
                        </div>
                      </div>
                      {selected && (
                        <Check className="w-5 h-5 text-brand-blue dark:text-accent-orange shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full min-h-[52px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition cursor-pointer"
              >
                <span>{t('common.continue')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          )}

          {/* STEP 3: Daily Goal */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
                  {t('onboarding.stepGoalTitle')}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t('onboarding.stepGoalSub')}
                </p>
              </div>

              <div className="space-y-3">
                {goals.map((g) => {
                  const selected = goalMinutes === g.minutes;
                  return (
                    <button
                      key={g.minutes}
                      type="button"
                      onClick={() => setGoalMinutes(g.minutes)}
                      className={`w-full min-h-[68px] p-4 rounded-2xl border-2 flex items-center justify-between gap-4 text-start transition cursor-pointer ${
                        selected
                          ? 'border-brand-blue dark:border-accent-orange bg-blue-50/70 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-800 hover:border-brand-blue/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-accent-orange/15 text-accent-orange flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-display font-bold text-base text-slate-900 dark:text-white">
                            {g.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {g.desc}
                          </div>
                        </div>
                      </div>
                      {selected && (
                        <Check className="w-5 h-5 text-brand-blue dark:text-accent-orange shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-full min-h-[52px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition cursor-pointer"
              >
                <span>{t('common.continue')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          )}

          {/* STEP 4: Sign Up / Log In */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
                  {isLoginMode
                    ? t('onboarding.stepAuthTitleLogin')
                    : t('onboarding.stepAuthTitleSignup')}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t('onboarding.stepAuthSub')}
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-error text-error text-sm font-medium flex items-center gap-2.5"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
                {!isLoginMode && (
                  <div>
                    <label
                      htmlFor="onboard-name"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                    >
                      {t('onboarding.displayNameLabel')}
                    </label>
                    <input
                      id="onboard-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('onboarding.displayNamePlaceholder')}
                      className="w-full min-h-[48px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="onboard-email"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    {t('onboarding.emailLabel')}
                  </label>
                  <input
                    id="onboard-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('onboarding.emailPlaceholder')}
                    className="w-full min-h-[48px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label
                    htmlFor="onboard-password"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    {t('onboarding.passwordLabel')}
                  </label>
                  <input
                    id="onboard-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('onboarding.passwordPlaceholder')}
                    className="w-full min-h-[48px] px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                {!isLoginMode && (
                  <div className="space-y-2.5 pt-1 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={consentAccepted}
                        onChange={(e) => setConsentAccepted(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue shrink-0"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                        {t('onboarding.consentLabel')} *
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={micPermissionAcknowledged}
                        onChange={(e) =>
                          setMicPermissionAcknowledged(e.target.checked)
                        }
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue shrink-0"
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {lang === 'ru'
                          ? 'Разрешить доступ к микрофону браузера для произношения в окне «Говорить» (обработка по запросу).'
                          : lang === 'ar'
                          ? 'السماح باستخدام الميكروفون لتدريبات النطق في نافذة التحدث (عند الطلب فقط).'
                          : 'Acknowledge browser microphone use for pronunciation practice in the Speak tab (on-demand only).'}
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={optionalRecordingStorageConsent}
                        onChange={(e) =>
                          setOptionalRecordingStorageConsent(e.target.checked)
                        }
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue shrink-0"
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {lang === 'ru'
                          ? 'Опционально: сохранять мои голосовые попытки для проверки преподавателем (по умолчанию выключено).'
                          : lang === 'ar'
                          ? 'اختياري: حفظ التسجيلات الصوتية لمراجعة المعلم (معطل افتراضياً).'
                          : 'Optional: store my voice recordings for teacher review (off by default; can be deleted anytime).'}
                      </span>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[52px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-base shadow-md hover:brightness-105 transition cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting
                    ? t('common.loading')
                    : isLoginMode
                    ? t('onboarding.loginButton')
                    : t('onboarding.signupButton')}
                </button>
              </form>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {t('onboarding.googleButton')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setIsLoginMode(!isLoginMode);
                  }}
                  className="min-h-[44px] text-sm font-semibold text-brand-blue dark:text-accent-orange hover:underline cursor-pointer"
                >
                  {isLoginMode ? t('onboarding.switchToSignup') : t('onboarding.switchToLogin')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Mascot Welcome */}
          {step === 5 && pendingAuthResult && (
            <div className="text-center space-y-6 py-4">
              <div className="flex justify-center">
                <MishaMascot expression="cheering" size={140} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
                {t('onboarding.welcomeMishaTitle', {
                  name: pendingAuthResult.dashboard?.profile?.displayName || displayName || 'Student',
                })}
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                {t('onboarding.welcomeMishaBody')}
              </p>

              <button
                type="button"
                onClick={() =>
                  onAuthenticated(pendingAuthResult.token, pendingAuthResult.dashboard)
                }
                className="w-full min-h-[54px] rounded-2xl bg-accent-orange text-brand-navy font-display font-extrabold text-lg shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('onboarding.hitTheRoadBtn')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
