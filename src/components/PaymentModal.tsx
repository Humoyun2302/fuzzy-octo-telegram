import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';

interface PaymentModalProps {
  onClose: () => void;
  onPaymentSuccess: (paymentMethod: string) => void;
  amount: number;
  isSignup?: boolean;
}

export function PaymentModal({ onClose, onPaymentSuccess, amount, isSignup = false }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'click' | 'payme'>('click');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t } = useLanguage();

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const handlePayment = async () => {
    setProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    setProcessing(false);
    setSuccess(true);

    toast.success(t('toast.paymentSuccessful'));

    setTimeout(() => {
      onPaymentSuccess(paymentMethod);
    }, 1500);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-2xl bg-white dark:bg-gray-800 rounded-[0.625rem]">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-emerald-600" />
              </motion.div>
              <h2 className="mb-2">Payment Successful!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {isSignup 
                  ? 'Your subscription is now active. Welcome to BarberBook!'
                  : 'Your subscription has been extended for 1 month.'}
              </p>
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  ✓ Paid {formatPrice(amount)} UZS via {paymentMethod === 'click' ? 'Click' : 'Payme'}
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                  ✓ Active until {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full"
      >
        <Card className="border-0 shadow-2xl rounded-[0.625rem]">
          <CardHeader className="relative border-b border-gray-100 dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={processing}
            >
              <X className="w-4 h-4" />
            </Button>
            <CardTitle>
              {isSignup ? 'Complete Your Registration' : 'Renew Subscription'}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSignup 
                ? 'Pay subscription fee to activate your barber profile'
                : 'Renew your monthly subscription to stay visible'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Amount */}
            <div className="p-4 rounded-[0.625rem] bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Subscription</span>
                <span className="text-2xl text-emerald-600 dark:text-emerald-400">{formatPrice(amount)} UZS</span>
              </div>
            </div>

            {isSignup && (
              <div className="p-4 rounded-[0.625rem] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  ℹ️ After payment, your profile will be visible to customers for 30 days. You'll need to renew monthly to stay active.
                </p>
              </div>
            )}

            {/* Payment Method Selection */}
            <div>
              <Label className="mb-3 block">Choose Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'click' | 'payme')}>
                <div className="space-y-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                    <Card className={`cursor-pointer transition-all duration-300 rounded-[0.625rem] border-2 ${
                      paymentMethod === 'click' 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <RadioGroupItem value="click" id="click" />
                        <Label htmlFor="click" className="flex-1 cursor-pointer flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-white shadow-sm">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <p>Click</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Fast & secure payment</p>
                          </div>
                        </Label>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                    <Card className={`cursor-pointer transition-all duration-300 rounded-[0.625rem] border-2 ${
                      paymentMethod === 'payme' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <RadioGroupItem value="payme" id="payme" />
                        <Label htmlFor="payme" className="flex-1 cursor-pointer flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-sm">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <p>Payme</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Secure online payment</p>
                          </div>
                        </Label>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="w-full h-12"
              size="lg"
            >
              {processing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Processing...
                </>
              ) : (
                <>
                  Pay {formatPrice(amount)} UZS
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Secure payment powered by {paymentMethod === 'click' ? 'Click' : 'Payme'}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}