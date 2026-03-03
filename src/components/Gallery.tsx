import { useState } from 'react';
import { motion } from 'motion/react';
import { ImageIcon } from 'lucide-react';
import { Lightbox } from './Lightbox';
import { useLanguage } from '../contexts/LanguageContext';

interface GalleryProps {
  images: string[];
  barberName: string;
}

export function Gallery({ images, barberName }: GalleryProps) {
  const { t } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">{t('barber.interiorExterior')}</h3>
        <span className="text-sm text-gray-500">({images.length})</span>
      </div>

      {/* Gallery Grid */}
      <div className={`grid gap-4 ${
        images.length === 1 ? 'grid-cols-1' : 
        images.length === 2 ? 'grid-cols-2' : 
        'grid-cols-2 md:grid-cols-3'
      }`}>
        {images.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className="relative aspect-video overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-100 cursor-pointer group"
            onClick={() => handleImageClick(index)}
          >
            <img
              src={image}
              alt={`${barberName} work ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        images={images}
        initialIndex={selectedImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}