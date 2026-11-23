import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../lib/i18n';

/**
 * BuilderView — the MADI Builder ("ابنِها بالروسية") in its own window
 * inside the app. The Builder is a self-contained page shipped with the
 * app at public/builder/index.html (served at /madingo/builder/ on Pages)
 * and shown here in an iframe, the same pattern the Aniss bubble uses
 * for the storybook.
 *
 * The Builder window has NO language switcher of its own: its UI language
 * follows the app's language. The iframe URL carries it once at load
 * (?lang=<locale>), and whenever the app language changes while the tab
 * is open we push the new language live with a postMessage
 * {type:"madingo-lang", lang} — no iframe reload, no lost progress.
 * The Builder only supports ar/en/ru UI languages, so the app's French
 * locale falls back to English inside the Builder. The learning content
 * inside the Builder stays Russian, as the user asked.
 */
export const BuilderView: React.FC = () => {
  const { t, lang } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Builder UI languages: ar / en / ru. French has no Builder UI yet.
  const builderLang = lang === 'fr' ? 'en' : lang;

  // Fixed at mount so a later app-language change never reloads the iframe.
  const [builderUrl] = useState(
    () => import.meta.env.BASE_URL + 'builder/index.html?lang=' + builderLang,
  );

  const sendLang = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'madingo-lang', lang: builderLang },
        window.location.origin,
      );
    } catch {
      // iframe not ready yet; the ?lang= in the URL covers the first load
    }
  };

  // Push the language live whenever the app language changes.
  useEffect(() => {
    sendLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderLang]);

  // The section is exactly the tab viewport (header + dock subtracted),
  // so the iframe fills it with no page-level scrolling. The loading
  // message is an overlay on the same box instead of stacking above the
  // iframe, so the page height never changes while it loads.
  return (
    <section
      data-testid="builder-view"
      className="relative w-full"
      style={{ height: 'calc(100dvh - 9.5rem)', minHeight: 480 }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">
          {t('builder.loading')}
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={t('nav.tabBuilder')}
        src={builderUrl}
        onLoad={() => {
          setLoaded(true);
          sendLang();
        }}
        className="absolute inset-0 block h-full w-full border-0 bg-white dark:bg-slate-900"
        allowFullScreen
      />
    </section>
  );
};
