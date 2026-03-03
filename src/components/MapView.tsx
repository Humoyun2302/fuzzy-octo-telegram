import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Locate, Loader2, MapPin, Scissors
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Barber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const TASHKENT_CENTER = { lat: 41.2995, lng: 69.2401 };

interface MapViewProps {
  barbers: Barber[];
  isBarbersLoading?: boolean;
  onBookNow: (barber: Barber) => void;
  onViewProfile?: (barber: Barber) => void;
  focusBarberId?: string | null;
  onFocusHandled?: () => void;
}

export function MapView({ barbers, isBarbersLoading, onBookNow, onViewProfile, focusBarberId, onFocusHandled }: MapViewProps) {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [L, setL] = useState<any>(null);

  // Only include barbers with saved coordinates
  const barbersWithLocation = useMemo(() => {
    return barbers.filter(
      (b) => b.workplaceCoordinates?.lat && b.workplaceCoordinates?.lng
    );
  }, [barbers]);

  const filteredBarbers = barbersWithLocation;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('uz-UZ').format(price);

  // Load Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const leaflet = await import('leaflet');
      setL(leaflet.default || leaflet);
    };
    loadLeaflet();
  }, []);

  // Init map
  useEffect(() => {
    if (!L || !mapRef.current || leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [TASHKENT_CENTER.lat, TASHKENT_CENTER.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    ).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    leafletMapRef.current = map;
    setMapLoaded(true);

    map.on('click', () => {
      setSelectedBarber(null);
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [L]);

  // Custom pin icon
  const createPinIcon = useCallback(
    (isSelected: boolean) => {
      if (!L) return null;
      const size = isSelected ? 46 : 38;
      return L.divIcon({
        className: 'custom-barber-pin',
        html: `
          <div style="
            width: ${size}px; height: ${size}px;
            border-radius: 50% 50% 50% 4px;
            background: ${isSelected ? '#5B8CFF' : '#ffffff'};
            border: 2.5px solid #5B8CFF;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 16px rgba(91,140,255,${isSelected ? '0.45' : '0.2'}),
                        0 1px 4px rgba(0,0,0,0.08);
            transform: rotate(-45deg);
            transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
          ">
            <svg width="${isSelected ? 20 : 16}" height="${isSelected ? 20 : 16}" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? '#fff' : '#5B8CFF'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);">
              <circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>
            </svg>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
      });
    },
    [L]
  );

  // Update markers when filtered barbers or selection changes
  useEffect(() => {
    if (!L || !leafletMapRef.current || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredBarbers.forEach((barber) => {
      const coords = barber.workplaceCoordinates;
      if (!coords) return;

      const isSelected = selectedBarber?.id === barber.id;
      const icon = createPinIcon(isSelected);
      if (!icon) return;

      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(
        leafletMapRef.current
      );

      marker.on('click', (e: any) => {
        e.originalEvent?.stopPropagation();
        setSelectedBarber(barber);
        leafletMapRef.current?.panTo([coords.lat, coords.lng], {
          animate: true,
          duration: 0.4,
        });
      });

      markersRef.current.push(marker);
    });
  }, [L, filteredBarbers, mapLoaded, selectedBarber, createPinIcon]);

  // Auto-focus on a specific barber when navigated from address click
  useEffect(() => {
    if (!focusBarberId || !L || !leafletMapRef.current || !mapLoaded) return;

    const barber = filteredBarbers.find((b) => b.id === focusBarberId);
    if (!barber?.workplaceCoordinates) {
      // Barber has no coordinates on map — clear focus and bail
      onFocusHandled?.();
      return;
    }

    const { lat, lng } = barber.workplaceCoordinates;

    // Zoom in and center on the barber with a smooth animation
    leafletMapRef.current.flyTo([lat, lng], 16, {
      animate: true,
      duration: 0.8,
    });

    // Select the barber so the bottom card slides up
    setSelectedBarber(barber);

    // Signal that focus has been consumed
    onFocusHandled?.();
  }, [focusBarberId, L, mapLoaded, filteredBarbers, onFocusHandled]);

  const closeCard = () => setSelectedBarber(null);

  const getDisplayAddress = (barber: Barber) =>
    barber.workplaceAddress || barber.districts?.[0] || '';

  const getStartingPrice = (barber: Barber) => {
    if (barber.priceRange?.min > 0) return barber.priceRange.min;
    if (barber.services?.length) {
      return Math.min(...barber.services.map((s) => s.price));
    }
    return 0;
  };

  return (
    <div
      className="relative w-full flex-1 flex flex-col"
      style={{ minHeight: 'calc(100vh - 56px)' }}
    >
      {/* Map */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Loading overlay */}
      {(!mapLoaded || isBarbersLoading) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground font-medium">
              {t('map.loadingMap')}
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      <AnimatePresence>
        {mapLoaded && !isBarbersLoading && filteredBarbers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-black/[0.06] p-7 text-center max-w-[300px] w-[calc(100%-2rem)] border border-white/70"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-[15px] font-semibold text-gray-800 mb-1.5">
              {t('map.noBarbersFound')}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('map.tryAdjustFilters')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barber count pill */}
      {mapLoaded &&
        !isBarbersLoading &&
        filteredBarbers.length > 0 &&
        !selectedBarber && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md rounded-full px-5 py-2.5 shadow-lg shadow-black/[0.06] border border-white/70 flex items-center gap-2"
          >
            <Scissors className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-gray-700">
              {t('map.barbersNearby', { count: filteredBarbers.length })}
            </span>
          </motion.div>
        )}

      {/* Bottom floating card */}
      <AnimatePresence>
        {selectedBarber && (
          <motion.div
            key={selectedBarber.id}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 26,
              stiffness: 320,
              mass: 0.8,
            }}
            className="absolute left-3 right-3 z-30"
            style={{ bottom: 'calc(68px + 12px)' }}
          >
            <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.10)] border border-gray-100/80 overflow-hidden">
              {/* Close button */}
              <button
                onClick={closeCard}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>

              <div className="p-4">
                <div className="flex items-center gap-3.5">
                  {/* Avatar */}
                  <Avatar className="w-[56px] h-[56px] rounded-2xl border-2 border-primary/10 shadow-sm flex-shrink-0">
                    <AvatarImage
                      src={selectedBarber.avatar}
                      alt={
                        selectedBarber.barbershopName || selectedBarber.name
                      }
                    />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-lg">
                      {(
                        selectedBarber.barbershopName || selectedBarber.name
                      ).charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="font-bold text-[15px] text-gray-900 truncate leading-snug">
                      {selectedBarber.barbershopName || selectedBarber.name}
                    </h3>

                    {getDisplayAddress(selectedBarber) && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0 text-muted-foreground/70" />
                        {getDisplayAddress(selectedBarber)}
                      </p>
                    )}

                    {getStartingPrice(selectedBarber) > 0 && (
                      <p className="text-[13px] font-semibold text-primary mt-1.5">
                        {t('map.from')}{' '}
                        {formatPrice(getStartingPrice(selectedBarber))} UZS
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2.5 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 rounded-xl text-[13px] font-semibold border-gray-200 hover:bg-gray-50 transition-colors"
                    onClick={() => onViewProfile?.(selectedBarber)}
                  >
                    {t('map.viewProfile')}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-10 rounded-xl text-[13px] font-semibold bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all gap-1.5"
                    onClick={() => onBookNow(selectedBarber)}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    {t('common.bookNow')}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}