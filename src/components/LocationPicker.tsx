import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, MapPin, Locate, Loader2, Navigation, CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

const TASHKENT_CENTER = { lat: 41.2995, lng: 69.2401 };

interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (location: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
  initialLocation?: { lat: number; lng: number; address?: string };
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPicker({
  open,
  onClose,
  onConfirm,
  initialLocation,
}: LocationPickerProps) {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [L, setL] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  }>(initialLocation || TASHKENT_CENTER);
  const [selectedAddress, setSelectedAddress] = useState(
    initialLocation?.address || ''
  );
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Load Leaflet
  useEffect(() => {
    if (!open) return;
    const load = async () => {
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
    load();
  }, [open]);

  // Init map
  useEffect(() => {
    if (!open || !L || !mapRef.current || leafletMapRef.current) return;

    const center = initialLocation || TASHKENT_CENTER;

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: initialLocation ? 16 : 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    ).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Center pin marker
    const pinIcon = L.divIcon({
      className: 'custom-barber-pin',
      html: `
        <div style="
          width: 44px; height: 44px;
          border-radius: 50% 50% 50% 4px;
          background: #5B8CFF;
          border: 3px solid #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(91,140,255,0.45), 0 2px 6px rgba(0,0,0,0.1);
          transform: rotate(-45deg);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);">
            <circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>
          </svg>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
    });

    const marker = L.marker([center.lat, center.lng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setSelectedCoords({ lat: pos.lat, lng: pos.lng });
      reverseGeocode(pos.lat, pos.lng);
      map.panTo(pos, { animate: true });
    });

    // On map click, move pin
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setSelectedCoords({ lat, lng });
      reverseGeocode(lat, lng);
    });

    markerRef.current = marker;
    leafletMapRef.current = map;
    setMapReady(true);

    // Force resize after animation
    setTimeout(() => map.invalidateSize(), 350);

    return () => {
      map.remove();
      leafletMapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, [L, open]);

  // Reverse geocode
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
        { headers: { 'User-Agent': 'BardakApp/1.0' } }
      );
      const data = await res.json();
      if (data.display_name) {
        // Build a shorter address
        const addr = data.address || {};
        const parts = [
          addr.road || addr.pedestrian || addr.neighbourhood,
          addr.house_number,
          addr.suburb || addr.city_district,
          addr.city || addr.town,
        ].filter(Boolean);
        setSelectedAddress(parts.length > 0 ? parts.join(', ') : data.display_name);
      }
    } catch {
      // Silently fail — address just won't update
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // Search addresses with Nominatim
  const searchAddress = useCallback(
    async (query: string) => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setIsSearching(true);
      setSearchError('');
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query + ', Tashkent, Uzbekistan'
          )}&limit=5&addressdetails=1&accept-language=en`,
          { headers: { 'User-Agent': 'BardakApp/1.0' } }
        );
        const data: NominatimResult[] = await res.json();
        if (data.length === 0) {
          setSearchError(t('locationPicker.noResults'));
          setSuggestions([]);
        } else {
          setSuggestions(data);
          setSearchError('');
        }
        setShowSuggestions(true);
      } catch {
        setSearchError(t('locationPicker.searchError'));
        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        setIsSearching(false);
      }
    },
    [t]
  );

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => searchAddress(value), 400);
  };

  // Select suggestion
  const selectSuggestion = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedCoords({ lat, lng });

    // Build shorter address
    const parts = result.display_name.split(',').slice(0, 3).map((s) => s.trim());
    setSelectedAddress(parts.join(', '));

    setSearchQuery(parts.join(', '));
    setShowSuggestions(false);
    setSuggestions([]);

    // Move map + marker
    if (leafletMapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMapRef.current.setView([lat, lng], 16, { animate: true });
    }
  };

  // Use current location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedCoords({ lat, lng });
        reverseGeocode(lat, lng);
        if (leafletMapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          leafletMapRef.current.setView([lat, lng], 16, { animate: true });
        }
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    onConfirm({
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      address: selectedAddress,
    });
  };

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchError('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[440px] max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-[18px] h-[18px] text-primary" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                    {t('locationPicker.title')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {t('locationPicker.subtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Search + Suggestions */}
            <div className="px-5 pb-3 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t('locationPicker.searchPlaceholder')}
                  className="w-full h-11 pl-10 pr-20 rounded-xl bg-gray-50 border border-gray-200 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                  onFocus={() => {
                    if (suggestions.length > 0 || searchError) setShowSuggestions(true);
                  }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                        setShowSuggestions(false);
                        setSearchError('');
                      }}
                      className="p-1 rounded-lg hover:bg-gray-200/70 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={useCurrentLocation}
                    disabled={locationLoading}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                    title={t('locationPicker.useMyLocation')}
                  >
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Locate className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {isSearching && (
                  <div className="absolute right-16 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && (suggestions.length > 0 || searchError) && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-5 right-5 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg shadow-black/[0.06] z-10 overflow-hidden max-h-[200px] overflow-y-auto"
                  >
                    {searchError ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                        {searchError}
                      </div>
                    ) : (
                      suggestions.map((s) => (
                        <button
                          key={s.place_id}
                          onClick={() => selectSuggestion(s)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 transition-colors border-b border-gray-100 last:border-b-0 flex items-start gap-2.5"
                        >
                          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-[13px] leading-snug line-clamp-2">
                            {s.display_name}
                          </span>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mini map */}
            <div className="px-5 pb-3">
              <div
                ref={mapRef}
                className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
                style={{ height: '240px' }}
              />
              {!mapReady && (
                <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center" style={{ height: '240px', marginTop: '-240px', position: 'relative' }}>
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}
            </div>

            {/* Selected address display */}
            <div className="px-5 pb-4">
              {selectedAddress ? (
                <div className="flex items-start gap-2.5 bg-primary/5 rounded-xl px-3.5 py-2.5 border border-primary/10">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 leading-snug truncate">
                      {selectedAddress}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                    </p>
                  </div>
                </div>
              ) : isReverseGeocoding ? (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-200">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-[13px] text-muted-foreground">
                    {t('locationPicker.detectingAddress')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-200">
                  <Navigation className="w-4 h-4 text-muted-foreground/50" />
                  <span className="text-[13px] text-muted-foreground">
                    {t('locationPicker.hint')}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="px-5 pb-5 flex gap-2.5">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl text-[13px] font-semibold border-gray-200"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedAddress || isReverseGeocoding}
                className="flex-1 h-11 rounded-xl text-[13px] font-semibold bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 gap-1.5"
              >
                <MapPin className="w-4 h-4" />
                {t('locationPicker.confirm')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
