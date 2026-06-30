import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, Image as ImageIcon, FileText, RotateCcw, Trash2, Video } from 'lucide-react';

interface AttachmentSelectorProps {
  note: string;
  onChangeNote: (note: string) => void;
  photo: string; // base64
  onChangePhoto: (photo: string) => void;
  label?: string;
}

export default function AttachmentSelector({
  note,
  onChangeNote,
  photo,
  onChangePhoto,
  label = 'التوثيق المالي والمرفقات (اختياري)'
}: AttachmentSelectorProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream when component unmounts or active state changes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setCameraError('لم نتمكن من تشغيل الكاميرا. يرجى التحقق من الصلاحيات أو استخدام خيار تحميل الملف.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame on the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onChangePhoto(dataUrl);
        stopCamera();
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
      setCameraError('فشل التقاط الصورة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChangePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150/80 space-y-3.5" id="attachment-selector-wrapper">
      <div className="flex justify-between items-center">
        <label className="block text-slate-700 font-bold text-xs">{label} 📎</label>
        {photo && (
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>تم إرفاق صورة</span>
          </span>
        )}
      </div>

      {/* Note input field */}
      <div className="space-y-1">
        <div className="relative">
          <FileText className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          <textarea
            placeholder="أضف ملاحظة توثيقية إضافية لهذا السجل (مثال: رقم الفاتورة، تفاصيل السداد...)"
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
            rows={2}
            className="w-full pl-2 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder-slate-400 leading-relaxed"
          />
        </div>
      </div>

      {/* Photo attachment controls */}
      <div className="space-y-2">
        {!photo && !isCameraActive && (
          <div className="grid grid-cols-2 gap-2" id="attachment-buttons-row">
            <button
              type="button"
              onClick={startCamera}
              className="py-2 px-3 bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50/30 text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-sky-500" />
              <span>التقاط صورة 📸</span>
            </button>
            
            <label className="py-2 px-3 bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50/30 text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center">
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>تحميل ملف 📁</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Camera capture screen */}
        {isCameraActive && (
          <div className="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800" id="camera-stream-container">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute top-2 left-2 bg-rose-600 text-white font-semibold text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1">
                <Video className="w-2.5 h-2.5 animate-pulse" />
                <span>البث المباشر</span>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
              >
                إلغاء الكاميرا
              </button>
              
              <button
                type="button"
                onClick={capturePhoto}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>التقاط اللقطة 📸</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera error feedback */}
        {cameraError && (
          <p className="text-[10px] text-rose-600 font-medium leading-relaxed bg-rose-50/50 p-2 rounded-lg border border-rose-100/50">
            {cameraError}
          </p>
        )}

        {/* Preview of attached photo */}
        {photo && (
          <div className="relative bg-white p-2 rounded-xl border border-slate-200 shadow-3xs flex gap-3 items-center" id="photo-preview-item">
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
              <img
                src={photo}
                alt="Attachment preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                <span>صورة مرفقة بنجاح</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 truncate">تم حفظ الصورة محلياً في سجلاتك الموثقة</p>
            </div>

            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={startCamera}
                title="إعادة التقاط"
                className="p-1.5 bg-slate-50 hover:bg-slate-100 hover:text-sky-600 text-slate-500 rounded-lg border border-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangePhoto('')}
                title="حذف الصورة"
                className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg border border-slate-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
