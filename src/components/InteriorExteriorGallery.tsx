import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Trash2, X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { GalleryImage } from '../types';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';

interface InteriorExteriorGalleryProps {
  images: GalleryImage[];
  onImagesChange: (images: GalleryImage[]) => void;
  minImages?: number;
  maxImages?: number;
}

interface LoadingImage {
  id: string;
  tempUrl: string;
  isLoading: boolean;
  isFullyLoaded: boolean;
}

export function InteriorExteriorGallery({ 
  images, 
  onImagesChange,
  minImages = 0,
  maxImages = 4
}: InteriorExteriorGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loadingImages, setLoadingImages] = useState<LoadingImage[]>([]);
  const [fullyLoadedImageIds, setFullyLoadedImageIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length + loadingImages.length > maxImages) {
      toast.error(`You can upload a maximum of ${maxImages} photos.`);
      return;
    }

    for (const file of files) {
      // Validate file type
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        toast.error(t('toast.invalidFileFormat').replace('{{name}}', file.name));
        continue;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('toast.imageSizeError'));
        continue;
      }

      const tempId = `loading-${Date.now()}-${Math.random()}`;
      
      // Add to loading state immediately
      setLoadingImages(prev => [...prev, {
        id: tempId,
        tempUrl: '',
        isLoading: true,
        isFullyLoaded: false
      }]);

      try {
        // Read file as data URL
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          
          // Update loading image with actual URL
          setLoadingImages(prev => prev.map(img => 
            img.id === tempId 
              ? { ...img, tempUrl: dataUrl }
              : img
          ));
          
          // Create an Image object to ensure it's fully loaded before displaying
          const img = new Image();
          
          img.onload = () => {
            // Image fully loaded - now add to actual images
            const finalImageId = `image-${Date.now()}-${Math.random()}`;
            const newImage: GalleryImage = {
              id: finalImageId,
              url: dataUrl,
              orderIndex: images.length
            };
            
            // Remove from loading state
            setLoadingImages(prev => prev.filter(i => i.id !== tempId));
            
            // Add to actual images
            onImagesChange([...images, newImage]);
            
            // Mark as fully loaded
            setFullyLoadedImageIds(prev => new Set([...prev, finalImageId]));
            
            toast.success(t('toast.photoUploaded'));
          };
          
          img.onerror = () => {
            toast.error(`Failed to load ${file.name}`);
            setLoadingImages(prev => prev.filter(i => i.id !== tempId));
          };
          
          // Start loading the image
          img.src = dataUrl;
        };
        
        reader.onerror = () => {
          toast.error(`Failed to read ${file.name}`);
          setLoadingImages(prev => prev.filter(i => i.id !== tempId));
        };
        
        reader.readAsDataURL(file);
      } catch (error) {
        toast.error(`Error uploading ${file.name}`);
        setLoadingImages(prev => prev.filter(i => i.id !== tempId));
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = (imageId: string) => {
    const updatedImages = images
      .filter(img => img.id !== imageId)
      .map((img, index) => ({ ...img, orderIndex: index }));
    onImagesChange(updatedImages);
    
    // Remove from fully loaded set
    setFullyLoadedImageIds(prev => {
      const next = new Set(prev);
      next.delete(imageId);
      return next;
    });
    
    toast.success(t('toast.photoRemoved'));
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
    }
  };

  const totalSlots = images.length + loadingImages.length;
  const canUpload = totalSlots < maxImages;
  const needsMore = totalSlots < minImages;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h3 className="font-medium mb-1 text-sm sm:text-base">
          {t('interiorExteriorGallery.title')}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          {t('interiorExteriorGallery.description', { minImages: String(minImages), maxImages: String(maxImages) })}
        </p>
      </div>

      {/* Validation Message */}
      {needsMore && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 sm:p-3"
        >
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
            {t('interiorExteriorGallery.warningMinPhotos', { min: String(minImages) })}
            {totalSlots > 0 && ` ${t('interiorExteriorGallery.warningMoreNeeded', { more: String(minImages - totalSlots) })}`}
          </p>
        </motion.div>
      )}

      {/* Images Grid */}
      {totalSlots > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <AnimatePresence mode="popLayout">
            {/* Actual loaded images */}
            {images.map((image, index) => {
              const isFullyLoaded = fullyLoadedImageIds.has(image.id);
              
              return (
                <motion.div
                  key={image.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-0 aspect-video relative bg-gray-100 dark:bg-gray-800">
                      {/* Loading skeleton - show until image is confirmed loaded */}
                      {!isFullyLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-2">
                            {/* Simple minimal spinner */}
                            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#5B8CFF] rounded-full animate-spin" />
                          </div>
                        </div>
                      )}
                      
                      {/* Image - hidden until fully loaded */}
                      <img
                        src={image.url}
                        alt={`${t('interiorExteriorGallery.altText')} ${index + 1}`}
                        className={`w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${
                          isFullyLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        onClick={() => isFullyLoaded && openLightbox(index)}
                        onLoad={() => {
                          // Mark as fully loaded when img element loads
                          setFullyLoadedImageIds(prev => new Set([...prev, image.id]));
                        }}
                        loading="eager"
                      />

                      {/* Overlay Controls - only show when fully loaded */}
                      {isFullyLoaded && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2">
                          {/* Delete Button */}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(image.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Order Badge - only show when fully loaded */}
                      {isFullyLoaded && (
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-[rgb(52,113,255)] text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            
            {/* Loading placeholders */}
            {loadingImages.map((loadingImg) => (
              <motion.div
                key={loadingImg.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative"
              >
                <Card className="overflow-hidden shadow-lg">
                  <CardContent className="p-0 aspect-video relative overflow-hidden">
                    {/* Soft 3D glassmorphism loading state */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FCFDFF] via-blue-50/30 to-white flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        {/* Simple minimal spinner */}
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#5B8CFF] rounded-full animate-spin" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Area */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {canUpload ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full gap-2 border-dashed border-2 h-auto py-6 sm:py-8 rounded-[18px]"
            disabled={loadingImages.length > 0}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-center">
                <p className="font-medium text-xs sm:text-sm">
                  {totalSlots === 0 ? t('interiorExteriorGallery.uploadPhotos') : t('interiorExteriorGallery.addMorePhotos')}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  {t('interiorExteriorGallery.photosCount', { current: String(totalSlots), max: String(maxImages) })} • JPG/PNG (5MB)
                </p>
              </div>
            </div>
          </Button>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t('interiorExteriorGallery.maxImagesReached', { max: String(maxImages) })}
            </p>
          </div>
        )}

        {loadingImages.length > 0 && (
          <div className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-gray-200 border-t-[#5B8CFF] rounded-full animate-spin" />
            {t('interiorExteriorGallery.uploadingFiles', { count: String(loadingImages.length) })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-[100] flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeLightbox}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:bg-white/20 z-10 h-8 w-8 sm:h-10 sm:w-10 p-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-10 w-10 sm:h-12 sm:w-12 p-0"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-10 w-10 sm:h-12 sm:w-12 p-0"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </Button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm">
              {lightboxIndex + 1} / {images.length}
            </div>

            {/* Image */}
            <motion.img
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={images[lightboxIndex].url}
              alt={`${t('interiorExteriorGallery.fullSizeAltText')} ${lightboxIndex + 1}`}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}