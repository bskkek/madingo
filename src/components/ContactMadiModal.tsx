import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle2, X, MessageSquare } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface ContactMadiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactMadiModal: React.FC<ContactMadiModalProps> = ({ isOpen, onClose }) => {
  const { lang } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        setName('');
        setEmail('');
        setMessage('');
        onClose();
      }, 2500);
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'تواصل مع فريق مادي (Contact MADI)' : 'Contact MADI Support'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar'
                  ? 'يسعدنا استقبال استفساراتك واقتراحاتك في أي وقت'
                  : 'Get in touch with MADI language support & admissions team'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1 text-start">
            <div className="flex items-center gap-2 text-brand-blue dark:text-sky-400 font-bold text-xs">
              <Mail className="w-4 h-4" />
              <span>Email Us</span>
            </div>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              support@madi.ru
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1 text-start">
            <div className="flex items-center gap-2 text-accent-orange font-bold text-xs">
              <Phone className="w-4 h-4" />
              <span>Phone</span>
            </div>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              +7 (499) 155-01-04
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1 text-start">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
              <MapPin className="w-4 h-4" />
              <span>Location</span>
            </div>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              Moscow, Russia
            </p>
          </div>
        </div>

        {/* Form or Success Banner */}
        {submittedSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-display font-extrabold text-base text-emerald-900 dark:text-emerald-200">
              {lang === 'ar' ? 'تم إرسال رسالتك بنجاح!' : 'Message Sent Successfully!'}
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {lang === 'ar'
                ? 'شكرًا لتواصلك معنا. سيقوم فريق مادي بالرد عليك قريباً.'
                : 'Thank you for reaching out. The MADI team will respond to your query shortly.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-start">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'الاسم الكامل' : 'Your Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'ar' ? 'أدخل اسمك' : 'e.g. Alex Smith'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Your Email'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="student@madi.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'موضوع الرسالة' : 'Inquiry Subject'}
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <option value="general">{lang === 'ar' ? 'استفسار عام' : 'General Inquiry'}</option>
                <option value="admissions">{lang === 'ar' ? 'التسجيل والقبول الجامعي' : 'Admissions & Campus Registration'}</option>
                <option value="technical">{lang === 'ar' ? 'دعم فني وتطبيقي' : 'Technical App Support'}</option>
                <option value="teacher">{lang === 'ar' ? 'استفسارات المعلمين' : 'Teacher & Curriculum Questions'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'ar' ? 'نص الرسالة' : 'Your Message'}
              </label>
              <textarea
                required
                rows={4}
                placeholder={
                  lang === 'ar'
                    ? 'اكتب رسالتك أو استفسارك هنا...'
                    : 'Describe your question or feedback...'
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-brand-blue text-white font-display font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال الرسالة' : 'Send Message')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
