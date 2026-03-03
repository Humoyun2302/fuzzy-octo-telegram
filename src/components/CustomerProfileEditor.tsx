import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Save, Camera, User as UserIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User } from '../types';
import { toast } from 'sonner@2.0.3';
import { LanguageSelector } from './LanguageSelector';
import { supabase } from '../utils/supabase/client';
import { getDistrictKeys, translateDistrict } from '../utils/districtTranslations';

interface CustomerProfileEditorProps {
  customer: User;
  onClose: () => void;
  onSave: (updatedCustomer: User) => void;
}

export function CustomerProfileEditor({ customer, onClose, onSave }: CustomerProfileEditorProps) {
  const { t, language } = useLanguage();
  
  // CRITICAL: Fetch customer profile directly from Supabase - NEVER use prop/defaults as source of truth
  const [formData, setFormData] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [previewImage, setPreviewImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CRITICAL: Fetch customer profile from Supabase on mount and after save
  const fetchCustomerProfile = async () => {
    if (!customer.id) {
      console.error('[CUSTOMER PROFILE EDITOR] ❌ No customer ID provided');
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    console.log('[CUSTOMER PROFILE EDITOR] 🔍 Fetching customer profile from Supabase for ID:', customer.id);

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone, avatar, preferred_districts, updated_at')
        .eq('id', customer.id)
        .single();

      if (error) {
        console.error('[CUSTOMER PROFILE EDITOR] ❌ Error fetching customer profile:', error);
        setIsLoadingProfile(false);
        return;
      }

      if (!data) {
        console.error('[CUSTOMER PROFILE EDITOR] ❌ No customer data found');
        setIsLoadingProfile(false);
        return;
      }

      console.log('[CUSTOMER PROFILE EDITOR] ✅ Customer profile fetched from Supabase:', data);

      // Map database fields to UI model
      const customerFromDB: User = {
        id: data.id,
        role: 'customer',
        name: data.full_name || '',
        email: data.phone || '',
        phone: data.phone || '',
        avatar: data.avatar || '',
        preferredDistricts: Array.isArray(data.preferred_districts) ? data.preferred_districts : []
      };

      console.log('[CUSTOMER PROFILE EDITOR] 📋 Mapped customer data:', {
        name: customerFromDB.name,
        phone: customerFromDB.phone,
        preferredDistricts: customerFromDB.preferredDistricts
      });

      setFormData(customerFromDB);
      setPreviewImage(customerFromDB.avatar);
      setIsLoadingProfile(false);
    } catch (err) {
      console.error('[CUSTOMER PROFILE EDITOR] ❌ Exception fetching customer profile:', err);
      setIsLoadingProfile(false);
    }
  };

  // Fetch profile on mount and when customer.id changes
  useEffect(() => {
    fetchCustomerProfile();
  }, [customer.id]);

  // Log formData whenever it changes
  useEffect(() => {
    if (formData) {
      console.log('[CUSTOMER PROFILE EDITOR] 📊 FormData state updated:', {
        name: formData.name,
        phone: formData.phone,
        avatar: formData.avatar
      });
    }
  }, [formData]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  const tashkentDistricts = getDistrictKeys();

  const languages = ['Uzbek', 'Russian', 'English', 'Turkish'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      await onSave(formData);
      
      // CRITICAL: Re-fetch customer profile from Supabase after save to ensure UI shows DB state
      console.log('[CUSTOMER PROFILE EDITOR] 🔄 Re-fetching profile after save...');
      await fetchCustomerProfile();
      
      toast.success(t('toast.profileUpdated'));
      onClose();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('toast.imageSizeError'));
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('toast.imageTypeError'));
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        if (formData) {
          setFormData({ ...formData, avatar: result });
        }
        toast.success(t('toast.photoUploaded'));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleDistrict = (district: string) => {
    if (formData) {
      const currentDistricts = formData.preferredDistricts || [];
      setFormData({
        ...formData,
        preferredDistricts: currentDistricts.includes(district)
          ? currentDistricts.filter((d) => d !== district)
          : [...currentDistricts, district],
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const phoneRegex = /^\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/;
    if (phoneRegex.test(value) || value === '') {
      if (formData) {
        setFormData({ ...formData, phone: value });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-2xl md:max-h-[90vh] h-[95vh] md:h-auto md:rounded-2xl bg-white dark:bg-gray-800 flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl">{t('common.profile')}</h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {t('profileEditor.personalizeProfile')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0 ml-2 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 pb-20">
              {/* Profile picture section removed */}

              {/* Name */}
              <div>
                <Label htmlFor="name">{t('profileEditor.fullName')}</Label>
                <Input
                  id="name"
                  value={formData?.name || ''}
                  onChange={(e) => formData && setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('profileEditor.fullNamePlaceholder')}
                  required
                  disabled={!formData}
                />
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone">{t('profileEditor.phoneNumber')}</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    value={formData?.phone || ''}
                    onChange={handlePhoneChange}
                    placeholder="+998 90 123 45 67"
                    required
                    disabled={!formData}
                  />
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <LanguageSelector variant="inline" />
              </div>

            </form>
          )}
          </div>

        {/* Fixed Save Button */}
        <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4">
          <div className="flex gap-3">
            <Button 
              type="button"
              onClick={handleSubmit} 
              className="flex-1 h-12 gap-2 text-base bg-[rgb(5,20,45)]"
              size="lg"
            >
              <Save className="w-5 h-5" />
              {t('common.save')}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="h-12 px-6"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}