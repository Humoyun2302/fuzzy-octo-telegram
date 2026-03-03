import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, X, Star, MapPin, Languages, Baby } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { BarberCard } from './BarberCard';
import { Barber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getDistrictKeys, translateDistrict } from '../utils/districtTranslations';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';

interface SearchFiltersProps {
  barbers: Barber[];
  isBarbersLoading?: boolean;
  onBookNow: (barber: Barber) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (barberId: string) => void;
  priorityBarberId?: string | null;
  onShowOnMap?: (barber: Barber) => void;
}

export function SearchFilters({ barbers, isBarbersLoading = false, onBookNow, favoriteIds, onToggleFavorite, priorityBarberId, onShowOnMap }: SearchFiltersProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [showOnlyKidsServices, setShowOnlyKidsServices] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const priorityBarberRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 10;

  const allLanguages = ['Any', 'Uzbek', 'Russian', 'English'];
  const tashkentDistricts = getDistrictKeys();

  const filteredBarbers = barbers.filter((barber) => {
    // Note: Subscription visibility check is already done in App.tsx before barbers are passed to this component
    // We only need to apply search, price, language, district, favorites, and kids service filters here

    const matchesSearch =
      searchQuery === '' ||
      barber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barber.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPrice =
      barber.priceRange.min <= priceRange[1] && barber.priceRange.max >= priceRange[0];

    // If "Any" is selected or no languages selected, language doesn't matter
    const matchesLanguage =
      selectedLanguages.length === 0 ||
      selectedLanguages.includes('Any') ||
      selectedLanguages.some((lang) => barber.languages.includes(lang));

    const matchesDistrict =
      selectedDistricts.length === 0 ||
      selectedDistricts.some((district) => barber.districts.includes(district));

    const matchesKidsService =
      !showOnlyKidsServices || (showOnlyKidsServices && barber.servicesForKids);

    return (
      matchesSearch &&
      matchesPrice &&
      matchesLanguage &&
      matchesDistrict &&
      matchesKidsService
    );
  });

  // Calculate pagination
  // If a priority barber is set, move them to the front
  const sortedBarbers = useMemo(() => {
    if (!priorityBarberId) return filteredBarbers;
    
    const priorityBarber = filteredBarbers.find(b => b.id === priorityBarberId);
    if (!priorityBarber) return filteredBarbers;
    
    // Move priority barber to front
    return [priorityBarber, ...filteredBarbers.filter(b => b.id !== priorityBarberId)];
  }, [filteredBarbers, priorityBarberId]);
  
  const totalPages = Math.ceil(sortedBarbers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBarbers = sortedBarbers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchQuery('');
    setPriceRange([0, 1000000]);
    setSelectedLanguages([]);
    setSelectedDistricts([]);
    setShowOnlyKidsServices(false);
    setCurrentPage(1);
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) => {
      // If clicking "Any", clear all other selections
      if (lang === 'Any') {
        return prev.includes('Any') ? [] : ['Any'];
      }
      // If clicking a specific language, remove "Any" if it's selected
      const withoutAny = prev.filter(l => l !== 'Any');
      return withoutAny.includes(lang) 
        ? withoutAny.filter((l) => l !== lang) 
        : [...withoutAny, lang];
    });
    handleFilterChange();
  };

  const toggleDistrict = (district: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(district) ? prev.filter((d) => d !== district) : [...prev, district]
    );
    handleFilterChange();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  // Helper function to generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }

      // Show pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };
  
  // Scroll to priority barber when it appears
  useEffect(() => {
    if (priorityBarberId && priorityBarberRef.current && !isBarbersLoading) {
      // Wait for render, then scroll with center alignment
      setTimeout(() => {
        priorityBarberRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 500);
    }
  }, [priorityBarberId, isBarbersLoading, paginatedBarbers]);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
        <Input
          placeholder={t('searchFilters.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleFilterChange();
          }}
          className="pl-14 pr-36 h-12 text-base"
        />
        <Button
          variant="default"
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 p-0 rounded-lg"
        >
          <Filter className="w-4 h-4" />
          {(selectedLanguages.length > 0 || selectedDistricts.length > 0) && (
            <Badge variant="default" className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white border-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
              {selectedLanguages.length + selectedDistricts.length}
            </Badge>
          )}
        </Button>
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-md bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Price Range */}
                  <div className="space-y-4 bg-[rgba(0,0,0,0)]">
                    <Label>{t('searchFilters.priceRange')}</Label>
                    <Slider
                      value={priceRange}
                      onValueChange={(value) => {
                        setPriceRange(value);
                        handleFilterChange();
                      }}
                      min={0}
                      max={1000000}
                      step={10000}
                      className="w-full py-4"
                    />
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500 mb-1.5 block">{t('searchFilters.minPrice') || 'Min (UZS)'}</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={priceRange[1]}
                            value={priceRange[0]}
                            onChange={(e) => {
                              const val = Math.min(Number(e.target.value), priceRange[1]);
                              setPriceRange([val, priceRange[1]]);
                              handleFilterChange();
                            }}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500 mb-1.5 block">{t('searchFilters.maxPrice') || 'Max (UZS)'}</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min={priceRange[0]}
                            value={priceRange[1]}
                            onChange={(e) => {
                              const val = Math.max(Number(e.target.value), priceRange[0]);
                              setPriceRange([priceRange[0], val]);
                              handleFilterChange();
                            }}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Districts */}
                <div className="space-y-3">
                  <Label>{t('searchFilters.districtsOfTashkent')}</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-lg bg-white dark:bg-gray-900">
                    {tashkentDistricts.map((district) => (
                      <motion.div
                        key={district}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          variant={selectedDistricts.includes(district) ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5 text-sm transition-all duration-200"
                          onClick={() => toggleDistrict(district)}
                        >
                          {translateDistrict(district, language)}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-3">
                  <Label>{t('searchFilters.languages')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {allLanguages.map((lang) => (
                      <motion.div
                        key={lang}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge
                          variant={selectedLanguages.includes(lang) ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5 text-sm transition-all duration-200 text-left"
                          onClick={() => {
                            toggleLanguage(lang);
                            handleFilterChange();
                          }}
                        >
                          {t(`searchFilters.${lang.toLowerCase()}`)}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Show only kids services option */}
                <div className="space-y-3">
                  <div 
                    className="flex items-center cursor-pointer group"
                    onClick={() => {
                      setShowOnlyKidsServices(!showOnlyKidsServices);
                      handleFilterChange();
                    }}
                  >
                    <Baby
                      className={`w-5 h-5 shrink-0 transition-colors duration-200 mr-3 ${
                        showOnlyKidsServices ? 'text-pink-500 fill-pink-500' : 'text-gray-400 group-hover:text-pink-400'
                      }`}
                    />
                    <Label className="cursor-pointer flex-1 whitespace-normal leading-snug font-sans">
                      {t('searchFilters.showOnlyKidsServices')}
                    </Label>
                  </div>
                </div>

                {/* Reset Button */}
                <Button variant="outline" onClick={handleReset} className="w-full gap-2">
                  <X className="w-4 h-4" />
                  {t('searchFilters.resetFilters')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
        </span>
        {filteredBarbers.length > 0 && filteredBarbers.length < barbers.length && (
          <span className="text-emerald-600"></span>
        )}
      </div>

      {/* Barber Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isBarbersLoading ? (
          <>
            <style>{`
              @keyframes shimmer {
                100% { transform: translateX(100%); }
              }
            `}</style>
            {[...Array(6)].map((_, index) => (
              <div 
                key={`skeleton-${index}`} 
                className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full"
              >
                {/* Image Skeleton */}
                <div className="w-full h-48 bg-gray-50 relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                </div>
                
                <div className="p-4 space-y-3 flex flex-col flex-1">
                   {/* Name Skeleton */}
                   <div className="h-6 w-3/4 bg-gray-50 rounded-md relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                   </div>
                   {/* Address Skeleton */}
                   <div className="h-4 w-1/2 bg-gray-50 rounded-md relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                   </div>
                   
                   <div className="flex-1" />
                   
                   {/* Button Skeleton */}
                   <div className="h-10 w-full bg-gray-50 rounded-lg relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                   </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          paginatedBarbers.map((barber, index) => {
            const isPriority = barber.id === priorityBarberId;
            
            if (isPriority) {
              return (
                <motion.div
                  key={barber.id}
                  ref={priorityBarberRef}
                  initial={{ opacity: 0, scale: 0.9, x: -50 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    x: 0,
                  }}
                  transition={{ 
                    duration: 0.6,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                  }}
                  className="relative"
                >
                  {/* Highlight ring animation */}
                  <motion.div
                    className="absolute -inset-1 rounded-[24px] bg-[#5B8CFF] opacity-90 blur-md"
                    animate={{
                      opacity: [0.6, 0.9, 0.6],
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: 3,
                      ease: "easeInOut"
                    }}
                  />
                  
                  <div className="relative">
                    <BarberCard
                      barber={barber}
                      onBookNow={onBookNow}
                      isFavorite={favoriteIds?.includes(barber.id)}
                      onToggleFavorite={onToggleFavorite}
                      onShowOnMap={onShowOnMap}
                    />
                  </div>
                  
                  {/* "Shared with you" badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                  >
                    <Badge className="bg-[#5B8CFF] text-white shadow-lg px-4 py-1.5 text-sm font-semibold border-2 border-white">
                      ✨ {t('searchFilters.sharedWithYou') || 'Shared with you'}
                    </Badge>
                  </motion.div>
                </motion.div>
              );
            }
            
            return (
              <BarberCard
                key={barber.id}
                barber={barber}
                onBookNow={onBookNow}
                isFavorite={favoriteIds?.includes(barber.id)}
                onToggleFavorite={onToggleFavorite}
                onShowOnMap={onShowOnMap}
              />
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!isBarbersLoading && filteredBarbers.length > ITEMS_PER_PAGE && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-8"
        >
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {getPageNumbers().map((page, idx) => (
                <PaginationItem key={idx}>
                  {typeof page === 'number' ? (
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  ) : (
                    <PaginationEllipsis />
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </motion.div>
      )}

      {!isBarbersLoading && barbers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-gray-600 mb-4">{t('searchFilters.noBarbersYet')}</p>
        </motion.div>
      ) : !isBarbersLoading && filteredBarbers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-gray-600 mb-4">{t('searchFilters.noResultsFound')}</p>
          <Button variant="outline" onClick={handleReset}>
            {t('searchFilters.resetFilters')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}