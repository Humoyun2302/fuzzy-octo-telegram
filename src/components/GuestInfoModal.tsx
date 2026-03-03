import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useLanguage } from '../contexts/LanguageContext';

interface GuestInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (guestInfo: { name: string; phone: string }) => void;
}

export function GuestInfoModal({
  isOpen,
  onClose,
  onSubmit,
}: GuestInfoModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string } = {};

    if (!name.trim()) {
      newErrors.name = t('booking.nameRequired') || 'Name is required';
    }

    if (!phone.trim()) {
      newErrors.phone = t('booking.phoneRequired') || 'Phone number is required';
    } else if (phone.trim().length < 9) {
      newErrors.phone = t('booking.phoneInvalid') || 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({ name: name.trim(), phone: phone.trim() });
      // Reset form
      setName('');
      setPhone('');
      setErrors({});
    }
  };

  const handleClose = () => {
    setName('');
    setPhone('');
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto"
          >
            <div className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl">
              {/* Header */}
              <div className="relative p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={handleClose}
                  className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {t('booking.guestInfo') || 'Your Information'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('booking.guestInfoSubtitle') || 'We need a few details to confirm your booking'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="guest-name" className="text-sm font-medium">
                    {t('booking.fullName') || 'Full Name'} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="guest-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors({ ...errors, name: undefined });
                      }}
                      placeholder={t('booking.enterFullName') || 'Enter your full name'}
                      className={`pl-10 h-12 ${errors.name ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <Label htmlFor="guest-phone" className="text-sm font-medium">
                    {t('booking.phoneNumber') || 'Phone Number'} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="guest-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        let input = e.target.value;
                        
                        // Always ensure it starts with +998
                        if (!input.startsWith('+998')) {
                          input = '+998 ';
                        }
                        
                        // Extract only digits after +998
                        const digitsOnly = input.slice(4).replace(/\D/g, '');
                        
                        // Limit to 9 digits
                        const limitedDigits = digitsOnly.slice(0, 9);
                        
                        // Format as XX XXX XX XX
                        let formatted = '+998';
                        if (limitedDigits.length > 0) {
                          formatted += ' ' + limitedDigits.slice(0, 2);
                        }
                        if (limitedDigits.length > 2) {
                          formatted += ' ' + limitedDigits.slice(2, 5);
                        }
                        if (limitedDigits.length > 5) {
                          formatted += ' ' + limitedDigits.slice(5, 7);
                        }
                        if (limitedDigits.length > 7) {
                          formatted += ' ' + limitedDigits.slice(7, 9);
                        }
                        
                        setPhone(formatted);
                        if (errors.phone) setErrors({ ...errors, phone: undefined });
                      }}
                      onFocus={(e) => {
                        // Set default value on focus if empty
                        if (!phone || phone === '') {
                          setPhone('+998 ');
                        }
                      }}
                      placeholder="+998 XX XXX XX XX"
                      className={`pl-10 h-12 ${errors.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                  )}
                </div>

                {/* Info Note */}
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('booking.guestInfoNote') || 'Your booking will be confirmed via SMS. No account will be created.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    {t('common.continue') || 'Continue'}
                  </Button>
                </div>
              </form>

              {/* Safe area padding for mobile */}
              <div className="h-safe pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}