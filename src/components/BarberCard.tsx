import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Languages, Share2, Check, Heart, ExternalLink, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Baby } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Barber } from '../types';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';
import { calculatePriceRange } from '../utils/priceUtils';

interface BarberCardProps {
  barber: Barber;
  onBookNow: (barber: Barber) => void;
  showShareButton?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (barberId: string) => void;
  onShowOnMap?: (barber: Barber) => void;
}

export function BarberCard({ barber, onBookNow, showShareButton = true, isFavorite = false, onToggleFavorite, onShowOnMap }: BarberCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { t } = useLanguage();
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Use gallery images if available, otherwise fallback to avatar
  const carouselImages = barber.gallery && barber.gallery.length > 0 
    ? barber.gallery 
    : [barber.avatar];

  // Check if there are any valid images to display
  const hasValidImages = (barber.gallery && barber.gallery.length > 0) || (barber.avatar && barber.avatar.trim() !== '');

  const AUTOPLAY_DURATION = 2000; // 2 seconds per image
  const PROGRESS_INTERVAL = 20; // Update progress every 20ms for smooth animation
  const MIN_SWIPE_DISTANCE = 50; // Minimum distance for a swipe

  // Helper function to get service details by name
  const getServiceDetails = (serviceName: string) => {
    return barber.services?.find(s => s.name === serviceName);
  };

  // Helper function to format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  // Lock body scroll when viewer is open
  useEffect(() => {
    if (isViewerOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isViewerOpen]);

  // Autoplay disabled - images are now static and only change on manual interaction

  const handleShare = async () => {
    // Use username-based URL if available, otherwise fallback to UUID
    const shareUrl = barber.username 
      ? `${window.location.origin}/b/${barber.username}`
      : `${window.location.origin}?barber=${barber.id}`;
    
    // Helper function for fallback copy method
    const fallbackCopy = (text: string): boolean => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        console.error('Fallback copy failed:', err);
        return false;
      }
    };

    try {
      // Check if Clipboard API is available and usable
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          toast.success(t('toast.linkCopied'));
          setTimeout(() => setCopied(false), 2000);
          return;
        } catch (clipboardError) {
          console.log('Clipboard API blocked, using fallback method');
          // Fall through to fallback method
        }
      }
      
      // Use fallback method
      const success = fallbackCopy(shareUrl);
      if (success) {
        setCopied(true);
        toast.success(t('toast.linkCopied'));
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Fallback copy failed');
      }
    } catch (err) {
      console.error('All copy methods failed:', err);
      toast.error(t('toast.linkCopyFailed'));
      // Show URL in prompt as last resort
      prompt('Copy this link:', shareUrl);
    }
  };

  const handleBookNow = () => {
    onBookNow(barber);
  };

  const handleLocationClick = () => {
    if (onShowOnMap) {
      onShowOnMap(barber);
    }
  };

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(barber.id);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handlePrevImage = () => {
    setProgress(0);
    setCurrentImageIndex((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setProgress(0);
    setCurrentImageIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
  };

  const handleIndicatorClick = (index: number) => {
    setProgress(0);
    setCurrentImageIndex(index);
  };

  const openViewer = (index: number) => {
    setViewerImageIndex(index);
    setIsViewerOpen(true);
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
  };

  const handleViewerPrev = () => {
    setViewerImageIndex((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1));
  };

  const handleViewerNext = () => {
    setViewerImageIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      if (distance > MIN_SWIPE_DISTANCE) {
        handleNextImage();
      } else if (distance < -MIN_SWIPE_DISTANCE) {
        handlePrevImage();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Calculate dynamic price range
  const dynamicPriceRange = calculatePriceRange(barber);

  // Debug: Log price range values being rendered
  console.log(`🏪 BarberCard render for ${barber.name} (ID: ${barber.id}):`, {
    priceRange_from_props: barber.priceRange,
    calculated_dynamicPriceRange: dynamicPriceRange,
    services_count: barber.services?.length || 0,
    services: barber.services?.map(s => ({ name: s.name, price: s.price }))
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      ref={cardRef}
    >
      <Card className="overflow-hidden group relative rounded-3xl border border-gray-100 dark:border-gray-700/50 hover:border-[#5B8CFF]/30 transition-all duration-200 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md">
        {/* Conditionally render image carousel section only if there are valid images */}
        {hasValidImages ? (
          <div className="relative overflow-hidden rounded-t-3xl">
            {/* Image Carousel */}
            <div className="aspect-video overflow-hidden bg-white dark:bg-gray-900 relative">
              {/* Gradient overlay - clickable to open viewer */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10 cursor-pointer" 
                onClick={() => openViewer(currentImageIndex)}
              />
              
              {/* Image */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={carouselImages[currentImageIndex]}
                  alt={`${barber.name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => openViewer(currentImageIndex)}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={() => handleSwipe()}
                />
              </AnimatePresence>

              {/* Carousel Navigation - Only show if multiple images */}
              {carouselImages.length > 1 && (
                <>
                  {/* Image indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pointer-events-none">
                    {carouselImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIndicatorClick(index);
                        }}
                        className={`w-2 h-2 rounded-full transition-all pointer-events-auto ${
                          index === currentImageIndex 
                            ? 'bg-white w-6' 
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {showShareButton && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                {/* Favorites Button */}
                {onToggleFavorite && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite();
                    }}
                    className="gap-1 bg-white/90 hover:bg-white backdrop-blur-sm bg-[rgba(255,255,255,0.6)] text-[rgb(0,0,0)]"
                  >
                    <Heart 
                      className={`w-3 h-3 transition-colors ${
                        isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
                      }`}
                    />
                  </Button>
                )}
                
                {/* Share Button */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="gap-1 bg-[rgba(255,255,255,0.6)] hover:bg-white backdrop-blur-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-primary" />
                      <span className="text-xs hidden sm:inline">{t('barber.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3 h-3" />
                      <span className="text-xs text-[rgb(10,30,63)] hidden sm:inline">{t('common.share')}</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Small round avatar at bottom left */}
            <div className="absolute bottom-3 left-3 z-20 flex items-end gap-3">
              <Avatar className="w-16 h-16 ring-4 ring-white shadow-lg">
                <AvatarImage src={barber.avatar} alt={barber.name} />
                <AvatarFallback>{barber.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        ) : null}

        <CardContent className={`p-4 space-y-4 rounded-[20px] ${!hasValidImages ? 'pt-6' : ''}`}>
          {/* Barber Name with Avatar (when no images) and Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Show avatar here when there are no valid images */}
              {!hasValidImages && (
                <Avatar className="w-12 h-12 ring-2 ring-gray-200 shadow-md">
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold">
                    {barber.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col">
                <h3 className={`text-gray-900 dark:text-gray-100 text-[16px] font-bold no-underline ${hasValidImages ? 'mx-[0px] my-[-27px]' : ''}`}>
                  {barber.name}
                </h3>
                {/* Show barbershop name only for cards without images (small cards) */}
                {barber.barbershopName && !hasValidImages && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {barber.barbershopName}
                  </p>
                )}
              </div>
            </div>
            
            {/* Action buttons when no images */}
            {!hasValidImages && showShareButton && (
              <div className="flex items-center gap-2">
                {/* Favorites Button */}
                {onToggleFavorite && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite();
                    }}
                    className="gap-1 bg-gray-100 hover:bg-gray-200 text-[rgb(0,0,0)]"
                  >
                    <Heart 
                      className={`w-3 h-3 transition-colors ${
                        isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
                      }`}
                    />
                  </Button>
                )}
                
                {/* Share Button */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="gap-1 bg-gray-100 hover:bg-gray-200 rounded-[50px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-primary" />
                      <span className="text-xs hidden sm:inline">{t('barber.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3 h-3" />
                      <span className="text-xs text-[rgb(10,30,63)] hidden sm:inline">{t('common.share')}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Workplace Address - Compact inline design */}
          {barber.workplaceAddress && (
            <div className="flex items-start gap-2 py-2 px-3 bg-[#aee0ff26]" style={{ borderRadius: '8px' }}>
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#155DFC' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('barber.workplaceAddress')}</p>
                {onShowOnMap ? (
                  <button
                    onClick={handleLocationClick}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline text-left transition-colors font-medium break-words"
                  >
                    {barber.workplaceAddress}
                  </button>
                ) : (
                  <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                    {barber.workplaceAddress}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Price Range - Always Visible */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('barber.priceRange')}</p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatPrice(dynamicPriceRange.min)} - {formatPrice(dynamicPriceRange.max)} UZS
              </span>
            </div>
          </div>

          {/* Expandable Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden space-y-4"
              >
                {/* Barbershop Name - Only for cards with images */}
                {barber.barbershopName && hasValidImages && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 tracking-wide mb-2 font-bold font-normal">
                      {t('barber.worksAt')}
                    </h4>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {barber.barbershopName}
                    </p>
                  </div>
                )}

                {/* Barber Description */}
                {barber.description && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 tracking-wide mb-2 font-bold font-normal">
                      {t('barber.description')}
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {barber.description}
                    </p>
                  </div>
                )}

                {/* Kids Welcome Badge - Moved to bottom */}
                {barber.servicesForKids && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-bold font-normal">
                      <Baby className="w-3 h-3 mr-1.5" />
                      {t('barber.kidsWelcome')}
                    </Badge>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button & Book Now - Only show toggle if description exists */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            {barber.description && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="gap-2 text-gray-600 hover:text-gray-900 text-[8px] mx-[-21px] my-[0px] m-[0px]"
              >
                {isExpanded ? (
                  <>
                    <span className="text-sm">{t('barber.showLess')}</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span className="text-sm text-[13px]">{t('barber.moreInfo')}</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleBookNow}
              className={`gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4 ${
                barber.description ? 'flex-[0.85]' : 'flex-1'
              } min-w-0 whitespace-nowrap justify-center rounded-[10px] bg-[rgb(37,70,103)]`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Image Viewer */}
      {isViewerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={closeViewer}
        >
          <div 
            className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={viewerImageIndex}
                src={carouselImages[viewerImageIndex]}
                alt={`${barber.name} - Image ${viewerImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onTouchStart={(e) => {
                  setTouchStart(e.touches[0].clientX);
                }}
                onTouchEnd={(e) => {
                  const touchEndX = e.changedTouches[0].clientX;
                  if (touchStart !== null) {
                    const distance = touchStart - touchEndX;
                    if (distance > MIN_SWIPE_DISTANCE) {
                      handleViewerNext();
                    } else if (distance < -MIN_SWIPE_DISTANCE) {
                      handleViewerPrev();
                    }
                  }
                  setTouchStart(null);
                }}
              />
            </AnimatePresence>

            {/* Navigation Buttons - Only show if multiple images */}
            {carouselImages.length > 1 && (
              <>
                <button
                  onClick={handleViewerPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/65 hover:bg-white/80 p-2 rounded-full shadow-lg transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-800" />
                </button>
                <button
                  onClick={handleViewerNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/65 hover:bg-white/80 p-2 rounded-full shadow-lg transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4 text-gray-800" />
                </button>

                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm">
                  {viewerImageIndex + 1} / {carouselImages.length}
                </div>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={closeViewer}
              className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all"
              aria-label="Close viewer"
            >
              <X className="w-6 h-6 text-gray-800" />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}