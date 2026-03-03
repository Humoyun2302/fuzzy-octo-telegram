import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { Barber } from '../types';

interface IncompleteProfileBannerProps {
  barberProfile: Barber;
  onCompleteSetup: () => void;
}

export function IncompleteProfileBanner({ barberProfile, onCompleteSetup }: IncompleteProfileBannerProps) {
  const { t } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);

  // Check if profile is complete
  useEffect(() => {
    const checkProfileCompleteness = () => {
      // Required fields for a complete profile
      const hasDistricts = Array.isArray(barberProfile.districts) && barberProfile.districts.length > 0;
      const hasLanguages = Array.isArray(barberProfile.languages) && barberProfile.languages.length > 0;
      const hasServices = Array.isArray(barberProfile.services) && barberProfile.services.length > 0;

      // Debug logging to understand what's being checked
      console.log('[INCOMPLETE PROFILE BANNER] Profile completeness check:', {
        barberId: barberProfile.id,
        barberName: barberProfile.name,
        hasDistricts,
        districts: barberProfile.districts,
        districtsType: typeof barberProfile.districts,
        districtsIsArray: Array.isArray(barberProfile.districts),
        districtsLength: barberProfile.districts?.length,
        hasLanguages,
        languages: barberProfile.languages,
        languagesType: typeof barberProfile.languages,
        languagesIsArray: Array.isArray(barberProfile.languages),
        languagesLength: barberProfile.languages?.length,
        hasServices,
        services: barberProfile.services,
        servicesType: typeof barberProfile.services,
        servicesIsArray: Array.isArray(barberProfile.services),
        servicesCount: barberProfile.services?.length || 0,
        fullProfile: barberProfile
      });

      // Check if all required fields are filled
      const isComplete = hasDistricts && hasLanguages && hasServices;
      setIsProfileComplete(isComplete);

      console.log('[INCOMPLETE PROFILE BANNER] Profile is complete:', isComplete);
      console.log('[INCOMPLETE PROFILE BANNER] Will show banner:', !isComplete && !isDismissed);

      // If profile becomes complete, mark as dismissed
      if (isComplete) {
        localStorage.removeItem('trimly_profile_banner_dismissed');
      }
    };

    checkProfileCompleteness();
  }, [barberProfile, isDismissed]);

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('trimly_profile_banner_dismissed');
    if (dismissed === 'true' && !isProfileComplete) {
      setIsDismissed(true);
    }
  }, [isProfileComplete]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('trimly_profile_banner_dismissed', 'true');
  };

  const handleCompleteSetup = () => {
    setIsDismissed(false);
    localStorage.removeItem('trimly_profile_banner_dismissed');
    onCompleteSetup();
  };

  // Don't show if profile is complete or if dismissed
  return null;
}


// Export a function to check if profile is complete (can be used elsewhere in the app)
export function isBarberProfileComplete(barber: Barber): boolean {
  const hasDistricts = Array.isArray(barber.districts) && barber.districts.length > 0;
  const hasLanguages = Array.isArray(barber.languages) && barber.languages.length > 0;
  const hasServices = Array.isArray(barber.services) && barber.services.length > 0;
  
  return hasDistricts && hasLanguages && hasServices;
}