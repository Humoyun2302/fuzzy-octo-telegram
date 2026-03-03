import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Image as ImageIcon, AlertCircle, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner@2.0.3';

interface GalleryManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export function GalleryManager({ images, onImagesChange, maxImages = 3 }: GalleryManagerProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(t('gallery.maxImagesReached', { max: maxImages }));
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newImages: string[] = [];

    for (const file of filesToProcess) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(t('gallery.invalidFileType', { name: file.name }));
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('gallery.fileTooLarge', { name: file.name }));
        continue;
      }

      // Convert to base64
      try {
        const base64 = await fileToBase64(file);
        newImages.push(base64);
      } catch (error) {
        toast.error(t('gallery.uploadFailed', { name: file.name }));
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
      toast.success(t('gallery.uploadSuccess', { count: newImages.length }));
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    toast.success(t('gallery.imageDeleted'));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    onImagesChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const remainingSlots = maxImages - images.length;
  const hasRequiredImage = images.length >= 1;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {t('gallery.title')}
          </Label>
          <p className="text-sm text-gray-600 mt-1">
            {t('gallery.description', { current: images.length, max: maxImages })}
          </p>
          {!hasRequiredImage && (
            <p className="text-sm text-red-600 mt-1">
              {t('gallery.atLeastOne')}
            </p>
          )}
        </div>
      </div>

      {/* Upload Area */}
      {remainingSlots > 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {t('gallery.uploadPrompt')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {t('gallery.uploadHint', { remaining: remainingSlots })}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                JPEG/PNG, {t('gallery.maxSize')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {images.map((image, index) => (
              <motion.div
                key={image}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative aspect-video rounded-xl overflow-hidden border-2 ${
                  draggedIndex === index ? 'border-blue-500' : 'border-gray-200'
                } bg-gray-100 group cursor-move`}
              >
                <img
                  src={image}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200" />

                {/* Drag Handle */}
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                  <GripVertical className="w-4 h-4 text-gray-700" />
                </div>

                {/* Delete Button */}
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(index)}
                  className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </Button>

                {/* Image Number Badge */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
                  {index === 0 ? t('gallery.primary') : `${index + 1}`}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Alert */}
      {images.length === 0 && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            {t('gallery.noImages')}
          </AlertDescription>
        </Alert>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">{t('gallery.tips')}</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• {t('gallery.tip1')}</li>
          <li>• {t('gallery.tip2')}</li>
          <li>• {t('gallery.tip3')}</li>
          <li>• {t('gallery.tip4')}</li>
        </ul>
      </div>
    </div>
  );
}
