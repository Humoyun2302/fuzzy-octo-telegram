import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, User, MapPin, MessageCircle, Upload, Scissors, Camera, CheckCircle2, Users, Eye, EyeOff, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner@2.0.3';
import { SignupSubscriptionPlans } from './SignupSubscriptionPlans';
import { TermsModal } from './TermsModal';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { getDistrictKeys, translateDistrict } from '../utils/districtTranslations';

interface SignUpPageProps {
  onSignUp: (role: 'customer' | 'barber', userData: any) => void;
  onNavigateToLogin: () => void;
}

export function SignUpPage({ onSignUp, onNavigateToLogin }: SignUpPageProps) {
  const { t, language } = useLanguage();
  
  const [selectedRole, setSelectedRole] = useState<'customer' | 'barber'>(() => {
    const savedRole = localStorage.getItem('bardak_signup_role');
    return (savedRole === 'barber' || savedRole === 'customer') ? savedRole : 'customer';
  });
  
  useEffect(() => {
    localStorage.setItem('bardak_signup_role', selectedRole);
  }, [selectedRole]);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+998 ',
    password: '',
    confirmPassword: '',
    barbershopName: '',
    workingDistrict: '',
    languages: [] as string[],
    bio: '',
    profileImage: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tashkentDistricts = getDistrictKeys();

  const availableLanguages = ['Uzbek', 'Russian', 'English'];

  // Translation mapping for language names
  const getTranslatedLanguageName = (lang: string): string => {
    const languageMap: Record<string, string> = {
      'Uzbek': t('searchFilters.uzbek'),
      'Russian': t('searchFilters.russian'),
      'English': t('searchFilters.english'),
    };
    return languageMap[lang] || lang;
  };

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    return cleanPhone.startsWith('+998') && cleanPhone.length === 13;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('+998')) value = '+998 ';
    const cleaned = value.replace(/[^\d+\s]/g, '');
    if (cleaned.length > 4) {
      const digits = cleaned.slice(4).replace(/\s/g, '');
      let formatted = '+998 ';
      if (digits.length > 0) formatted += digits.slice(0, 2);
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
      if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
      setFormData({ ...formData, phone: formatted });
    } else {
      setFormData({ ...formData, phone: '+998 ' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Please fill out this field';
    if (!formData.phone.trim() || formData.phone === '+998 ') newErrors.phone = 'Please fill out this field';
    else if (!validatePhone(formData.phone)) newErrors.phone = 'Invalid phone number format';
    
    if (!formData.password || formData.password.length < 6) newErrors.password = t('auth.passwordMinLength');
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('auth.passwordsDontMatch');

    if (selectedRole === 'barber') {
      if (!formData.workingDistrict) newErrors.workingDistrict = 'Please select a district';
      if (formData.languages.length === 0) newErrors.languages = 'Please select at least one language';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('toast.imageSizeError') || "Image too large.");
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(t('toast.imageTypeError'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewImage(result);
        setFormData({ ...formData, profileImage: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleLanguage = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate terms acceptance FIRST
    if (!termsAccepted) {
      setErrors(prev => ({ ...prev, terms: t('auth.mustAcceptTerms') }));
      toast.error(t('auth.mustAcceptTerms'));
      return;
    }
    
    if (!validateForm()) {
      toast.error(t('toast.fixFormErrors'));
      return;
    }
    if (selectedRole === 'barber') {
      setShowPayment(true);
    } else {
      completeSignUp();
    }
  };

  const handlePaymentSuccess = (plan?: any) => {
    setShowPayment(false);
    completeSignUp(plan);
  };

  const completeSignUp = async (plan?: any) => {
    try {
      console.log("CUSTOMER SIGNUP START", { 
        phone: formData.phone.replace(/\s/g, ''), 
        fullName: formData.fullName,
        role: selectedRole 
      });

      // Call phone-only signup API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            phone: formData.phone.replace(/\s/g, ''), // Clean phone number
            password: formData.password,
            fullName: formData.fullName,
            role: selectedRole,
            barbershopName: selectedRole === 'barber' ? formData.barbershopName : undefined,
            workingDistrict: selectedRole === 'barber' ? formData.workingDistrict : undefined,
            languages: selectedRole === 'barber' ? formData.languages : undefined,
            subscriptionPlan: plan?.id || (selectedRole === 'barber' ? 'free_trial' : undefined),
          }),
        }
      );

      const data = await response.json();

      console.log("SIGNUP API RESPONSE", { status: response.status, data });

      if (!response.ok) {
        const errorMessage = data.error || 'Registration failed';
        
        console.error("CUSTOMER SIGNUP FAILED", { 
          status: response.status, 
          error: errorMessage,
          details: data.details 
        });
        
        // Check for duplicate phone number
        if (errorMessage.includes('already registered') || errorMessage.includes('Phone number already')) {
          if (selectedRole === 'customer') {
            toast.error(t('auth.userAlreadyExists') || "This phone number is already registered. Please login.");
          } else {
            toast.error(t('auth.userAlreadyExists') || "This phone number is already registered. Please login.");
          }
          // Don't close the modal, let user see the error and manually navigate
          return;
        }
        
        // Show specific error messages
        if (errorMessage.includes('Failed to create barber profile')) {
          toast.error("Failed to create barber profile. Please try again.");
        } else {
          // Show user-friendly error based on role
          if (selectedRole === 'customer') {
            const messages = {
              en: "Sign up failed. Please try again.",
              ru: "Ошибка регистрации. Попробуйте ещё раз.",
              uz: "Ro'yxatdan o'tishda xatolik. Qaytadan urinib ko'ring."
            };
            toast.error(messages[t('currentLang') as keyof typeof messages] || messages.en);
          } else {
            toast.error(errorMessage);
          }
        }
        // Keep the form visible so user can retry
        return;
      }

      // Registration successful!
      console.log('✅ Signup successful:', data);
      
      // CRITICAL: Check if there's a pending booking after signup
      const pendingBookingStr = localStorage.getItem('pendingBooking');
      
      if (pendingBookingStr && selectedRole === 'customer') {
        console.log('[SIGNUP] Pending booking detected, auto-logging in to complete booking...');
        
        // Auto-login the user to complete the booking
        try {
          const loginResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/auth/login`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({ 
                phone: formData.phone.replace(/\s/g, ''), 
                password: formData.password 
              }),
            }
          );

          const loginData = await loginResponse.json();

          if (loginResponse.ok) {
            console.log('[SIGNUP] Auto-login successful, processing pending booking...');
            
            // Store session token
            localStorage.setItem('bardak_session_token', loginData.sessionToken);
            
            // Show success message
            toast.success(t('toast.accountCreated') + ' Completing your booking...');
            
            // Reload the page to trigger auth flow and process pending booking
            // The App.tsx handleLogin flow will detect the pendingBooking and process it
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            return;
          } else {
            console.error('[SIGNUP] Auto-login failed after signup:', loginData);
            toast.error('Account created but login failed. Please login manually.');
            // Fall through to manual login flow
          }
        } catch (loginError) {
          console.error('[SIGNUP] Auto-login exception:', loginError);
          toast.error('Account created but login failed. Please login manually.');
          // Fall through to manual login flow
        }
      }
      
      if (selectedRole === 'barber') {
        toast.success(t('auth.barberProfileCreated') || "Barber profile created successfully! Please login.");
      } else {
        toast.success(t('toast.accountCreated'));
      }
      
      setShowSuccess(true);
      
      // Redirect to login after showing success message
      setTimeout(() => {
        onSignUp(selectedRole, data.profile);
        onNavigateToLogin();
      }, 2000);

    } catch (error: any) {
      console.error("CUSTOMER SIGNUP FAILED", error);
      
      // Show user-friendly error based on role
      if (selectedRole === 'customer') {
        const messages = {
          en: "Sign up failed. Please try again.",
          ru: "Ошибка регистрации. Попробуйте ещё раз.",
          uz: "Ro'yxatdan o'tishda xatolik. Qaytadan urinib ko'ring."
        };
        toast.error(messages[t('currentLang') as keyof typeof messages] || messages.en);
      } else {
        toast.error(error.message || "Registration failed. Please try again.");
      }
      // Keep the form visible so user can retry
    }
  };

  if (showSuccess) {
    return (
      <div className="flex-1 w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center p-6 min-h-screen relative overflow-hidden">
        {/* Background blobs for visual interest */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2"></div>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10 my-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center w-full"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-8 rounded-full bg-white border-4 border-blue-100 shadow-xl shadow-blue-100/50 flex items-center justify-center relative"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10"></div>
              <CheckCircle2 className="w-12 h-12 text-blue-600 relative z-10" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {selectedRole === 'customer' ? t('auth.welcomeCustomer') : t('auth.welcomeSoniya')}
            </h1>
            
            <p className="text-gray-500 mb-12 max-w-xs mx-auto leading-relaxed">
              {selectedRole === 'customer'
                ? t('auth.customerAccountCreatedDesc')
                : t('auth.barberProfileCreatedDesc')}
            </p>

            {/* Information Section */}
            <div className="mt-8 text-left space-y-8 w-full border-t border-gray-100 pt-8">
              {/* Brand Info */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Bardak</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t('footer.description')}
                </p>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('footer.contact')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Send className="w-4 h-4 text-blue-500" />
                    <span>@Humoyun_Z</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Send className="w-4 h-4 text-blue-500" />
                    <span>@Fozilbek_Shavkatov</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span>+998 90 920 55 30</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span>+998 99 870 17 87</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Copyright */}
            <div className="mt-12 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 mb-2">
                © 2026 Bardak. {t('footer.allRightsReserved')}
              </p>
              <div className="flex justify-center gap-4">
                <a href="#" className="text-xs text-blue-500 hover:underline">{t('footer.termsAndConditions')}</a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 bg-[rgb(252,253,255)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-[rgb(44,44,44)] mb-2 text-[36px] font-normal not-italic font-bold font-[Dela_Gothic_One]">{t('auth.appName')}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-[16px]">{t('auth.signUpTitle')}</p>
          </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[20px]">
          <CardHeader>
            <CardTitle className="text-center text-[20px]">{t('auth.signUpTitle')}</CardTitle>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedRole('customer')}
                className={`p-3 rounded-[12px] border transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                  selectedRole === 'customer'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-200 text-gray-600'
                }`}
              >
                <User className={`w-6 h-6 ${selectedRole === 'customer' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="text-sm font-semibold">{t('auth.customer')}</span>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedRole('barber')}
                className={`p-3 rounded-[12px] border transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                  selectedRole === 'barber'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 text-gray-600'
                }`}
              >
                <Scissors className={`w-6 h-6 ${selectedRole === 'barber' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm font-semibold">{t('auth.barber')}</span>
              </motion.button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {selectedRole === 'barber' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative">
                      <Avatar className="w-24 h-24 ring-4 ring-blue-100">
                        <AvatarImage src={previewImage} />
                        <AvatarFallback>
                          <Camera className="w-8 h-8" />
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {t('auth.uploadPhoto')}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <Label htmlFor="fullName">{t('auth.fullName')} {t('auth.required')}</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`pl-10 ${errors.fullName ? 'border-red-500' : ''}`}
                    placeholder={t('auth.enterFullName')}
                  />
                </div>
                {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <Label htmlFor="phone">{t('auth.phone')} {t('auth.required')}</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder={t('auth.enterPhone')}
                  />
                </div>
                {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="password">{t('auth.password')} {t('auth.required')}</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    placeholder={t('auth.passwordPlaceholder')}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')} {t('auth.required')}</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>

              <AnimatePresence mode="wait">
                {selectedRole === 'barber' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 pt-4 border-t"
                  >
                    <div>
                      <Label htmlFor="barbershopName">{t('auth.barbershopNameOptional')}</Label>
                      <Input
                        id="barbershopName"
                        value={formData.barbershopName}
                        onChange={(e) => setFormData({ ...formData, barbershopName: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="workingDistrict">{t('auth.workingDistrictRequired')}</Label>
                      <Select
                        value={formData.workingDistrict}
                        onValueChange={(value) => setFormData({ ...formData, workingDistrict: value })}
                      >
                        <SelectTrigger className={`mt-1 ${errors.workingDistrict ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder={t('auth.selectDistrict')} />
                        </SelectTrigger>
                        <SelectContent>
                          {tashkentDistricts.map((district) => (
                            <SelectItem key={district} value={district}>{translateDistrict(district, language)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.workingDistrict && <p className="text-sm text-red-500 mt-1">{errors.workingDistrict}</p>}
                    </div>

                    <div>
                      <Label>{t('auth.languagesSpokenRequired')}</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableLanguages.map((lang) => (
                          <Badge
                            key={lang}
                            variant={formData.languages.includes(lang) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleLanguage(lang)}
                          >
                            {getTranslatedLanguageName(lang)}
                          </Badge>
                        ))}
                      </div>
                      {errors.languages && <p className="text-sm text-red-500 mt-1">{errors.languages}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Terms & Conditions Checkbox */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <motion.div
                    animate={termsAccepted ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => {
                        setTermsAccepted(checked as boolean);
                        if (errors.terms) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.terms;
                            return newErrors;
                          });
                        }
                      }}
                      className={`mt-0.5 rounded-md border-2 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[rgb(54,108,255)] data-[state=checked]:to-[rgb(91,140,255)] data-[state=checked]:border-[rgb(54,108,255)] ${
                        errors.terms ? 'border-red-500' : ''
                      }`}
                    />
                  </motion.div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <Label htmlFor="terms" className="cursor-pointer inline">
                      {t('auth.acceptTermsPrefix')}{' '}
                    </Label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                      className="text-[rgb(54,108,255)] hover:text-[rgb(91,140,255)] underline font-medium"
                    >
                      {t('auth.acceptTermsLink')}
                    </button>
                    <span className="mx-1">{t('auth.acceptTermsSeparator')}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPrivacyModal(true);
                      }}
                      className="text-[rgb(54,108,255)] hover:text-[rgb(91,140,255)] underline font-medium"
                    >
                      {t('auth.acceptPrivacyLink')}
                    </button>

                  </div>
                </div>
                {errors.terms && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 mt-2 ml-8"
                  >
                    {t('auth.mustAcceptTerms')}
                  </motion.p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!termsAccepted}
                className="w-full transition-all duration-300 hover:shadow-lg rounded-[8px] text-[15px] bg-[rgb(16,37,58)] h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {selectedRole === 'barber' ? t('auth.continueToPayment') : t('common.signup')}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.alreadyHaveAccount')}{' '}
                <Button
                  type="button"
                  variant="link"
                  onClick={onNavigateToLogin}
                  className="p-0 h-auto text-[rgb(20,117,253)] hover:text-emerald-700"
                >
                  {t('common.login')}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      <AnimatePresence>
        {showPayment && (
          <SignupSubscriptionPlans
            onClose={() => setShowPayment(false)}
            onPaymentSuccess={handlePaymentSuccess}
            mode="signup"
          />
        )}
      </AnimatePresence>

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAgree={() => {
          setTermsAccepted(true);
          if (errors.terms) {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.terms;
              return newErrors;
            });
          }
        }}
        mode="terms"
      />

      <TermsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        mode="privacy"
      />
    </div>
  );
}