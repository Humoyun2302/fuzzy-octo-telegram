import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, X, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSuccess: (phone: string) => void;
}

export function ForgotPasswordModal({ onClose, onSuccess }: ForgotPasswordModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phone, setPhone] = useState('+998 ');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      setPhone(formatted);
    } else {
      setPhone('+998 ');
    }
  };

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    return cleanPhone.startsWith('+998') && cleanPhone.length === 13;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone(phone)) {
      toast.error('Invalid phone number format');
      return;
    }

    setIsLoading(true);
    
    try {
      // Send OTP via our phone-only API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/auth/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ phone: phone.replace(/\s/g, '') }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      toast.success(`${t('auth.smsSentWithCode')} ${phone}`);
      setStep('verify');
    } catch (error: any) {
      console.error('Send OTP error:', error);
      toast.error(t('auth.failedToSendCode'), {
        description: error.message || phone
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('auth.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordsDontMatch'));
      return;
    }

    setIsLoading(true);

    try {
      // Reset password using our phone-only API
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            phone: phone.replace(/\s/g, ''),
            otp: code,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success(t('auth.passwordUpdatedSuccessfully'));
      setTimeout(() => {
        onSuccess(phone);
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
            <CardTitle className="text-center pr-8">
              {t('auth.resetPassword')}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {step === 'phone' ? (
                <motion.form
                  key="phone-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleSendCode}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="reset-phone">{t('auth.phoneNumber')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="reset-phone"
                        type="tel"
                        placeholder="+998 90 123 45 67"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      {t('auth.enterCodeSentToPhone')}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : t('auth.sendCode')}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="verify-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleVerifyAndReset}
                  className="space-y-4"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('phone')}
                    className="mb-2"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('auth.backToLogin')}
                  </Button>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code">{t('auth.enterCodeSentToPhone')}</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-2xl tracking-widest"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder={t('auth.enterNewPassword')}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder={t('auth.confirmPasswordPlaceholder')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : t('auth.verifyAndReset')}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}