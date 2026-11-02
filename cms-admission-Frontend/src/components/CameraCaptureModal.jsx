import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Check, RefreshCw, X, AlertCircle } from 'lucide-react';

export default function CameraCaptureModal({ isOpen, onClose, onPhotoCaptured, title = 'Take Photo' }) {
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setCapturedPhoto(null);
    setIsLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser address bar and click Retry.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please connect a webcam or use Choose Image instead.');
      } else {
        setCameraError(err.message || 'Unable to access the camera.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopTracks();
      setCapturedPhoto(null);
      setCameraError('');
    }

    return () => {
      stopTracks();
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stream && videoRef.current && !capturedPhoto) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedPhoto]);

  if (!isOpen) return null;

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the current video frame onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);

    // Pause video preview
    video.pause();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleUsePhoto = () => {
    if (!capturedPhoto) return;
    stopTracks();

    const timestamp = Date.now();
    const photoPayload = {
      name: `laptop-camera-photo-${timestamp}.jpg`,
      mimeType: 'image/jpeg',
      dataUrl: capturedPhoto,
      size: Math.round(capturedPhoto.length * 0.75),
      rotation: 0,
      uploadedAt: new Date().toISOString(),
    };

    onPhotoCaptured(photoPayload);
    onClose();
  };

  const handleClose = () => {
    stopTracks();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '680px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: '#004D38',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Camera size={20} color="#FF7A00" />
            <strong id="camera-modal-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              {title}
            </strong>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close camera"
          >
            <X size={22} />
          </button>
        </div>

        {/* Viewport Content */}
        <div
          style={{
            padding: '20px',
            background: '#0f172a',
            position: 'relative',
            minHeight: '380px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cameraError ? (
            <div
              style={{
                color: '#ffffff',
                textAlign: 'center',
                maxWidth: '420px',
                padding: '24px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '12px',
              }}
            >
              <AlertCircle size={40} color="#f87171" style={{ margin: '0 auto 12px' }} />
              <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '8px', color: '#fca5a5' }}>
                Camera Error
              </strong>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 16px', color: '#f1f5f9' }}>
                {cameraError}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="primary-btn compact"
                style={{ background: '#FF7A00', borderColor: '#FF7A00', fontWeight: 700 }}
              >
                <RefreshCw size={15} /> Retry Camera
              </button>
            </div>
          ) : isLoading ? (
            <div style={{ color: '#ffffff', textAlign: 'center' }}>
              <RefreshCw size={32} className="spin-animation" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontWeight: 700 }}>Starting laptop camera...</p>
            </div>
          ) : capturedPhoto ? (
            <div style={{ position: 'relative', width: '100%', textAlign: 'center' }}>
              <img
                src={capturedPhoto}
                alt="Captured from laptop camera"
                style={{
                  maxWidth: '100%',
                  maxHeight: '420px',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(22, 101, 52, 0.9)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                ✓ Photo Captured
              </span>
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', textAlign: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  maxWidth: '100%',
                  maxHeight: '420px',
                  borderRadius: '10px',
                  transform: 'scaleX(-1)', // Mirror preview for natural selfie angle
                  display: 'inline-block',
                }}
              />
              {/* Passport photo framing guide */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '220px',
                  height: '280px',
                  border: '2px dashed rgba(255, 122, 0, 0.85)',
                  borderRadius: '120px',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.25)',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-28px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    background: 'rgba(0, 77, 56, 0.85)',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  Align face inside frame
                </span>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="secondary-btn compact"
            style={{ fontWeight: 700 }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="secondary-btn compact"
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={15} /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleUsePhoto}
                  className="primary-btn compact"
                  style={{
                    fontWeight: 800,
                    background: '#006747',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Check size={16} /> Use Photo
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCapture}
                disabled={!stream || isLoading || !!cameraError}
                className="primary-btn compact"
                style={{
                  fontWeight: 800,
                  background: '#FF7A00',
                  borderColor: '#FF7A00',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !stream || isLoading || !!cameraError ? 0.5 : 1,
                  cursor: !stream || isLoading || !!cameraError ? 'not-allowed' : 'pointer',
                }}
              >
                <Camera size={18} /> Capture
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
