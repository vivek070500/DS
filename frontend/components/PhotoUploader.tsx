"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Camera, XCircle, SwitchCamera, Download, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
}

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
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
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>("");
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Get current location
  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    if (!navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let address = "";
          
          // Try to get address from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en&addressdetails=1`
            );
            const data = await response.json();
            if (data.address) {
              const parts = [];
              // Include house number and road
              if (data.address.house_number) parts.push(data.address.house_number);
              if (data.address.road) parts.push(data.address.road);
              // Include area details
              if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
              if (data.address.suburb) parts.push(data.address.suburb);
              // City/town
              if (data.address.city || data.address.town || data.address.village) {
                parts.push(data.address.city || data.address.town || data.address.village);
              }
              // District and state
              if (data.address.state_district) parts.push(data.address.state_district);
              if (data.address.state) parts.push(data.address.state);
              address = parts.join(", ");
            }
          } catch {
            // Ignore geocoding errors
          }
          
          const locationData = { lat: latitude, lng: longitude, address };
          setCurrentLocation(locationData);
          setIsGettingLocation(false);
          resolve(locationData);
        },
        () => {
          setIsGettingLocation(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Add GPS and timestamp overlay to image
  const addOverlayToImage = useCallback(async (
    imageDataUrl: string, 
    location: LocationData | null
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) {
          resolve(imageDataUrl);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Prepare overlay text
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
        const timeStr = now.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
        });

        // Calculate font size based on image dimensions
        const fontSize = Math.max(12, Math.min(img.width, img.height) * 0.025);
        const padding = fontSize * 0.8;
        const lineHeight = fontSize * 1.4;

        // Prepare lines
        const lines: string[] = [];
        lines.push(`${dateStr} ${timeStr}`);
        
        if (location) {
          lines.push(`${location.lat.toFixed(7)}N ${location.lng.toFixed(8)}E`);
          
          // Split address into multiple lines - show full address
          if (location.address) {
            const addressParts = location.address.split(", ");
            let currentLine = "";
            const maxCharsPerLine = 50; // Increased for better readability
            
            for (const part of addressParts) {
              if (currentLine.length + part.length + 2 > maxCharsPerLine) {
                if (currentLine) lines.push(currentLine);
                currentLine = part;
              } else {
                currentLine = currentLine ? `${currentLine}, ${part}` : part;
              }
            }
            if (currentLine) lines.push(currentLine);
          }
        }

        // Calculate overlay box dimensions
        ctx.font = `bold ${fontSize}px Arial`;
        let maxWidth = 0;
        for (const line of lines) {
          const metrics = ctx.measureText(line);
          maxWidth = Math.max(maxWidth, metrics.width);
        }

        const boxWidth = maxWidth + padding * 2;
        const boxHeight = lines.length * lineHeight + padding * 2;
        const boxX = padding;
        const boxY = img.height - boxHeight - padding;

        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // Draw text
        ctx.fillStyle = '#FFFF00'; // Yellow text like in the example
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textBaseline = 'top';

        lines.forEach((line, index) => {
          ctx.fillText(line, boxX + padding, boxY + padding + index * lineHeight);
        });

        // Draw location pin icon area (small map preview placeholder)
        if (location) {
          const mapSize = Math.min(80, img.width * 0.15);
          const mapX = img.width - mapSize - padding;
          const mapY = img.height - mapSize - padding;
          
          // Draw map background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(mapX, mapY, mapSize, mapSize);
          
          // Draw border
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.strokeRect(mapX, mapY, mapSize, mapSize);
          
          // Draw pin icon in center
          ctx.fillStyle = '#EA4335';
          ctx.beginPath();
          const pinX = mapX + mapSize / 2;
          const pinY = mapY + mapSize / 2;
          ctx.arc(pinX, pinY - 5, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(pinX - 8, pinY - 5);
          ctx.lineTo(pinX, pinY + 10);
          ctx.lineTo(pinX + 8, pinY - 5);
          ctx.fill();
          
          // Draw inner circle
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(pinX, pinY - 5, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = imageDataUrl;
    });
  }, []);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const addPhotosWithPreviews = useCallback(async (files: File[], addOverlay: boolean = false) => {
    let location: LocationData | null = null;
    
    if (addOverlay) {
      location = await getCurrentLocation();
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      let dataUrl = await readFileAsDataUrl(file);
      
      if (addOverlay && location) {
        dataUrl = await addOverlayToImage(dataUrl, location);
      }
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      newFiles.push(new File([blob], file.name, { type: 'image/jpeg' }));
      newPreviews.push(dataUrl);
    }

    onPhotosChange([...photos, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, [photos, onPhotosChange, getCurrentLocation, addOverlayToImage]);

  const addPhotoFromDataUrl = useCallback(async (dataUrl: string, fileName: string, location: LocationData | null) => {
    // Add overlay with GPS and timestamp
    const overlayedDataUrl = await addOverlayToImage(dataUrl, location);
    
    // Convert data URL to File
    fetch(overlayedDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const newPhotos = [...photos, file];
        onPhotosChange(newPhotos);
        setPreviews((prev) => [...prev, overlayedDataUrl]);
      });
  }, [photos, onPhotosChange, addOverlayToImage]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newPreviews: string[] = [];
      for (const file of acceptedFiles) {
        const dataUrl = await readFileAsDataUrl(file);
        newPreviews.push(dataUrl);
      }
      onPhotosChange([...photos, ...acceptedFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    },
    [photos, onPhotosChange]
  );

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const location = await getCurrentLocation();
      const fileArray = Array.from(files);
      const newFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of fileArray) {
        const dataUrl = await readFileAsDataUrl(file);
        const overlayedDataUrl = await addOverlayToImage(dataUrl, location);
        const response = await fetch(overlayedDataUrl);
        const blob = await response.blob();
        newFiles.push(new File([blob], file.name, { type: 'image/jpeg' }));
        newPreviews.push(overlayedDataUrl);
      }

      onPhotosChange([...photos, ...newFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    setCameraError(null);
    
    // Get location when starting camera
    getCurrentLocation();
    
    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
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
    setCapturedPreview(null);
    setCapturedFileName("");
  }, [stream]);

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const fileName = `photo_${Date.now()}.jpg`;
        
        const overlayedDataUrl = await addOverlayToImage(dataUrl, currentLocation);
        setCapturedPreview(overlayedDataUrl);
        setCapturedFileName(fileName);
      }
    }
  };

  const confirmCapturedPhoto = async () => {
    if (capturedPreview) {
      const response = await fetch(capturedPreview);
      const blob = await response.blob();
      const file = new File([blob], capturedFileName, { type: 'image/jpeg' });
      const newPhotos = [...photos, file];
      onPhotosChange(newPhotos);
      setPreviews((prev) => [...prev, capturedPreview]);
      setCapturedPreview(null);
      setCapturedFileName("");
      // Stay in camera mode so user can take more photos
    }
  };

  const retakePhoto = () => {
    setCapturedPreview(null);
    setCapturedFileName("");
  };

  // Set video source when stream changes or when returning from preview
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedPreview]);

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
      
      {/* Hidden canvas for overlay */}
      <canvas ref={overlayCanvasRef} className="hidden" />

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ height: '100dvh' }}>
          {/* Header */}
          <div className="bg-gray-900/95 p-2 sm:p-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                <Camera className="w-4 h-4" />
                {capturedPreview ? "Review Photo" : "Camera"}
              </h3>
              {photos.length > 0 && (
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {photos.length} taken
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentLocation && !capturedPreview && (
                <span className="text-green-400 text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  GPS
                </span>
              )}
              {isGettingLocation && (
                <span className="text-yellow-400 text-[10px]">Locating...</span>
              )}
            </div>
          </div>
          
          {capturedPreview ? (
            <>
              {/* Photo Preview */}
              <div className="flex-1 min-h-0 relative bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={capturedPreview}
                  alt="Captured preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              {/* Review Controls — two clear choices */}
              <div className="p-4 bg-gray-900/95 flex-shrink-0">
                <p className="text-white/60 text-xs text-center mb-3">Happy with this photo?</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors text-sm font-medium"
                  >
                    <Camera className="w-4 h-4" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors text-sm font-bold"
                  >
                    <Download className="w-4 h-4" />
                    Use Photo
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Video */}
              <div className="flex-1 min-h-0 relative bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-w-full max-h-full object-contain sm:w-full sm:h-full sm:object-cover"
                />
                
                {/* Live overlay preview */}
                <div className="absolute bottom-2 left-2 bg-black/60 text-yellow-400 text-[10px] p-1.5 rounded font-mono max-w-[85%]">
                  <div>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                  {currentLocation && (
                    <>
                      <div>{currentLocation.lat.toFixed(7)}N {currentLocation.lng.toFixed(8)}E</div>
                      {currentLocation.address && (
                        <div className="whitespace-pre-wrap break-words">{currentLocation.address}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Capture Controls */}
              <div className="p-3 sm:p-4 bg-gray-900/95 flex-shrink-0">
                <div className="flex justify-center items-center gap-6 sm:gap-8">
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="w-12 h-12 bg-white/15 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-colors"
                    title="Switch Camera"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="bg-white hover:bg-gray-100 text-gray-900 rounded-full flex items-center justify-center transition-colors ring-4 ring-white/30"
                    style={{ width: '72px', height: '72px' }}
                    title="Take Photo"
                  >
                    <Camera className="w-8 h-8" />
                  </button>
                  <div className="w-12 h-12" />
                </div>
                {/* Done button */}
                <button
                  type="button"
                  onClick={() => { setCapturedPreview(null); setCapturedFileName(""); stopCamera(); }}
                  className="w-full mt-3 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  Done {photos.length > 0 ? `(${photos.length} photo${photos.length !== 1 ? "s" : ""})` : "— Close Camera"}
                </button>
              </div>
            </>
          )}
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
                  JPG, PNG, WebP (no GPS stamp)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Camera Capture */}
        <button
          type="button"
          onClick={() => startCamera()}
          className="border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50/50 rounded-xl p-6 text-center cursor-pointer transition-all duration-300"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Camera className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-gray-600 font-medium text-sm">
              Take a Photo
            </p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              With GPS & timestamp
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
