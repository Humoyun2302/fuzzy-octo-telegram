import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Save, Camera, MapPin, Languages as LanguagesIcon, DollarSign, ArrowLeft, Check, AlertTriangle, Baby, Mail, Trash2, Navigation } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Barber, Service, GalleryImage } from '../types';
import { toast } from 'sonner@2.0.3';
import { ServicesManager } from './ServicesManager';
import { InteriorExteriorGallery } from './InteriorExteriorGallery';
import { BarberCard } from './BarberCard';
import { PublicLinkSection } from './PublicLinkSection';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getDistrictKeys, translateDistrict, findDistrictKey } from '../utils/districtTranslations';
import { LocationPicker } from './LocationPicker';

interface BarberProfileEditorProps {
  barber: Barber;
  onClose: () => void;
  onSave: (updatedBarber: Barber) => void;
}

export function BarberProfileEditor({ barber, onClose, onSave }: BarberProfileEditorProps) {
  const { t, language } = useLanguage();
  
  // CRITICAL: Fetch barber profile directly from Supabase - NEVER use prop/defaults as source of truth
  const [formData, setFormData] = useState<Barber | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [previewImage, setPreviewImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Location picker state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // NEW: Snapshot-based dirty state tracking
  // This stores the last saved state from Supabase
  const savedSnapshotRef = useRef<{
    formData: Barber | null;
    previewImage: string;
    services: Service[];
    interiorExteriorPhotos: GalleryImage[];
  }>({
    formData: null,
    previewImage: '',
    services: [],
    interiorExteriorPhotos: []
  });
  
  // Track if we're in the middle of loading/saving to prevent marking form as dirty
  const isLoadingOrSavingRef = useRef(false);
  
  // NEW: Track uploaded avatar file for Supabase Storage
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // CRITICAL: Fetch barber profile from Supabase on mount and after save
  const fetchBarberProfile = async (skipLoadingFlag = false) => {
    if (!barber.id) {
      console.error('[BARBER PROFILE EDITOR] ❌ No barber ID provided');
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    if (!skipLoadingFlag) {
      isLoadingOrSavingRef.current = true;
    }
    console.log('[BARBER PROFILE EDITOR] 🔍 Fetching barber profile from BARBERS TABLE for ID:', barber.id);

    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', barber.id)
        .single();

      if (error) {
        console.error('[BARBER PROFILE EDITOR] ❌ Error fetching from barbers table:', error);
        
        // If barber doesn't exist, create initial profile
        if (error.code === 'PGRST116') {
          console.log('[BARBER PROFILE EDITOR] 📝 Creating new barber profile...');
          
          const { data: newBarber, error: insertError } = await supabase
            .from('barbers')
            .insert({
              id: barber.id,
              full_name: barber.name || '',
              phone: barber.phone || '',
              bio: '',
              avatar: '',
              working_district: '',
              districts: [],
              languages: [],
              location: '',
              address: '',
              google_maps_url: '',
              gallery: [],
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('[BARBER PROFILE EDITOR] ❌ Error creating barber:', insertError);
            toast.error('Failed to create barber profile');
            setIsLoadingProfile(false);
            return;
          }
          
          console.log('[BARBER PROFILE EDITOR] ✅ New barber profile created:', newBarber);
          
          // Use the newly created barber data
          setFormData({
            id: newBarber.id,
            role: 'barber',
            name: newBarber.full_name || '',
            email: newBarber.phone || '',
            phone: newBarber.phone || '',
            avatar: newBarber.avatar || '',
            bio: newBarber.bio || '',
            description: newBarber.description || '',
            barbershopName: newBarber.barbershop_name || '',
            services: [],
            districts: Array.isArray(newBarber.districts) ? newBarber.districts : [],
            languages: Array.isArray(newBarber.languages) ? newBarber.languages : [],
            specialties: [],
            gallery: Array.isArray(newBarber.gallery) ? newBarber.gallery : [],
            interiorExteriorPhotos: [],
            working_hours: {},
            priceRange: { min: 0, max: 0 },
            subscriptionStatus: newBarber.subscription_status,
            subscriptionExpiryDate: newBarber.subscription_expiry_date,
            currentPlan: newBarber.subscription_plan,
            trialUsed: newBarber.trial_used,
            rating: newBarber.rating || 5.0,
            reviewCount: newBarber.review_count || 0,
            address: newBarber.address || '',
            workingDistrict: newBarber.working_district || '',
            workplaceAddress: newBarber.address || '',
            googleMapsUrl: newBarber.google_maps_url || '',
            workplaceCoordinates: (() => {
              try {
                if (newBarber.google_maps_url) {
                  const parsed = JSON.parse(newBarber.google_maps_url);
                  if (parsed?.lat && parsed?.lng) return { lat: parsed.lat, lng: parsed.lng };
                }
              } catch { /* Not JSON, ignore */ }
              return undefined;
            })(),
            servicesForKids: newBarber.services_for_kids ?? false
          });
          setPreviewImage(newBarber.avatar || '');
          setHasUnsavedChanges(false);
          setIsLoadingProfile(false);
          return;
        }
        
        setIsLoadingProfile(false);
        return;
      }

      console.log('[BARBER PROFILE EDITOR] ✅ Barber data fetched:', {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone
      });

      // Map database fields to form data
      const barberData: Barber = {
        id: data.id,
        role: 'barber',
        name: data.full_name || '',
        email: data.phone || '',
        phone: data.phone || '',
        avatar: data.avatar || '',
        bio: data.bio || '',
        description: data.description || '',
        barbershopName: data.barbershop_name || '',
        services: [],
        districts: Array.isArray(data.districts) ? data.districts : [],
        languages: Array.isArray(data.languages) ? data.languages : [],
        specialties: [],
        gallery: Array.isArray(data.gallery) ? data.gallery : [],
        interiorExteriorPhotos: Array.isArray(data.gallery) ? data.gallery.map((url: string, idx: number) => ({
          id: `img-${Date.now()}-${idx}`,
          url,
          orderIndex: idx
        })) : [],
        working_hours: {},
        priceRange: { min: 0, max: 0 },
        subscriptionStatus: data.subscription_status,
        subscriptionExpiryDate: data.subscription_expiry_date,
        currentPlan: data.subscription_plan,
        trialUsed: data.trial_used,
        rating: data.rating || 5.0,
        reviewCount: data.review_count || 0,
        address: data.address || data.location || '',
        workingDistrict: data.working_district || '',
        workplaceAddress: data.address || data.location || '',
        googleMapsUrl: data.google_maps_url || '',
        workplaceCoordinates: (() => {
          // Parse coordinates stored as JSON in google_maps_url
          try {
            if (data.google_maps_url) {
              const parsed = JSON.parse(data.google_maps_url);
              if (parsed?.lat && parsed?.lng) return { lat: parsed.lat, lng: parsed.lng };
            }
          } catch { /* Not JSON, ignore */ }
          return undefined;
        })(),
        servicesForKids: data.services_for_kids ?? false
      };

      console.log('[BARBER PROFILE EDITOR] ✅ Form data set:', {
        name: barberData.name,
        phone: barberData.phone,
        workplaceCoordinates: barberData.workplaceCoordinates,
      });

      setFormData(barberData);
      setPreviewImage(barberData.avatar);
      setHasUnsavedChanges(false);
      setIsLoadingProfile(false);
    } catch (err) {
      console.error('[BARBER PROFILE EDITOR] ❌ Exception:', err);
      toast.error('Failed to load barber profile');
      setIsLoadingProfile(false);
    } finally {
      if (!skipLoadingFlag) {
        isLoadingOrSavingRef.current = false;
      }
    }
  };

  // Fetch profile on mount and when barber.id changes
  useEffect(() => {
    fetchBarberProfile();
  }, [barber.id]);
  
  // Handle browser back button and page close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  // CRITICAL: Fetch services directly from Supabase - NEVER use prop or defaults
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // Fetch services from Supabase on mount and when barber.id changes
  useEffect(() => {
    const fetchServices = async () => {
      if (!barber.id) {
        console.log('[BARBER PROFILE EDITOR] ⚠️ No barber ID, skipping service fetch');
        setServices([]);
        setServicesLoading(false);
        return;
      }

      setServicesLoading(true);
      setServicesError(null);
      
      console.log('[BARBER PROFILE EDITOR] 🔍 Fetching services from Supabase for barber:', barber.id);

      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, barber_id, name, duration, price, description, created_at, updated_at')
          .eq('barber_id', barber.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[BARBER PROFILE EDITOR] ❌ Error fetching services:', error);
          setServicesError('Failed to load services');
          setServices([]);
        } else {
          console.log('[BARBER PROFILE EDITOR] ✅ Services fetched from Supabase:', data?.length || 0);
          console.log('[BARBER PROFILE EDITOR] 📋 Services data:', JSON.stringify(data, null, 2));
          setServices(data || []);
        }
      } catch (err) {
        console.error('[BARBER PROFILE EDITOR] ❌ Exception fetching services:', err);
        setServicesError('Failed to load services');
        setServices([])
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, [barber.id]);
  
  // Update snapshot when all data has finished loading (profile + services + photos)
  useEffect(() => {
    // Only update snapshot when everything is loaded and we're NOT in the middle of loading/saving
    if (!isLoadingProfile && !servicesLoading && formData && !isLoadingOrSavingRef.current) {
      console.log('[BARBER PROFILE EDITOR] 📸 Initial data loaded - updating snapshot');
      
      // Use a timeout to ensure this happens after the render cycle
      const timeoutId = setTimeout(() => {
        savedSnapshotRef.current = {
          formData: JSON.parse(JSON.stringify(formData)),
          previewImage: previewImage,
          services: JSON.parse(JSON.stringify(services)),
          interiorExteriorPhotos: JSON.parse(JSON.stringify(interiorExteriorPhotos))
        };
        console.log('[BARBER PROFILE EDITOR] ✅ Snapshot updated');
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoadingProfile, servicesLoading]);
  
  // Interior/exterior photos - managed separately, synced with formData.gallery
  const [interiorExteriorPhotos, setInteriorExteriorPhotos] = useState<GalleryImage[]>([]);

  // Update interior/exterior photos when formData changes
  useEffect(() => {
    if (!formData) return;
    
    if (formData.interiorExteriorPhotos && Array.isArray(formData.interiorExteriorPhotos) && formData.interiorExteriorPhotos.length > 0) {
      setInteriorExteriorPhotos(formData.interiorExteriorPhotos);
    } else if (formData.gallery && Array.isArray(formData.gallery) && formData.gallery.length > 0) {
      setInteriorExteriorPhotos(formData.gallery.map((url, index) => ({
        id: `image-${Date.now()}-${index}`,
        url,
        orderIndex: index
      })));
    } else {
      setInteriorExteriorPhotos([]);
    }
  }, [formData]);

  const tashkentDistricts = getDistrictKeys();

  const availableLanguages = ['Uzbek', 'Russian', 'English'];

  // Compute price range from services
  // CRITICAL: Must match the calculation in App.tsx and BarberCard
  const computedPriceRange = useMemo(() => {
    if (services.length === 0) {
      return { min: 0, max: 0 };
    }
    const prices = services.map(s => s.price);
    return {
      min: Math.min(...prices), // Cheapest single service
      max: Math.max(...prices) // Most expensive single service (NOT sum)
    };
  }, [services]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow re-selecting the same file
    e.target.value = '';

    // 1. Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('toast.imageSizeError'));
      return;
    }

    // 2. Validate file format (only JPG, PNG, WEBP)
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type.toLowerCase())) {
      toast.error(t('toast.invalidFileFormat'));
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // 3. Generate unique filename using UUID
      const fileExt = file.name.split('.').pop() || 'jpg';
      const uniqueFilename = `${barber.id}-${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `avatars/${uniqueFilename}`;

      console.log('[AVATAR UPLOAD] 📤 Uploading new avatar:', filePath);

      // 4. Upload new image to Supabase Storage FIRST
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('barber-images')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false // Don't overwrite, use unique names
        });

      if (uploadError) {
        console.error('[AVATAR UPLOAD] ❌ Upload failed:', uploadError);
        throw uploadError;
      }

      console.log('[AVATAR UPLOAD] ✅ Upload successful:', uploadData.path);

      // 5. Get public URL for the new avatar
      const { data: urlData } = supabase.storage
        .from('barber-images')
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;
      console.log('[AVATAR UPLOAD] 🔗 New avatar URL:', newAvatarUrl);

      // 6. Delete old avatar from storage (if exists and is a storage URL)
      const oldAvatarUrl = formData?.avatar || '';
      if (oldAvatarUrl && oldAvatarUrl.includes('barber-images/avatars/')) {
        try {
          const oldPath = oldAvatarUrl.split('barber-images/')[1];
          console.log('[AVATAR UPLOAD] 🗑️ Deleting old avatar:', oldPath);
          await supabase.storage.from('barber-images').remove([oldPath]);
          console.log('[AVATAR UPLOAD] ✅ Old avatar deleted');
        } catch (deleteError) {
          console.warn('[AVATAR UPLOAD] ⚠️ Failed to delete old avatar:', deleteError);
          // Non-critical error, continue
        }
      }

      // 7. Update database with new avatar URL
      const { error: dbError } = await supabase
        .from('barbers')
        .update({ avatar: newAvatarUrl })
        .eq('id', barber.id);

      if (dbError) {
        console.error('[AVATAR UPLOAD] ❌ Database update failed:', dbError);
        // Cleanup: delete the newly uploaded file
        await supabase.storage.from('barber-images').remove([filePath]);
        throw dbError;
      }

      console.log('[AVATAR UPLOAD] ✅ Database updated successfully');

      // 8. Update local state
      setPreviewImage(newAvatarUrl);
      setFormData(prev => prev ? { ...prev, avatar: newAvatarUrl } : prev);
      setAvatarFile(null);

      toast.success(t('toast.avatarUploadSuccess'));
    } catch (error) {
      console.error('[AVATAR UPLOAD] ❌ Error:', error);
      toast.error(t('toast.avatarUploadFailed'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!formData?.avatar) return;

    const confirmed = window.confirm(t('common.confirmDelete') || 'Are you sure you want to delete your avatar?');
    if (!confirmed) return;

    setIsUploadingAvatar(true);

    try {
      const oldAvatarUrl = formData.avatar;

      // 1. Delete from storage if it's a storage URL
      if (oldAvatarUrl.includes('barber-images/avatars/')) {
        try {
          const oldPath = oldAvatarUrl.split('barber-images/')[1];
          console.log('[AVATAR DELETE] 🗑️ Deleting avatar from storage:', oldPath);
          await supabase.storage.from('barber-images').remove([oldPath]);
          console.log('[AVATAR DELETE] ✅ Avatar deleted from storage');
        } catch (storageError) {
          console.warn('[AVATAR DELETE] ⚠️ Storage deletion warning:', storageError);
        }
      }

      // 2. Update database - set avatar to empty string
      const { error: dbError } = await supabase
        .from('barbers')
        .update({ avatar: '' })
        .eq('id', barber.id);

      if (dbError) {
        console.error('[AVATAR DELETE] ❌ Database update failed:', dbError);
        throw dbError;
      }

      console.log('[AVATAR DELETE] ✅ Database updated successfully');

      // 3. Update local state
      setPreviewImage('');
      setFormData(prev => prev ? { ...prev, avatar: '' } : prev);
      setAvatarFile(null);

      toast.success(t('toast.avatarDeleteSuccess'));
    } catch (error) {
      console.error('[AVATAR DELETE] ❌ Error:', error);
      toast.error(t('toast.avatarDeleteFailed'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const toggleDistrict = (district: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const currentDistricts = Array.isArray(prev?.districts) ? prev?.districts : [];
      return {
        ...prev,
        districts: [district], // Single district selection
      };
    });
  };

  const toggleLanguage = (language: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const currentLanguages = Array.isArray(prev?.languages) ? prev?.languages : [];
      return {
        ...prev,
        languages: currentLanguages.includes(language)
          ? currentLanguages.filter((l) => l !== language)
          : [...currentLanguages, language],
      };
    });
  };

  // Create a preview barber object with current form data
  const previewBarber: Barber | null = useMemo(() => {
    if (!formData) return null;
    
    return {
      ...formData,
      // Ensure array fields are always arrays for preview
      districts: Array.isArray(formData?.districts) ? formData?.districts : [],
      languages: Array.isArray(formData?.languages) ? formData?.languages : [],
      gallery: Array.isArray(interiorExteriorPhotos) ? interiorExteriorPhotos.map(img => img.url) : [],
      avatar: previewImage,
      services: services,
      priceRange: computedPriceRange,
      interiorExteriorPhotos,
    };
  }, [formData, previewImage, services, computedPriceRange, interiorExteriorPhotos]);

  // Deep comparison helper for detecting real changes
  const hasRealChanges = useMemo(() => {
    if (isLoadingOrSavingRef.current || !formData || !savedSnapshotRef.current.formData) {
      return false;
    }

    const snapshot = savedSnapshotRef.current;
    
    // Compare basic fields
    if (formData.name !== snapshot.formData.name) return true;
    if (formData.phone !== snapshot.formData.phone) return true;
    if (formData.bio !== snapshot.formData.bio) return true;
    if (formData.description !== snapshot.formData.description) return true;
    if (formData.barbershopName !== snapshot.formData.barbershopName) return true;
    if (formData.workplaceAddress !== snapshot.formData.workplaceAddress) return true;
    if (formData.googleMapsUrl !== snapshot.formData.googleMapsUrl) return true;
    if (JSON.stringify(formData.workplaceCoordinates) !== JSON.stringify(snapshot.formData.workplaceCoordinates)) return true;
    if (formData.servicesForKids !== snapshot.formData.servicesForKids) return true;
    
    // Compare avatar
    if (previewImage !== snapshot.previewImage) return true;
    
    // Compare districts (array)
    const currentDistricts = JSON.stringify(formData.districts?.sort() || []);
    const savedDistricts = JSON.stringify(snapshot.formData.districts?.sort() || []);
    if (currentDistricts !== savedDistricts) return true;
    
    // Compare languages (array)
    const currentLanguages = JSON.stringify(formData.languages?.sort() || []);
    const savedLanguages = JSON.stringify(snapshot.formData.languages?.sort() || []);
    if (currentLanguages !== savedLanguages) return true;
    
    // Compare services
    if (services.length !== snapshot.services.length) return true;
    const servicesMatch = services.every((svc, idx) => {
      const savedSvc = snapshot.services[idx];
      if (!savedSvc) return false;
      return svc.name === savedSvc.name && 
             svc.price === savedSvc.price && 
             svc.duration === savedSvc.duration &&
             svc.description === savedSvc.description;
    });
    if (!servicesMatch) return true;
    
    // Compare gallery photos
    const currentPhotos = interiorExteriorPhotos.map(p => p.url).sort().join(',');
    const savedPhotos = snapshot.interiorExteriorPhotos.map(p => p.url).sort().join(',');
    if (currentPhotos !== savedPhotos) return true;
    
    return false;
  }, [formData, previewImage, services, interiorExteriorPhotos]);

  // Update hasUnsavedChanges based on deep comparison
  useEffect(() => {
    if (isLoadingOrSavingRef.current) {
      return;
    }
    setHasUnsavedChanges(hasRealChanges);
  }, [hasRealChanges]);

  // Manual save button handler - ONLY way to save profile
  const handleManualSave = async () => {
    // Validation
    if (services.length === 0) {
      toast.error(t('toast.addOneService'));
      return;
    }

    // REMOVED: Minimum photo requirement - gallery can be empty (0 images allowed)
    
    if (interiorExteriorPhotos.length > 4) {
      toast.error(t('toast.maxPhotosAllowed'));
      return;
    }

    if (formData?.districts.length === 0) {
      toast.error(t('toast.selectDistrict'));
      return;
    }

    if (formData?.languages.length === 0) {
      toast.error(t('toast.selectOneLanguage'));
      return;
    }

    setIsSaving(true);
    isLoadingOrSavingRef.current = true;

    try {
      console.log('[STORAGE] 🚀 Starting image upload process...');
      
      // Avatar is now uploaded immediately on selection, so we just use the current URL
      const finalAvatarUrl = formData?.avatar || '';
      console.log('[STORAGE] ℹ️ Using current avatar URL:', finalAvatarUrl);
      
      // Upload gallery images to Supabase Storage
      let finalGalleryUrls: string[] = [];
      
      // Separate existing URLs from new data URLs
      const existingUrls = interiorExteriorPhotos.filter(img => img.url.startsWith('http')).map(img => img.url);
      const newImages = interiorExteriorPhotos.filter(img => img.url.startsWith('data:'));
      
      console.log('[STORAGE] 📊 Gallery status:', {
        total: interiorExteriorPhotos.length,
        existing: existingUrls.length,
        new: newImages.length
      });
      
      // Keep existing URLs
      finalGalleryUrls = [...existingUrls];
      
      // Upload new images
      if (newImages.length > 0) {
        console.log('[STORAGE] 📤 Uploading new gallery images...');
        
        for (const img of newImages) {
          try {
            // Convert data URL to blob
            const response = await fetch(img.url);
            const blob = await response.blob();
            
            // Generate unique filename
            const uuid = crypto.randomUUID();
            const fileExt = blob.type.split('/')[1];
            const filePath = `galleries/${barber.id}/${uuid}.${fileExt}`;
            
            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('barber-images')
              .upload(filePath, blob, {
                contentType: blob.type
              });
            
            if (uploadError) {
              console.error('[STORAGE] ❌ Gallery image upload error:', uploadError);
            } else {
              // Get public URL
              const { data: urlData } = supabase.storage
                .from('barber-images')
                .getPublicUrl(filePath);
              
              finalGalleryUrls.push(urlData.publicUrl);
              console.log('[STORAGE] ✅ Gallery image uploaded:', urlData.publicUrl);
            }
          } catch (err) {
            console.error('[STORAGE] ❌ Error processing gallery image:', err);
          }
        }
      }
      
      console.log('[STORAGE] 📋 Final image URLs:', {
        avatar: finalAvatarUrl,
        gallery: finalGalleryUrls.length
      });
      
      // Build complete barber profile with ALL fields needed for Supabase
      const updatedBarber: Barber = {
        ...formData,
        avatar: finalAvatarUrl, // Use uploaded URL or existing
        services,
        priceRange: computedPriceRange,
        interiorExteriorPhotos,
        gallery: finalGalleryUrls, // Array of public URLs only
        // Map workplaceAddress to location field for Supabase
        location: formData?.workplaceAddress || '',
        // Extract service names as specialties for backward compatibility
        specialties: services.map(s => s.name),
      };

      console.log('📋 BarberProfileEditor: Saving profile with fields:', {
        name: updatedBarber.name,
        phone: updatedBarber.phone,
        location: updatedBarber.location,
        workplaceAddress: updatedBarber.workplaceAddress,
        googleMapsUrl: updatedBarber.googleMapsUrl,
        workplaceCoordinates: updatedBarber.workplaceCoordinates,
        languages: updatedBarber.languages,
        districts: updatedBarber.districts,
        specialties: updatedBarber.specialties,
        servicesCount: updatedBarber.services?.length || 0,
        galleryCount: updatedBarber.gallery?.length || 0,
        priceRange: updatedBarber.priceRange,
        avatarUrl: updatedBarber.avatar
      });

      // Call the onSave handler which updates Supabase
      await onSave(updatedBarber);
      
      // Reset avatar file state after successful save
      setAvatarFile(null);
      
      // Mark as clean immediately after successful save (BEFORE refetch)
      setHasUnsavedChanges(false);
      
      // Show success notification immediately for responsive UX
      toast.success(t('barber.edit.saveSuccessComplete'));
      
      // CRITICAL: Re-fetch barber profile from Supabase in background to ensure UI shows DB state
      console.log('[BARBER PROFILE EDITOR] 🔄 Re-fetching profile after save...');
      await fetchBarberProfile(true);
      
      // Update saved snapshot with current state
      savedSnapshotRef.current = {
        formData: updatedBarber,
        previewImage: finalAvatarUrl,
        services: updatedBarber.services,
        interiorExteriorPhotos: updatedBarber.interiorExteriorPhotos
      };
      
    } catch (error) {
      console.error('❌ Error saving barber profile:', error);
      toast.error(t('barber.edit.saveError'));
    } finally {
      setIsSaving(false);
      isLoadingOrSavingRef.current = false;
    }
  };

  // Handle back/close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  // Confirm close without saving
  const confirmCloseWithoutSaving = () => {
    setShowUnsavedWarning(false);
    onClose();
  };

  // Cancel close and continue editing
  const cancelClose = () => {
    setShowUnsavedWarning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4 pb-24 lg:pb-8">
      <div className="w-full max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            {/* Top Bar - Back Button & Dirty State Indicator */}
            <div className="flex items-center justify-between mt-[-29px] mr-[0px] mb-[5px] ml-[0px] px-[0px] py-[1px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="gap-2 mx-[-17px] my-[0px] whitespace-normal h-auto py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.back')}
              </Button>
              
              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && !isSaving && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('barber.edit.unsavedChanges')}</span>
                </motion.div>
              )}
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-2xl md:text-3xl">{t('barber.editProfile')}</h2>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                {t('barber.updateProfileInfo')}
              </p>
              {/* Computed Price Range Preview */}
              {services.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {t('barber.priceRangeLabel')}: {formatPrice(computedPriceRange.min)} - {formatPrice(computedPriceRange.max)} UZS
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Photo */}
              <div className="bg-white dark:bg-gray-800 rounded-[20px] border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    {isUploadingAvatar && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full"
                      >
                        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      </motion.div>
                    )}
                    <Avatar className={`w-32 h-32 ring-4 ring-primary/20 ${isUploadingAvatar ? 'opacity-50' : ''}`}>
                      <AvatarImage src={previewImage} alt={formData?.name} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-3xl font-bold">
                        {formData?.name?.charAt(0)?.toUpperCase() || 'B'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Upload button - bottom right */}
                    <button
                      type="button"
                      onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 w-10 h-10 rounded-full icon-3d flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
                      title={t('profileEditor.uploadPhoto')}
                    >
                      <Camera className="w-5 h-5 text-primary-foreground" />
                    </button>
                    
                    {/* Delete button - bottom left (only show if avatar exists) */}
                    {previewImage && (
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={isUploadingAvatar}
                        className="absolute bottom-0 left-0 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 hover:from-red-600 hover:to-red-700"
                        title={t('common.delete') || 'Delete avatar'}
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                  </div>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar || isSaving}
                      className="gap-2 whitespace-normal h-auto py-2 px-4 max-w-full"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {t('common.uploading') || 'Uploading...'}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {t('profileEditor.uploadPhoto')}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('profileEditor.maxSizeFormats')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="bg-white dark:bg-gray-800 rounded-[20px] border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="leading-normal block h-auto mb-1.5">{t('profileEditor.fullName')} <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={formData?.name || ''}
                    onChange={(e) => formData && setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('profileEditor.fullNamePlaceholder')}
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone" className="leading-normal block h-auto mb-1.5">{t('profileEditor.phoneNumber')}</Label>
                  <Input
                    id="phone"
                    value={formData?.phone || ''}
                    onChange={(e) => formData && setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                  />
                </div>

                {/* Barbershop Name */}
                <div>
                  <Label htmlFor="barbershopName" className="leading-normal block h-auto mb-1.5">{t('auth.barbershopNameOptional')}</Label>
                  <Input
                    id="barbershopName"
                    value={formData?.barbershopName || ''}
                    onChange={(e) => formData && setFormData({ ...formData, barbershopName: e.target.value })}
                    placeholder={t('profileEditor.barbershopNamePlaceholder') || 'e.g., Style Masters'}
                  />
                </div>
              </div>

              {/* Public Profile Link */}
              <PublicLinkSection
                barberId={barber.id}
                currentUsername={formData?.username}
                onUsernameUpdate={(newUsername) => {
                  if (formData) {
                    setFormData({ ...formData, username: newUsername });
                  }
                }}
              />

              {/* Services Management */}
              <div className="bg-white dark:bg-gray-800 rounded-[20px] border border-gray-200 dark:border-gray-700 p-6">
                <ServicesManager
                  services={services}
                  onServicesChange={setServices}
                />
              </div>

              {/* Interior/Exterior Photos */}
              <div className="bg-white dark:bg-gray-800 rounded-[20px] border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <InteriorExteriorGallery
                  images={interiorExteriorPhotos}
                  onImagesChange={setInteriorExteriorPhotos}
                  minImages={0}
                  maxImages={4}
                />
              </div>

              {/* Location & Languages */}
              <div className="bg-white dark:bg-gray-800 rounded-[20px] border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Districts */}
                <div>
                  <Label className="flex items-center gap-2 mb-2 sm:mb-3 leading-normal flex-wrap h-auto">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="break-words">{t('profileEditor.workingDistrict')}</span> <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {tashkentDistricts.map((district) => (
                      <Badge
                        key={district}
                        variant={(Array.isArray(formData?.districts) ? formData?.districts : []).includes(district) ? 'default' : 'outline'}
                        className="cursor-pointer px-3 py-2 text-sm transition-all whitespace-normal h-auto text-center"
                        onClick={() => toggleDistrict(district)}
                      >
                        {translateDistrict(district, language)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Languages */}
                <div>
                  <Label className="flex items-center gap-2 mb-2 sm:mb-3 leading-normal flex-wrap h-auto">
                    <LanguagesIcon className="w-4 h-4 shrink-0" />
                    <span className="break-words">{t('profileEditor.languagesSpoken')}</span> <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableLanguages.map((language) => (
                      <Badge
                        key={language}
                        variant={(Array.isArray(formData?.languages) ? formData?.languages : []).includes(language) ? 'default' : 'outline'}
                        className="cursor-pointer px-3 py-2 text-sm transition-all whitespace-normal h-auto text-center"
                        onClick={() => toggleLanguage(language)}
                      >
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Services for Kids Toggle */}
                <div>
                  <Label className="flex items-center gap-2 mb-2 leading-normal flex-wrap h-auto">
                    <Baby className="w-4 h-4 shrink-0" />
                    <span className="break-words">{t('profileEditor.servicesForKids')}</span>
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('profileEditor.servicesForKidsDescription')}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant={formData?.servicesForKids === true ? 'default' : 'outline'}
                      className={`flex-1 ${
                        formData?.servicesForKids === true
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => formData && setFormData({ ...formData, servicesForKids: true })}
                      disabled={!formData}
                    >
                      {t('common.yes')}
                    </Button>
                    <Button
                      type="button"
                      variant={formData?.servicesForKids === false ? 'default' : 'outline'}
                      className={`flex-1 ${
                        formData?.servicesForKids === false
                          ? 'bg-black hover:bg-gray-900 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => formData && setFormData({ ...formData, servicesForKids: false })}
                      disabled={!formData}
                    >
                      {t('common.no')}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Salon Location - In-app Location Picker */}
                <div>
                  <Label className="flex items-center gap-2 mb-2 leading-normal h-auto">
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span>{t('locationPicker.salonLocation')}</span>
                  </Label>

                  {formData?.workplaceCoordinates?.lat && formData?.workplaceCoordinates?.lng ? (
                    <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 leading-snug">
                            {formData.workplaceAddress || t('locationPicker.locationSet')}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formData.workplaceCoordinates.lat.toFixed(5)}, {formData.workplaceCoordinates.lng.toFixed(5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
                          onClick={() => setShowLocationPicker(true)}
                          disabled={!formData}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {t('locationPicker.changeLocation')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-xl text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 px-3"
                          onClick={() => {
                            if (formData) {
                              setFormData({
                                ...formData,
                                workplaceCoordinates: undefined,
                                workplaceAddress: '',
                                googleMapsUrl: '',
                              });
                            }
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-5 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <MapPin className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {t('locationPicker.addHint')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl text-sm font-semibold gap-2 px-5 border-primary/20 text-primary hover:bg-primary/5"
                        onClick={() => setShowLocationPicker(true)}
                        disabled={!formData}
                      >
                        <MapPin className="w-4 h-4" />
                        {t('locationPicker.addLocation')}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Barber Description */}
                <div>
                  <Label htmlFor="description" className="mb-2 block leading-normal h-auto">
                    {t('profileEditor.description')} 
                    <span className="text-gray-400 text-xs ml-1">({t('common.optional')})</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData?.description || ''}
                    onChange={(e) => formData && setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('profileEditor.descriptionPlaceholder')}
                    disabled={!formData}
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    {(formData?.description || '').length}/500
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <div className="text-center bg-white dark:bg-gray-800 rounded-[20px] border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {t('profileEditor.preview')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('profileEditor.howCustomersSeeYou')}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-[20px] border border-gray-200 dark:border-gray-700">
                  {previewBarber ? (
                    <BarberCard
                      barber={previewBarber}
                      onBookNow={() => {}}
                      showShareButton={false}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                {/* Delete Account / Support Section */}
                <div className="bg-white dark:bg-gray-800 rounded-[20px] border border-gray-200 dark:border-gray-700 mb-[16px] p-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-gray-500" />
                    {t('barber.edit.deleteAccount')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    {t('barber.edit.supportContact')}
                  </p>
                  <a
                    href="https://t.me/soniyasupport"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-[20px] border border-gray-200 dark:border-gray-600 transition-all duration-300 flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    {t('barber.edit.contactSupportButton')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save Button - Fixed at bottom on mobile, always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg lg:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Button
            onClick={handleManualSave}
            disabled={isSaving}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-[20px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {t('barber.edit.saving')}
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {t('barber.edit.saveButtonLabel')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Desktop Save Button - At the bottom of content */}
      <div className="hidden lg:block w-full max-w-7xl mx-auto px-4 pb-8">
        <Button
          onClick={handleManualSave}
          disabled={isSaving}
          className="w-full h-14 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {t('barber.edit.saving')}
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {t('barber.edit.saveButtonLabel')}
            </>
          )}
        </Button>
      </div>

      {/* Location Picker Modal */}
      <LocationPicker
        open={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={(location) => {
          if (formData) {
            setFormData({
              ...formData,
              workplaceCoordinates: { lat: location.lat, lng: location.lng },
              workplaceAddress: location.address,
              googleMapsUrl: JSON.stringify({ lat: location.lat, lng: location.lng }),
            });
          }
          setShowLocationPicker(false);
        }}
        initialLocation={
          formData?.workplaceCoordinates?.lat && formData?.workplaceCoordinates?.lng
            ? { lat: formData.workplaceCoordinates.lat, lng: formData.workplaceCoordinates.lng, address: formData.workplaceAddress }
            : undefined
        }
      />

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              cancelClose();
            }
          }}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-[20px] shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t('barber.edit.unsavedChanges')}
              </h3>
              <button
                type="button"
                onClick={cancelClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {t('barber.edit.unsavedChangesWarning')}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
              <Button
                onClick={cancelClose}
                variant="outline"
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 w-full sm:w-auto px-6"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={confirmCloseWithoutSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto px-6"
              >
                {t('common.closeWithoutSaving')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}