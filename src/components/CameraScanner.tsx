/**
 * Mobile-First ZATCA QR Code Camera Scanner
 * Features:
 * - Live environment camera stream with continuous jsQR frame analysis
 * - Hardware torch / flashlight toggle (where supported by browser/device)
 * - Switch camera front/back
 * - Gallery image / photo upload QR decoder
 * - Web Audio beep and haptic vibration on successful scan
 * - Instant Phase 1 and Phase 2 sample invoice testing buttons
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
} from 'lucide-react';
import { SAMPLE_QR_CODES } from '../utils/sampleData';

interface CameraScannerProps {
  onScanSuccess: (qrRawData: string) => void;
  isPaused?: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanSuccess,
  isPaused = false,
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
  const [lastScannedTime, setLastScannedTime] = useState<number>(0);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Synthesize pleasant scan beep using Web Audio API
  const playScanBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); // E6 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } catch {
      // AudioContext could be blocked if no user interaction yet
    }
  }, [soundEnabled]);

  // Trigger mobile haptic vibration
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 60, 80]);
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

  // Continuous frame analysis loop
  useEffect(() => {
    if (!hasPermission || isPaused) return;

    let isActive = true;

    const scanFrame = () => {
      if (!isActive || isPaused) return;

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
            // Debounce scans (min 1500ms between scans)
            if (now - lastScannedTime > 1500) {
              setLastScannedTime(now);
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
  }, [hasPermission, isPaused, lastScannedTime, onScanSuccess, playScanBeep, triggerHaptic]);

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
          setErrorMessage('No valid ZATCA QR code detected in the selected image. Please try a clearer, higher-contrast photo.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input
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

      {/* Video Viewport Container */}
      <div className="relative w-full max-w-lg aspect-4/5 sm:aspect-square bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-emerald-950/40">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Viewfinder Reticle & Guides */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
          {/* Subtle darkened backdrop scrim outside target */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-400/40 rounded-3xl">
            {/* 4 Corner Markers */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

            {/* Scanning Laser Animation Line */}
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse top-1/2 -translate-y-1/2" />

            {/* Center Aim Marker */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border border-emerald-400/30 rounded-full" />
            </div>
          </div>
        </div>

        {/* Top Controls Overlay inside Viewfinder */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>ZATCA Phase 2 Active</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95"
              title={soundEnabled ? 'Mute Beep' : 'Unmute Beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Flashlight / Torch (if hardware allows) */}
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition active:scale-95 ${
                  torchOn
                    ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white'
                }`}
                title="Toggle Torch"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            {/* Flip Camera */}
            <button
              onClick={toggleFacingMode}
              className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Instruction Prompt inside Viewfinder */}
        <div className="absolute bottom-4 inset-x-4 text-center pointer-events-none">
          <p className="text-xs text-slate-300 bg-slate-950/80 backdrop-blur-md py-1.5 px-4 rounded-full inline-block border border-slate-800">
            Point camera at the QR code on your printed paper invoice
          </p>
        </div>

        {/* Camera Permission / Error Fallback Overlay */}
        {hasPermission === false && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <h4 className="text-base font-semibold text-white mb-2">Camera Unavailable</h4>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              {errorMessage || 'Camera stream could not be initialized. You can still scan invoices by uploading an image or testing with sample QRs below.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Upload className="w-4 h-4" />
                Upload Invoice Photo
              </button>
              <button
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

      {/* Error Message Toast if scan fails from file */}
      {errorMessage && hasPermission !== false && (
        <div className="w-full max-w-lg mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Secondary Actions Strip */}
      <div className="w-full max-w-lg mt-4 flex items-center justify-between gap-3">
        {/* Upload Image Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingFile}
          className="flex-1 h-12 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition active:scale-98 shadow-sm"
        >
          {isProcessingFile ? (
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <Upload className="w-4 h-4 text-emerald-400" />
          )}
          <span>{isProcessingFile ? 'Analyzing Image...' : 'Upload Photo / File'}</span>
        </button>

        {/* Reload / Retake Stream */}
        <button
          onClick={startCamera}
          className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-98"
          title="Restart Video Stream"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Test Bench: Instant Sample QRs for Desktop / Testing */}
      <div className="w-full max-w-lg mt-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">1-Tap Test Samples (Phase 1 &amp; 2)</span>
          </div>
          <span className="text-[11px] text-slate-400">Simulate hard-copy scan</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_QR_CODES.map((sample) => (
            <button
              key={sample.name}
              onClick={() => {
                playScanBeep();
                triggerHaptic();
                onScanSuccess(sample.base64);
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition hover:border-emerald-500/50 active:scale-98 group"
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
