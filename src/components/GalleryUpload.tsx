import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Image as ImageIcon, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';

interface GalleryUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  minImages?: number;
}

export function GalleryUpload({ 
  images, 
  onChange, 
  maxImages = 3,
  minImages = 1 
}: GalleryUploadProps) {
  const { t } = useLanguage();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(t('gallery.maxImagesReached'));
      return;
    }

    Array.from(files).forEach((file, index) => {
      if (index >= remainingSlots) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('gallery.invalidFileType'));
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('gallery.fileTooLarge'));
        return;
      }

      // Read file and convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange([...images, event.target.result as string]);
          toast.success(t('gallery.imageUploaded'));
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    if (images.length <= minImages) {
      toast.error(t('gallery.minImagesRequired'));
      return;
    }
    onChange(images.filter((_, i) => i !== index));
    toast.success(t('gallery.imageRemoved'));
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
    
    onChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">
          {t('gallery.title')}
          <span className="text-sm text-gray-500 ml-2">
            ({images.length}/{maxImages})
          </span>
        </Label>
        {minImages > 0 && (
          <span className="text-xs text-gray-500">
            {t('gallery.minRequired')}: {minImages}
          </span>
        )}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence>
          {images.map((image, index) => (
            <motion.div
              key={`${image}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50 group cursor-move ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <img
                src={image}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                {/* Drag Handle */}
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ scale: 1.1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-white/90 hover:bg-white"
                >
                  <GripVertical className="w-4 h-4 text-gray-700" />
                </motion.button>

                {/* Remove Button */}
                <motion.button
                  onClick={() => handleRemove(index)}
                  initial={{ opacity: 0 }}
                  whileHover={{ scale: 1.1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Image Number Badge */}
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs flex items-center justify-center font-medium">
                {index + 1}
              </div>

              {/* Required Badge */}
              {index === 0 && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium">
                  {t('gallery.required')}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Upload Button */}
        {canAddMore && (
          <motion.label
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-600"
          >
            <Upload className="w-8 h-8" />
            <span className="text-sm font-medium">{t('gallery.uploadPhoto')}</span>
            <span className="text-xs text-gray-500">
              {t('gallery.maxSize')}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </motion.label>
        )}
      </div>

      {/* Info Text */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <ImageIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800">
          <p className="font-medium mb-1">{t('gallery.tips')}</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>{t('gallery.tip1')}</li>
            <li>{t('gallery.tip2')}</li>
            <li>{t('gallery.tip3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
