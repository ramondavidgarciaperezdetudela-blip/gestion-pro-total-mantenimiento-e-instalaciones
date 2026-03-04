import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CameraCapture({ onCapture, onCancel, label = 'Capturar foto' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraSupported, setCameraSupported] = useState(true);

  const startCamera = async () => {
    try {
      setError('');
      
      // Verificar soporte
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraSupported(false);
        setError('Tu navegador no soporta acceso a cámara. Usa el selector de archivos.');
        return;
      }

      // Solicitar con mejor manejo de constraints
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Esperar a que el video esté listo
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error('Play error:', e));
        };
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('❌ Permiso denegado. Habilita la cámara en ajustes del navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('❌ No se encontró cámara en el dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('❌ La cámara está siendo usada por otra aplicación.');
      } else {
        setError('❌ Error al acceder a la cámara. ' + err.message);
      }
      setCameraSupported(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  const confirmCapture = async () => {
    if (capturedImage) {
      // Convertir data URL a Blob
      const blob = await fetch(capturedImage).then(res => res.blob());
      onCapture(blob, capturedImage);
      setCapturedImage(null);
    }
  };

  const cancelCapture = () => {
    setCapturedImage(null);
    setCameraActive(false);
    stopCamera();
    if (onCancel) onCancel();
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      setFacingMode(fm => fm === 'environment' ? 'user' : 'environment');
      startCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (cameraActive) stopCamera();
    };
  }, [cameraActive]);

  return (
    <div className="w-full max-w-md mx-auto rounded-lg bg-white border border-gray-200 p-4">
      {!cameraActive && !capturedImage && (
        <Button
          onClick={startCamera}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" />
          {label}
        </Button>
      )}

      {cameraActive && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-3">
              <Button
                onClick={capturePhoto}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capturar
              </Button>
              <Button
                onClick={toggleCamera}
                variant="outline"
                size="sm"
                className="bg-white/90"
                title="Cambiar cámara"
              >
                🔄
              </Button>
              <Button
                onClick={cancelCapture}
                variant="destructive"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            {facingMode === 'environment' ? '📷 Cámara trasera' : '🤳 Cámara frontal'}
          </p>
        </div>
      )}

      {capturedImage && (
        <div className="space-y-3">
          <img src={capturedImage} alt="Captura" className="w-full rounded-lg border border-gray-200" />
          <div className="flex gap-2">
            <Button
              onClick={confirmCapture}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </Button>
            <Button
              onClick={() => {
                setCapturedImage(null);
                startCamera();
              }}
              variant="outline"
              className="flex-1"
            >
              Retomar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-2">
          <p>{error}</p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setError('');
                startCamera();
              }}
              variant="link"
              className="h-auto p-0 text-red-700 underline text-xs"
            >
              Reintentar cámara
            </Button>
            <span className="text-gray-400">o</span>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="link"
              className="h-auto p-0 text-red-700 underline text-xs"
            >
              Seleccionar archivo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  onCapture(file, ev.target?.result);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}