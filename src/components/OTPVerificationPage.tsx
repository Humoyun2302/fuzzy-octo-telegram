import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Scissors, ArrowLeft, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner@2.0.3';

interface OTPVerificationPageProps {
  phone: string;
  onVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
  onResendCode: () => Promise<void>;
  onBack: () => void;
}

export function OTPVerificationPage({ phone, onVerify, onResendCode, onBack }: OTPVerificationPageProps) {
  const { t } = useLanguage();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
      setError(null);
    }
    // Handle left/right arrow keys
    else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only accept 6-digit numeric codes
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      setError(null);
      inputRefs.current[5]?.focus();
      
      // Auto-submit pasted code
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await onVerify(code);
      
      if (!result.success) {
        setError(result.error || t('auth.otpIncorrect'));
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        
        // Log analytics event
        console.log('Analytics: auth_otp_fail', { 
          phone: 'anonymized_phone', 
          timestamp: new Date().toISOString() 
        });
      } else {
        // Log analytics event
        console.log('Analytics: auth_otp_success', { 
          phone: 'anonymized_phone', 
          timestamp: new Date().toISOString() 
        });
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(t('auth.otpVerificationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      await onResendCode();
      toast.success(`${t('auth.otpResent')} - ${phone}`);
      setResendCooldown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      // Log analytics event
      console.log('Analytics: auth_otp_resend', { 
        phone: 'anonymized_phone', 
        timestamp: new Date().toISOString() 
      });
    } catch (err) {
      console.error('Resend OTP error:', err);
      toast.error(t('auth.otpResendFailed'));
    }
  };

  const maskPhone = (phone: string) => {
    // Format: +998 XX XXX XX XX
    if (phone.length < 13) return phone;
    const cleaned = phone.replace(/\s/g, '');
    return `+998 ${cleaned[4]}${cleaned[5]} XXX ${cleaned[10]}${cleaned[11]} ${cleaned[12]}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
            <CardHeader className="space-y-4 text-center pb-6">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg"
              >
                <Shield className="w-8 h-8 text-white" />
              </motion.div>

              <div>
                <CardTitle className="text-2xl text-gray-900 dark:text-white">
                  {t('auth.verifyPhone')}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  {t('auth.otpSentTo')} <strong>{maskPhone(phone)}</strong>
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* OTP Input Boxes */}
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isLoading}
                    className={`w-12 h-14 text-center text-2xl font-semibold rounded-lg border-2 transition-all
                      ${digit ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-white'}
                      ${error ? 'border-red-500 bg-red-50' : ''}
                      focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none
                      disabled:opacity-50 disabled:cursor-not-allowed
                      dark:bg-gray-700 dark:border-gray-600 dark:text-white
                    `}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Resend Code Button */}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.didntReceiveCode')}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {canResend 
                    ? t('auth.resendCode') 
                    : `${t('auth.resendCodeIn')} ${resendCooldown}s`
                  }
                </Button>
              </div>

              {/* Back Button */}
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('auth.backToLogin')}
              </Button>

              {/* Help Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth.needHelp')}
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  {t('auth.contactSupport')}
                </Button>
              </div>

              {/* Demo Notice */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                  <strong>Demo Mode:</strong> Use code <strong>123456</strong> to login
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}