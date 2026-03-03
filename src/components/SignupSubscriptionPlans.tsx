import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Shield, Zap, CreditCard, ExternalLink, Languages } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info.tsx';

interface SubscriptionPlan {
  id: string;
  name: string;
  duration: number;
  totalPrice: number;
  monthlyPrice: number;
  description: string;
  savings?: number;
  popular?: boolean;
}

interface SignupSubscriptionPlansProps {
  onClose: () => void;
  onPaymentSuccess: (plan?: SubscriptionPlan) => void;
  mode?: 'signup' | 'settings';
}

export function SignupSubscriptionPlans({ onClose, onPaymentSuccess, mode = 'settings' }: SignupSubscriptionPlansProps) {
  const { t, setLanguage } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const plans: SubscriptionPlan[] = [
    {
      id: '1-month',
      name: t('subscription.oneMonth'),
      duration: 1,
      totalPrice: 99990,
      monthlyPrice: 99990,
      description: t('subscription.shortTerm'),
      popular: false,
    },
    {
      id: '1-year',
      name: t('subscription.oneYear'),
      duration: 12,
      totalPrice: 959990,
      monthlyPrice: 79999,
      description: t('subscription.longTerm'),
      savings: 599900,
      popular: true,
    },
    {
      id: '6-months',
      name: t('subscription.sixMonths'),
      duration: 6,
      totalPrice: 539990,
      monthlyPrice: 89998,
      description: t('subscription.bestValue'),
      savings: 180000,
      popular: false,
    },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const handleTrialStart = async () => {
    const trialPlan: SubscriptionPlan = {
      id: 'trial-2-months',
      name: t('subscription.threeMonthTrial'),
      duration: 2,
      totalPrice: 0,
      monthlyPrice: 0,
      description: t('subscription.trialSubtitle'),
      popular: true
    };

    if (mode === 'signup') {
      // For signup mode, complete the registration without payment
      onPaymentSuccess(trialPlan);
      toast.success(t('subscription.freeTrialActive'));
    } else {
      // For settings mode, activate the trial via API
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/subscription/trial`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.code === 'TRIAL_ALREADY_USED') {
            toast.error(t('subscription.trialAlreadyUsed') || "Trial already used");
          } else {
            throw new Error(data.error || 'Failed to start trial');
          }
          return;
        }
        toast.success(t('subscription.freeTrialActive'));
        onPaymentSuccess(trialPlan);
      } catch (error: any) {
        console.error('Trial activation error:', error);
        toast.error(error.message || t('subscription.paymentFailed'));
      }
    }
  };

  const handleSubscribe = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

  const handlePaymentMethodSelect = async (method: 'payme' | 'click') => {
    if (!selectedPlan) return;
    
    setIsProcessingPayment(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (mode === 'signup') {
        // For signup mode, complete the registration
        onPaymentSuccess(selectedPlan);
        setShowPaymentDialog(false);
        
        // Open payment gateway in new tab
        const paymentUrl = method === 'payme' 
          ? 'https://payme.uz' 
          : 'https://click.uz';
        window.open(paymentUrl, '_blank');
        
        toast.success(t('subscription.redirectingToPayment'));
      } else {
        // For settings mode, process subscription update
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        if (selectedPlan.id === 'trial-3-months') {
          const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/subscription/trial`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          const data = await res.json();
          if (!res.ok) {
            if (data.code === 'TRIAL_ALREADY_USED') {
              toast.error(t('subscription.trialAlreadyUsed') || "Trial already used");
            } else {
              throw new Error(data.error || 'Failed to start trial');
            }
            return;
          }
          toast.success(t('subscription.freeTrialActive'));
        } else {
          const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/profile`, {
            method: 'PUT',
            headers: { 
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subscriptionStatus: 'active',
              subscriptionPlan: selectedPlan.id,
              subscriptionStartDate: new Date().toISOString(),
              subscriptionExpiryDate: new Date(Date.now() + selectedPlan.duration * 30 * 24 * 60 * 60 * 1000).toISOString()
            })
          });
          if (!res.ok) throw new Error('Failed to update subscription');
          toast.success(`${t('subscription.paymentSuccess')}! ${formatPrice(selectedPlan.totalPrice)} UZS.`);
        }
        
        onPaymentSuccess(selectedPlan);
        setShowPaymentDialog(false);

        // Open payment gateway
        const paymentUrl = method === 'payme' 
          ? 'https://payme.uz' 
          : 'https://click.uz';
        window.open(paymentUrl, '_blank');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || t('subscription.paymentFailed'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white z-50 overflow-y-auto"
      >
        <div className="min-h-screen md:py-12 md:px-4">
          <div className="max-w-7xl mx-auto md:pt-0 pt-safe">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6 md:mb-12 px-4 pt-6 md:pt-0"
            >
              {/* Language Switcher */}
              <div className="absolute top-4 md:top-6 left-4 md:left-6 z-20">
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-full w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <Languages className="w-5 h-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white border-gray-200">
                    <DropdownMenuItem onClick={() => setLanguage('uz')} className="cursor-pointer">
                      🇺🇿 O'zbekcha
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage('ru')} className="cursor-pointer">
                      🇷🇺 Русский
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">
                      🇬🇧 English
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                variant="ghost"
                onClick={onClose}
                className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100 w-10 h-10 md:w-auto md:h-auto rounded-full"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </Button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-100 mb-3 md:mb-6 shadow-lg shadow-blue-200/50"
              >
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
              </motion.div>

              <h1 className="text-gray-900 mb-2 md:mb-4 text-xl md:text-3xl font-semibold">{t('subscription.chooseYourPlan')}</h1>
              <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base hidden md:block">
                {t('subscription.planDescription')}
              </p>
            </motion.div>

            {/* Free Trial Card */}
            <div className="mb-6 md:mb-8 px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6 shadow-lg md:p-8"
              >
                <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
                  <div className="text-center md:text-left">
                    <h3 className="mb-2 text-2xl font-bold text-gray-900">
                      {t('subscription.threeMonthTrial')}
                    </h3>
                    <p className="max-w-xl text-gray-600">
                      {t('subscription.trialSubtitle')}
                    </p>
                  </div>
                  <Button
                    onClick={handleTrialStart}
                    className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-4 text-sm font-medium text-white shadow-lg hover:from-emerald-700 hover:to-blue-700 md:w-auto text-[12px]"
                  >
                    {t('subscription.startFreeTrial')}
                  </Button>
                </div>
                <div className="absolute right-0 top-0 -z-10 h-full w-1/3 bg-gradient-to-l from-gray-100/40 to-transparent blur-3xl" />
              </motion.div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 mb-6 md:mb-12 px-4">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  {plan.popular && (
                    <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white border-0 px-3 md:px-4 py-1 md:py-1.5 shadow-lg text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {t('subscription.mostPopular')}
                      </Badge>
                    </div>
                  )}

                  {/* Desktop Card */}
                  <Card
                    className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hidden md:block bg-white ${
                      plan.popular
                        ? 'border-2 border-emerald-400 shadow-xl shadow-emerald-200/50'
                        : 'border border-gray-200 shadow-md hover:border-emerald-300'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-300/30 to-blue-300/30 blur-3xl" />
                    )}

                    <CardHeader className="text-center pb-8 relative">
                      <CardTitle className="text-2xl text-gray-900 mb-2">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="text-center py-6 border-y border-gray-200">
                        <div className="mb-2">
                          <span className="text-4xl font-bold text-gray-900">
                            {formatPrice(plan.monthlyPrice)}
                          </span>
                          <span className="text-gray-600 ml-2">UZS/{t('subscription.month')}</span>
                        </div>
                        
                        {plan.duration > 1 && (
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600">
                              {formatPrice(plan.totalPrice)} UZS {t('subscription.total')}
                            </div>
                            {plan.savings && (
                              <div className="text-xs text-emerald-600 font-medium">
                                {t('subscription.save')} {formatPrice(plan.savings)} UZS
                              </div>
                            )}
                          </div>
                        )}
                        
                        {plan.duration === 1 && (
                          <div className="text-sm text-gray-600">
                            {formatPrice(plan.totalPrice)} UZS {t('subscription.total')}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleSubscribe(plan)}
                        className={`w-full py-6 text-lg ${
                          plan.popular
                            ? 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 shadow-lg shadow-emerald-500/25 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                        }`}
                      >
                        {t('subscription.subscribe')}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Mobile Compact Card */}
                  <Card
                    className={`relative overflow-hidden md:hidden bg-white ${
                      plan.popular
                        ? 'border-2 border-emerald-400 shadow-lg shadow-emerald-200/50'
                        : 'border border-gray-200 shadow-md'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-300/30 to-blue-300/30 blur-3xl" />
                    )}

                    <CardContent className="p-3 relative">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 font-medium text-sm mb-0.5">{plan.name}</h3>
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-gray-900">
                                {formatPrice(plan.monthlyPrice)}
                              </span>
                              <span className="text-xs text-gray-600">UZS/{t('subscription.month')}</span>
                            </div>
                            {plan.duration > 1 && (
                              <div className="text-xs text-gray-600">
                                {formatPrice(plan.totalPrice)} UZS {t('subscription.total')}
                              </div>
                            )}
                            {plan.duration === 1 && (
                              <div className="text-xs text-gray-600">
                                {formatPrice(plan.totalPrice)} UZS {t('subscription.total')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <Button
                            onClick={() => handleSubscribe(plan)}
                            size="sm"
                            className={`min-w-[80px] w-auto h-8 text-xs px-3 whitespace-nowrap flex-shrink-0 ${
                              plan.popular
                                ? 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-white'
                            }`}
                          >
                            {t('subscription.subscribe')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Additional Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-4xl mx-auto hidden md:block"
            >
              <Card className="bg-white border border-gray-200 shadow-md">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
                        <Shield className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-gray-900 mb-2">{t('subscription.securePayment')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.securePaymentDesc')}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                        <Zap className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-gray-900 mb-2">{t('subscription.instantActivation')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.instantActivationDesc')}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-4">
                        <CreditCard className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-gray-900 mb-2">{t('subscription.flexiblePayment')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.flexiblePaymentDesc')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* FAQ Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 md:mt-12 text-center px-4 pb-safe"
            >
              <p className="text-gray-600 text-xs md:text-sm">
                {t('subscription.questions')}{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                  {t('subscription.contactSupport')}
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Payment Method Selection Dialog */}
      <AnimatePresence>
        {showPaymentDialog && selectedPlan && (
          <Dialog
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
          >
            <DialogContent className="sm:max-w-[500px] bg-white border-gray-200">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                  {t('subscription.selectPaymentMethod')}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  {t('subscription.choosePaymentMethod')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-5">
                {/* Payment Summary */}
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className="text-sm text-gray-700 shrink-0">{t('subscription.plan')}</span>
                    <span className="text-sm font-medium text-gray-900 text-right break-words">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm text-gray-700 shrink-0">{t('subscription.totalAmount')}</span>
                    <span className="text-lg font-bold text-gray-900 text-right whitespace-nowrap text-[12px]">{formatPrice(selectedPlan.totalPrice)} UZS</span>
                  </div>
                </div>

                {/* Payment Method Buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => handlePaymentMethodSelect('payme')}
                    disabled={isProcessingPayment}
                    className="w-full h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg disabled:opacity-50 flex items-center justify-between px-6"
                  >
                    <span className="flex items-center gap-3">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>
                      <div className="text-left">
                        <div className="font-semibold">Payme</div>
                        <div className="text-xs opacity-90">{t('subscription.payWithPayme')}</div>
                      </div>
                    </span>
                    <ExternalLink className="w-5 h-5" />
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handlePaymentMethodSelect('click')}
                    disabled={isProcessingPayment}
                    className="w-full h-16 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg disabled:opacity-50 flex items-center justify-between px-6"
                  >
                    <span className="flex items-center gap-3">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                      <div className="text-left">
                        <div className="font-semibold">Click</div>
                        <div className="text-xs opacity-90">{t('subscription.payWithClick')}</div>
                      </div>
                    </span>
                    <ExternalLink className="w-5 h-5" />
                  </Button>
                </div>

                {/* Cancel Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={isProcessingPayment}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 h-12"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}