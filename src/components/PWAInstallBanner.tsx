/**
 * PWA In-App Install Guide & Status Indicator
 * Adheres strictly to pwa-integration skill:
 * - Detects standalone PWA mode
 * - Handles beforeinstallprompt
 * - Provides guided steps for iOS Safari and Android Chrome
 * - Highlights 100% Local On-Device Privacy
 */

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Shield, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Banner Strip */}
      <div className="w-full bg-emerald-950/90 border-b border-emerald-800/60 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-200">
          <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">
            Install on Mobile for quick hard-copy invoice scanning
          </span>
          <span className="hidden sm:inline text-emerald-400/70">·</span>
          <span className="hidden sm:inline text-emerald-300/80">100% Local On-Device Data</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-emerald-400 hover:text-emerald-200 transition"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Guided Install Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Install on Mobile Home Screen</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  On Apple iPhone or iPad (Safari browser):
                </p>
                <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <li>
                    Tap the <strong className="text-emerald-400">Share</strong> icon at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-emerald-400">Add</strong> in the top-right corner.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  On Android (Chrome / Edge / Samsung Internet):
                </p>
                <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <li>
                    Tap the <strong className="text-emerald-400">Three Dots (⋮)</strong> browser menu in top right.
                  </li>
                  <li>
                    Select <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-emerald-400">Install</strong> to add it like a native app.
                  </li>
                </ol>
              </div>
            )}

            {/* Local Data Privacy Note */}
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>100% Local Storage:</strong> All scanned invoices and VAT history remain stored only on your physical mobile device.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
