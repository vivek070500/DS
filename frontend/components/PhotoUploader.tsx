"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Camera, XCircle, SwitchCamera, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
}

export default function PhotoUploader({
  photos,
  onPhotosChange,
}: PhotoUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addPhotosWithPreviews = useCallback((files: File[]) => {
    const newPhotos = [...photos, ...files];
    onPhotosChange(newPhotos);

    // Create previews for new files
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, [photos, onPhotosChange]);

  const addPhotoFromDataUrl = useCallback((dataUrl: string, fileName: string) => {
    // Convert data URL to File
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const newPhotos = [...photos, file];
        onPhotosChange(newPhotos);
        setPreviews((prev) => [...prev, dataUrl]);
      });
  }, [photos, onPhotosChange]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      addPhotosWithPreviews(acceptedFiles);
    },
    [addPhotosWithPreviews]
  );

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addPhotosWithPreviews(Array.from(files));
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    setCameraError(null);
    
    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setFacingMode(mode);
      setShowCamera(true);
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Could not access camera. Please check permissions.");
      // Fallback to file input on mobile
      cameraInputRef.current?.click();
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    startCamera(newMode);
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraError(null);
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const fileName = `camera_${Date.now()}.jpg`;
        addPhotoFromDataUrl(dataUrl, fileName);
        stopCamera();
      }
    }
  };

  // Set video source when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    setPreviews(newPreviews);
  };

  const downloadPhoto = (index: number) => {
    const preview = previews[index];
    const fileName = photos[index]?.name || `photo_${index + 1}.jpg`;
    
    const link = document.createElement('a');
    link.href = preview;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
  });

  return (
    <div className="space-y-4">
      {/* Hidden camera input for mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 p-3 sm:p-4 flex items-center justify-between flex-shrink-0">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              Take a Photo
            </h3>
            <button
              onClick={stopCamera}
              className="text-white hover:text-red-400 transition-colors p-1"
            >
              <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          </div>
          
          {/* Video */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain sm:object-cover"
            />
          </div>
          
          {/* Controls */}
          <div className="p-4 sm:p-6 bg-gray-900 flex justify-center items-center gap-4 sm:gap-6 flex-shrink-0">
            <button
              onClick={stopCamera}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
              title="Cancel"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={capturePhoto}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-white hover:bg-gray-100 text-gray-900 rounded-full flex items-center justify-center transition-colors ring-4 ring-white/30"
              title="Capture"
            >
              <Camera className="w-7 h-7 sm:w-8 sm:h-8" />
            </button>
            <button
              onClick={switchCamera}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
              title="Switch Camera"
            >
              <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {cameraError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {cameraError}
        </div>
      )}

      {/* Upload options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Drag & Drop / Select Files */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300",
            isDragActive
              ? "border-primary-500 bg-primary-50"
              : "border-gray-200 hover:border-primary-400 hover:bg-primary-50/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary-600" />
            </div>
            {isDragActive ? (
              <p className="text-primary-600 font-medium text-sm">Drop here...</p>
            ) : (
              <>
                <p className="text-gray-600 font-medium text-sm">
                  Drag & drop or click to select
                </p>
                <p className="text-xs text-gray-400">
                  JPG, PNG, WebP
                </p>
              </>
            )}
          </div>
        </div>

        {/* Camera Capture */}
        <button
          type="button"
          onClick={startCamera}
          className="border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50/50 rounded-xl p-6 text-center cursor-pointer transition-all duration-300"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Camera className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-gray-600 font-medium text-sm">
              Take a Photo
            </p>
            <p className="text-xs text-gray-400">
              Open camera
            </p>
          </div>
        </button>
      </div>

      {/* Photo count */}
      <p className="text-sm text-gray-500 text-center">
        {photos.length} photo{photos.length !== 1 ? "s" : ""} selected
      </p>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md"
            >
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button
                  type="button"
                  onClick={() => downloadPhoto(index)}
                  className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                <p className="text-white text-xs truncate">{photos[index]?.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="flex items-center justify-center gap-2 text-gray-400 py-4">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">No photos uploaded yet</span>
        </div>
      )}
    </div>
  );
}
