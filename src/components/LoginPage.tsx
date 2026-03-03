import { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, Lock, Scissors, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner@2.0.3';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';

interface LoginPageProps {
  onLogin: (phone: string, password: string) => Promise<{ success: boolean; error?: any }>;
  onNavigateToSignUp?: () => void;
}

export function LoginPage({ onLogin, onNavigateToSignUp }: LoginPageProps) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('+998 ');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showNotFoundActions, setShowNotFoundActions] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Ensure the value always starts with +998
    if (!value.startsWith('+998')) {
      value = '+998 ';
    }
    
    // Remove any non-numeric characters except + and spaces
    const cleaned = value.replace(/[^\d+\s]/g, '');
    
    // Reset errors when user types
    setLoginError(null);
    setShowNotFoundActions(false);
    
    // Format: +998 90 123 45 67
    if (cleaned.length > 4) {
      const digits = cleaned.slice(4).replace(/\s/g, '');
      let formatted = '+998 ';
      
      if (digits.length > 0) formatted += digits.slice(0, 2);
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
      if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
      
      setPhone(formatted);
    } else {
      setPhone('+998 ');
    }
  };

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    return cleanPhone.startsWith('+998') && cleanPhone.length === 13;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone(phone)) {
      return;
    }
    
    setIsLoading(true);
    setLoginError(null);
    setShowNotFoundActions(false);
    
    try {
      const result = await onLogin(phone, password);
      if (!result.success && result.error === 'account_not_found') {
         // Show inline error and actions
         setLoginError(t('auth.accountNotFound'));
         setShowNotFoundActions(true);
         
         // Autofocus the phone field so user can correct input
         setTimeout(() => {
           const phoneInput = document.getElementById('phone');
           if (phoneInput) phoneInput.focus();
         }, 100);

         // Log analytics event (mock)
         console.log('Analytics: auth_login_failed_notfound', { 
             phone: 'anonymized_phone', 
             timestamp: new Date().toISOString() 
         });
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            <p className="text-gray-600 dark:text-gray-400 text-[16px]">{t('auth.welcomeBack')}</p>
          </div>

          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-[20px]">
            <CardHeader>
              <CardTitle className="text-center text-[20px]">{t('auth.loginTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('auth.phoneNumber')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      value={phone}
                      onChange={handlePhoneChange}
                      className={`pl-10 ${loginError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      required
                    />
                  </div>
                  
                  {/* Inline Error and Actions for Account Not Found */}
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2"
                    >
                      <p className="text-sm text-red-500 font-medium mb-3 flex items-center gap-2" role="alert">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                        {loginError}
                      </p>
                      
                      {showNotFoundActions && (
                        <div className="flex gap-3 -mx-6 px-2 sm:mx-0 sm:px-0">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={onNavigateToSignUp}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-auto whitespace-normal py-2"
                          >
                            {t('auth.register')}
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 pr-10 ${loginError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <label htmlFor="remember" className="flex items-center gap-2.5 cursor-pointer group">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="h-4 w-4 sm:h-5 sm:w-5 rounded border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors select-none">
                      {t('auth.rememberMe')}
                    </span>
                  </label>
                  
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm text-[rgb(20,117,253)] hover:text-emerald-700 underline-offset-4 hover:underline font-medium justify-start sm:justify-end"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    {t('auth.forgotPassword')}
                  </Button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full transition-all duration-300 hover:shadow-lg rounded-[8px] text-[15px] bg-[rgb(16,37,58)]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : t('auth.loginButton')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            {t('auth.dontHaveAccount')}{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto bg-[rgba(1,87,160,0)] text-[rgb(20,117,253)]"
              onClick={onNavigateToSignUp}
            >
              {t('auth.signUpButton')}
            </Button>
          </p>
        </motion.div>
      </div>
      
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onSuccess={(resetPhone) => {
            setPhone(resetPhone);
            setPassword('');
          }}
        />
      )}
    </div>
  );
}