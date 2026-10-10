/**
 * Mobile-First ZATCA Continuous Batch QR Camera Scanner
 * Features:
 * - Continuous fast scanning (no modals blocking the camera stream)
 * - Intelligent debouncing: instant scans for different invoices, 3s cooldown for the same invoice
 * - Audio beep and haptic feedback on each scan
 * - Instant floating HUD popup confirming invoice is saved & ready for next
 * - Live session counter & quick one-tap CSV export
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  Flashlight,
  Upload,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Check,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { SAMPLE_QR_CODES } from '../utils/sampleData';
import { InvoiceItem } from '../types/invoice';

interface CameraScannerProps {
  onScanSuccess: (qrRawData: string) => void;
  lastScannedInvoice?: InvoiceItem | null;
  sessionScanCount?: number;
  sessionTotalAmount?: number;
  onOpenExport?: () => void;
  onOpenHistory?: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanSuccess,
  lastScannedInvoice,
  sessionScanCount = 0,
  sessionTotalAmount = 0,
  onOpenExport,
  onOpenHistory,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [justScannedFlash, setJustScannedFlash] = useState(false);

  // Active popup notification on viewfinder
  const [activePopup, setActivePopup] = useState<{
    seller: string;
    total: number;
    phase: string;
    count: number;
  } | null>(null);

  const lastScannedDataRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const popupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update popup when a new invoice is passed
  useEffect(() => {
    if (lastScannedInvoice) {
      setActivePopup({
        seller: lastScannedInvoice.sellerName,
        total: lastScannedInvoice.totalWithVat,
        phase: lastScannedInvoice.complianceAudit.phase === 'phase_2' ? 'Phase 2' : 'Phase 1',
        count: sessionScanCount,
      });

      // Flash viewfinder green
      setJustScannedFlash(true);
      const flashTimer = setTimeout(() => setJustScannedFlash(false), 500);

      // Auto-dismiss popup after 2.2 seconds so user sees it, while camera stays live
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      popupTimerRef.current = setTimeout(() => {
        setActivePopup(null);
      }, 2200);

      return () => {
        clearTimeout(flashTimer);
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      };
    }
  }, [lastScannedInvoice, sessionScanCount]);

  // Synthesize pleasant scan beep using Web Audio API
  const playScanBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.08); // E6 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch {
      // AudioContext could be blocked if no user interaction yet
    }
  }, [soundEnabled]);

  // Trigger mobile haptic vibration
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 50, 60]);
    }
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Camera access is not supported on this browser or platform.');
      setHasPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setHasPermission(true);

      // Check if torch/flashlight is supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as { torch?: boolean }) : {};
        setHasTorch(Boolean(capabilities.torch));
      }
    } catch (err) {
      console.warn('Camera start error:', err);
      const e = err as Error;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings or upload an invoice photo below.');
      } else {
        setErrorMessage('Unable to connect to camera device. You can still scan by uploading an invoice photo or testing with sample QRs.');
      }
      setHasPermission(false);
    }
  }, [facingMode, stopCamera]);

  // Toggle Hardware Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack && hasTorch) {
      try {
        const newTorchState = !torchOn;
        await (videoTrack as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: newTorchState }],
        });
        setTorchOn(newTorchState);
      } catch (err) {
        console.warn('Failed to toggle torch:', err);
      }
    }
  };

  // Flip front / back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setTorchOn(false);
  };

  // Continuous frame analysis loop for FAST BATCH scanning
  useEffect(() => {
    if (!hasPermission) return;

    let isActive = true;

    const scanFrame = () => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            const now = Date.now();
            const isDifferentCode = code.data !== lastScannedDataRef.current;
            const timeSinceLast = now - lastScannedTimeRef.current;

            // If it's a DIFFERENT invoice QR, scan almost immediately (500ms cooldown)
            // If it's the SAME invoice QR still in frame, cooldown 2800ms to avoid duplicates
            const canScan = isDifferentCode ? timeSinceLast > 500 : timeSinceLast > 2800;

            if (canScan) {
              lastScannedDataRef.current = code.data;
              lastScannedTimeRef.current = now;
              playScanBeep();
              triggerHaptic();
              onScanSuccess(code.data);
            }
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(scanFrame);
    };

    animationFrameId.current = requestAnimationFrame(scanFrame);

    return () => {
      isActive = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [hasPermission, onScanSuccess, playScanBeep, triggerHaptic]);

  // Lifecycle for camera stream
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Handle image upload from file or camera roll
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessingFile(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        setIsProcessingFile(false);

        if (code && code.data) {
          playScanBeep();
          triggerHaptic();
          onScanSuccess(code.data);
        } else {
          setErrorMessage('No valid ZATCA QR code detected in the selected image. Please try a clearer photo.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Hidden Offscreen Canvas for Frame Reading */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Viewport Container */}
      <div
        className={`relative w-full max-w-lg aspect-4/5 sm:aspect-square bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-2 transition-colors duration-300 ${
          justScannedFlash
            ? 'border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.4)]'
            : 'border-emerald-950/60'
        }`}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Viewfinder Reticle & Guides */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-400/30 rounded-3xl">
            {/* 4 Corner Markers */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

            {/* Scanning Laser Line */}
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Top Controls Overlay inside Viewfinder */}
        <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between pointer-events-auto z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/60 text-xs font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Fast Batch Mode</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-9 h-9 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95"
              title={soundEnabled ? 'Mute Beep' : 'Unmute Beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Flashlight / Torch */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition active:scale-95 ${
                  torchOn
                    ? 'bg-amber-500 border-amber-400 text-white shadow-lg'
                    : 'bg-slate-950/80 border-slate-700/60 text-slate-300 hover:text-white'
                }`}
                title="Toggle Torch"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            {/* Flip Camera */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="w-9 h-9 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FLOATING SCAN POPUP HUD (Auto-confirms scan, stays open briefly, never pauses camera) */}
        {activePopup && (
          <div className="absolute top-16 inset-x-4 z-30 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="p-3.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border-2 border-emerald-500/80 shadow-2xl text-left flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 truncate">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      Invoice #{activePopup.count} Saved
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 font-mono">
                      {activePopup.phase}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                    {activePopup.seller}
                  </h4>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-emerald-400 tabular-nums">
                  {activePopup.total.toFixed(2)} SAR
                </div>
                <div className="text-[10px] text-slate-400">Ready for next</div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Instruction Prompt inside Viewfinder */}
        <div className="absolute bottom-3.5 inset-x-3.5 text-center pointer-events-none z-20">
          <p className="text-xs text-slate-200 bg-slate-950/85 backdrop-blur-md py-1.5 px-4 rounded-full inline-block border border-slate-700/60 font-medium">
            Point at invoice QR &rarr; Beep &rarr; Auto-saves instantly
          </p>
        </div>

        {/* Camera Permission / Error Fallback */}
        {hasPermission === false && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30">
            <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <h4 className="text-base font-semibold text-white mb-2">Camera Unavailable</h4>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              {errorMessage || 'Camera stream could not be initialized. You can still scan invoices by uploading an image or testing with sample QRs below.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Upload className="w-4 h-4" />
                Upload Invoice Photo
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message Toast if file upload fails */}
      {errorMessage && hasPermission !== false && (
        <div className="w-full max-w-lg mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* LIVE BATCH SESSION SUMMARY & ACTION BAR */}
      <div className="w-full max-w-lg mt-3.5 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 shadow-md">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Session: {sessionScanCount} Invoices</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Total:{' '}
            <span className="font-semibold text-emerald-400 tabular-nums">
              {sessionTotalAmount.toFixed(2)} SAR
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition"
            >
              Review
            </button>
          )}

          {onOpenExport && (
            <button
              type="button"
              onClick={onOpenExport}
              className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Get CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Secondary Actions (Upload Image / File) */}
      <div className="w-full max-w-lg mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingFile}
          className="flex-1 h-11 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition active:scale-98"
        >
          {isProcessingFile ? (
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <Upload className="w-4 h-4 text-emerald-400" />
          )}
          <span>{isProcessingFile ? 'Analyzing File...' : 'Upload Image / Photo'}</span>
        </button>

        <button
          type="button"
          onClick={startCamera}
          className="h-11 px-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-98"
          title="Restart Video Stream"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* 1-Tap Sample Invoices for Fast Testing */}
      <div className="w-full max-w-lg mt-5 p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">1-Tap Fast Test Samples</span>
          </div>
          <span className="text-[10px] text-slate-500">Test batch scanning</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_QR_CODES.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => {
                playScanBeep();
                triggerHaptic();
                onScanSuccess(sample.base64);
              }}
              className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 text-left transition hover:border-emerald-500/50 active:scale-98 group"
            >
              <div className="text-xs font-medium text-slate-200 truncate group-hover:text-emerald-400">
                {sample.name}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>{sample.total}</span>
                <span className="text-emerald-400 font-mono">{sample.phase.includes('2') ? 'P2' : 'P1'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
