import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles, X, CreditCard, Shield, Zap, AlertCircle, CheckCircle, Calendar, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import { PaymentModal } from './PaymentModal';
import { PlanDetailModal } from './PlanDetailModal';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './figma/ImageWithFallback';

type PaymentMethod = 'payme' | 'click' | null;

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

interface SubscriptionManagementProps {
  currentPlan?: string;
  onClose: () => void;
  onSubscribe?: (planId: string) => void;
  subscriptionStatus?: 'active' | 'expired' | 'pending';
  expiryDate?: string;
}

export function SubscriptionManagement({
  currentPlan,
  onClose,
  onSubscribe,
  subscriptionStatus,
  expiryDate,
}: SubscriptionManagementProps) {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPlanDetailModal, setShowPlanDetailModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('payme');
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
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
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleSubscribe = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentMethodDialog(true);
  };

  const handlePayWithMethod = async () => {
    if (!selectedPaymentMethod || !selectedPlan) return;
    
    setIsProcessingPayment(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsProcessingPayment(false);
    setShowPaymentMethodDialog(false);
    
    // Update subscription
    if (onSubscribe) {
      onSubscribe(selectedPlan.id);
    }
    
    const methodName = selectedPaymentMethod === 'payme' ? 'Payme' : 'Click';
    toast.success(`Subscription updated to ${selectedPlan.name}! Paid ${formatPrice(selectedPlan.totalPrice)} UZS via ${methodName}.`);
  };

  const handlePlanDetail = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPlanDetailModal(true);
  };

  const handleSubscribeFromDetail = () => {
    setShowPlanDetailModal(false);
    if (selectedPlan) {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    if (selectedPlan && onSubscribe) {
      onSubscribe(selectedPlan.id);
    }
    setShowPaymentModal(false);
    toast.success(t('subscription.subscriptionSuccess'));
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-emerald-50/30"
      >
        {/* Mobile optimized container */}
        <div className="min-h-screen py-3 md:py-8 px-3 md:px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header - Compact on mobile */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-4 md:mb-12 relative"
            >
              <Button
                variant="ghost"
                onClick={onClose}
                className="absolute -top-1 md:top-0 right-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 w-8 h-8 md:w-10 md:h-10 rounded-full z-10 p-0"
              >
                <X className="w-4 h-4 md:w-6 md:h-6" />
              </Button>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-10 h-10 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 mb-2 md:mb-6 shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-white" />
              </motion.div>

              <h1 className="text-gray-900 mb-1 md:mb-4 text-lg md:text-3xl font-semibold">{t('subscription.chooseYourPlan')}</h1>
              <p className="text-gray-600 max-w-2xl mx-auto text-xs md:text-base hidden md:block">
                {t('subscription.planDescription')}
              </p>
            </motion.div>

            {/* Current Subscription Status Card */}
            {subscriptionStatus && expiryDate && (() => {
              const getDaysUntilExpiry = (dateStr: string) => {
                if (!dateStr) return 0;
                try {
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) return 0;
                  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                } catch {
                  return 0;
                }
              };
              const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
              const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
              
              const isPlanActive = subscriptionStatus === 'active';

              // Find active plan details
              const normalizedPlanId = currentPlan ? currentPlan.replace('_', '-') : '';
              const isTrial = normalizedPlanId.includes('trial') && isPlanActive;
              
              const activePlan = isTrial 
                ? {
                    id: currentPlan || 'trial-2-months',
                    name: t('subscription.freeTrial', { months: 2 }) || '2-Month Free Trial',
                    duration: 2,
                    totalPrice: 0,
                    monthlyPrice: 0,
                    description: t('subscription.trialDescription') || 'Free trial period',
                    savings: 0,
                    popular: false
                  }
                : plans.find(p => p.id === normalizedPlanId) || null;

              const planName = activePlan ? activePlan.name : (isPlanActive ? (currentPlan || 'Active Subscription') : (t('subscription.none') || 'None'));
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="max-w-3xl mx-auto mb-4 md:mb-12"
                >
                  <Card className={`relative overflow-hidden border shadow-xl transition-all duration-300 bg-white ${ 
                    isPlanActive
                      ? isExpiringSoon 
                        ? 'border-amber-300 shadow-amber-200/50'
                        : 'border-emerald-300 shadow-emerald-200/50'
                      : 'border-red-300 shadow-red-200/50'
                  }`}>
                    {/* Decorative blur effect */}
                    <div className={`absolute top-0 right-0 w-40 h-40 blur-3xl opacity-20 ${
                      isPlanActive
                        ? isExpiringSoon
                          ? 'bg-amber-300'
                          : 'bg-gradient-to-br from-emerald-400 to-blue-400'
                        : 'bg-red-300'
                    }`} />
                    
                    <CardHeader className="border-b border-gray-200 relative pb-3 md:pb-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-gray-900 text-base md:text-xl">
                          <CreditCard className={`w-4 h-4 md:w-5 md:h-5 ${
                            isPlanActive
                              ? isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'
                              : 'text-red-600'
                          }`} />
                          {t('subscription.title')}
                        </CardTitle>
                        <Badge 
                          className={`border-0 shadow-lg text-xs ${
                            isPlanActive
                              ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          {isPlanActive ? `✓ ${t('subscription.active')}` : `✗ ${t('subscription.expired')}`}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3 md:space-y-4 pt-3 md:pt-6 relative">
                      {/* Status Message */}
                      {isPlanActive ? (
                        <div className={`p-3 md:p-4 rounded-lg border ${isExpiringSoon 
                          ? 'bg-amber-50 border-amber-300' 
                          : 'bg-emerald-50 border-emerald-300'
                        }`}>
                          <div className="flex items-start gap-2 md:gap-3">
                            {isExpiringSoon ? (
                              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className={`text-xs md:text-sm ${isExpiringSoon ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {isExpiringSoon 
                                  ? `⚠️ ${daysUntilExpiry === 1 ? t('subscription.expiresInDay') : t('subscription.expiresInDays', { days: daysUntilExpiry })}`
                                  : `✓ ${t('subscription.profileActive')}`}
                              </p>
                              <p className="text-[10px] md:text-xs text-gray-600 mt-1">
                                {(currentPlan === 'trial-3-months' || currentPlan === 'free_trial_3_months') && subscriptionStatus === 'active'
                                  ? `Trial ends on ${formatDate(expiryDate)}`
                                  : `${t('subscription.nextPaymentDue')} ${formatDate(expiryDate)}`
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 md:p-4 rounded-lg bg-red-50 border border-red-300">
                          <div className="flex items-start gap-2 md:gap-3">
                            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs md:text-sm text-red-700">
                                ⚠ {t('subscription.expiredWarning')}
                              </p>
                              <p className="text-[10px] md:text-xs text-red-600 mt-1">
                                {t('subscription.renewNowMessage')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Info */}
                      <div className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-gray-50 border border-gray-200 shadow-sm">
                        {activePlan || isPlanActive ? (
                           <div>
                            <p className="text-[10px] md:text-xs text-gray-600">{planName}</p>
                            <div className="flex items-baseline gap-1 md:gap-2 mt-1">
                              <p className="text-base md:text-lg text-gray-900 font-semibold">
                                {activePlan ? formatPrice(activePlan.monthlyPrice) : '---'} <span className="text-xs md:text-sm text-gray-600">UZS/{t('subscription.month')}</span>
                              </p>
                            </div>
                            {activePlan && activePlan.duration > 1 && (
                              <p className="text-[10px] md:text-xs text-gray-600 mt-0.5">
                                {activePlan.totalPrice === 0 ? 'Promo period' : `${formatPrice(activePlan.totalPrice)} UZS ${t('subscription.total')}`}
                              </p>
                            )}
                           </div>
                        ) : (
                           <div>
                            <p className="text-[10px] md:text-xs text-gray-600">Current Plan</p>
                             <div className="flex items-baseline gap-1 md:gap-2 mt-1">
                              <p className="text-base md:text-lg text-gray-900 font-semibold">None</p>
                            </div>
                           </div>
                        )}
                        <Calendar className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                      </div>

                      {!isPlanActive && (
                        <Button
                          onClick={() => {
                            const defaultPlan = plans.find(p => p.id === '1-month') || plans[0];
                            handleSubscribe(defaultPlan);
                          }}
                          className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl shadow-emerald-500/25 text-white py-4 md:py-6 text-sm md:text-base"
                        >
                          <CreditCard className="w-4 h-4" />
                          {t('subscription.renewNow')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })()}

            {/* Pricing Cards - Optimized for mobile (all fit on screen) */}
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

                  {/* Current Plan Badge */}
                  {currentPlan === plan.id && (
                    <div className={`absolute ${plan.popular ? '-top-3 md:-top-4 right-4' : '-top-3 md:-top-4 left-1/2 -translate-x-1/2'} z-10`}>
                      <Badge className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white border-0 px-3 md:px-4 py-1 md:py-1.5 shadow-lg text-xs">
                        <CheckCircle className="w-3 h-3 mr-1 fill-current" />
                        {t('subscription.currentPlan')}
                      </Badge>
                    </div>
                  )}

                  {/* Desktop Card */}
                  <Card
                    className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hidden md:block bg-white ${
                      currentPlan === plan.id
                        ? 'border-2 border-blue-400 shadow-xl shadow-blue-200/50 ring-2 ring-blue-200'
                        : plan.popular
                        ? 'border-2 border-emerald-400 shadow-xl shadow-emerald-200/50'
                        : 'border border-gray-200 shadow-md hover:border-emerald-300'
                    }`}
                  >
                    {currentPlan === plan.id && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/30 to-emerald-400/30 blur-3xl" />
                    )}
                    {plan.popular && currentPlan !== plan.id && (
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
                      {/* Pricing */}
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

                      {/* Subscribe Button */}
                      <Button
                        onClick={() => handleSubscribe(plan)}
                        disabled={currentPlan === plan.id}
                        className={`w-full py-6 text-lg ${
                          currentPlan === plan.id
                            ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white cursor-default opacity-90'
                            : plan.popular
                            ? 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 shadow-lg shadow-emerald-500/25 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                        }`}
                      >
                        {currentPlan === plan.id ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2 fill-current" />
                            {t('subscription.currentPlan')}
                          </>
                        ) : (
                          t('subscription.subscribe')
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Mobile Compact Card - Optimized to fit 3 cards on screen */}
                  <Card
                    className={`relative overflow-hidden md:hidden bg-white ${
                      currentPlan === plan.id
                        ? 'border-2 border-blue-400 shadow-lg shadow-blue-200/50 ring-2 ring-blue-200'
                        : plan.popular
                        ? 'border-2 border-emerald-400 shadow-lg shadow-emerald-200/50'
                        : 'border border-gray-200 shadow-md'
                    }`}
                  >
                    {currentPlan === plan.id && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/30 to-emerald-400/30 blur-3xl" />
                    )}
                    {plan.popular && currentPlan !== plan.id && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-300/30 to-blue-300/30 blur-3xl" />
                    )}

                    <CardContent className="p-3 relative">
                      <div className="flex items-center justify-between gap-3">
                        {/* Plan Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 font-medium text-sm mb-0.5">{plan.name}</h3>
                          
                          {/* Pricing - Compact */}
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

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <Button
                            onClick={() => handleSubscribe(plan)}
                            size="sm"
                            disabled={currentPlan === plan.id}
                            className={`min-w-0 w-[72px] h-8 text-xs px-2 whitespace-nowrap flex-shrink-0 ${
                              currentPlan === plan.id
                                ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white cursor-default opacity-90'
                                : plan.popular
                                ? 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                            }`}
                          >
                            {currentPlan === plan.id ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-0.5 fill-current" />
                                <span className="truncate text-[11px]">{t('subscription.active')}</span>
                              </>
                            ) : (
                              <span className="truncate text-[11px]">{t('subscription.subscribe')}</span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Additional Info - Hidden on mobile to save space */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-4xl mx-auto hidden md:block px-4"
            >
              <Card className="bg-white border border-gray-200 shadow-lg">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
                        <Shield className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-gray-900 mb-2 font-semibold">{t('subscription.securePayment')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.securePaymentDesc')}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                        <Zap className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-gray-900 mb-2 font-semibold">{t('subscription.instantActivation')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.instantActivationDesc')}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-4">
                        <CreditCard className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-gray-900 mb-2 font-semibold">{t('subscription.flexiblePayment')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.flexiblePaymentDesc')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Method Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="max-w-3xl mx-auto mt-4 md:mt-12"
            >
              <Card className="relative overflow-hidden border shadow-xl bg-white">
                {/* Decorative blur effect */}
                <div className="absolute top-0 right-0 w-40 h-40 blur-3xl opacity-10 bg-gradient-to-br from-purple-400 to-indigo-400" />
                
                <CardHeader className="border-b border-gray-200 relative pb-3 md:pb-6">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-100">
                      <Lock className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-gray-900 text-base md:text-lg">{t('subscription.paymentMethodTitle')}</CardTitle>
                      <p className="text-xs md:text-sm text-gray-600 mt-0.5 md:mt-1">
                        Choose your preferred payment method
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-3 md:pt-6 relative">
                  <div className="space-y-3">
                    {/* Payme Payment Method */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0 }}
                    >
                      <div 
                        className={`overflow-hidden cursor-pointer transition-all duration-200 rounded-xl p-4 md:p-6 ${
                          selectedPaymentMethod === 'payme' 
                            ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-100 bg-emerald-50/50' 
                            : 'border border-gray-200 hover:border-emerald-300 hover:shadow-md bg-white'
                        }`}
                        onClick={() => handleSelectPaymentMethod('payme')}
                      >
                        <div className="flex items-center gap-4">
                          {/* Payme Logo */}
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
                            <ImageWithFallback
                              src="https://payme.uz/images/logo.svg"
                              alt="Payme"
                              className="w-10 h-10 md:w-12 md:h-12 object-contain"
                            />
                          </div>

                          {/* Payment Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">Payme</h3>
                            <p className="text-sm text-gray-600">Pay with Payme</p>
                          </div>

                          {/* Selection Indicator */}
                          {selectedPaymentMethod === 'payme' && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                            >
                              <Check className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Click Payment Method */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div 
                        className={`overflow-hidden cursor-pointer transition-all duration-200 rounded-xl p-4 md:p-6 ${
                          selectedPaymentMethod === 'click' 
                            ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-100 bg-emerald-50/50' 
                            : 'border border-gray-200 hover:border-emerald-300 hover:shadow-md bg-white'
                        }`}
                        onClick={() => handleSelectPaymentMethod('click')}
                      >
                        <div className="flex items-center gap-4">
                          {/* Click Logo */}
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                            <ImageWithFallback
                              src="https://click.uz/click/images/logo.svg"
                              alt="Click"
                              className="w-10 h-10 md:w-12 md:h-12 object-contain"
                            />
                          </div>

                          {/* Payment Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">Click</h3>
                            <p className="text-sm text-gray-600">Pay with Click</p>
                          </div>

                          {/* Selection Indicator */}
                          {selectedPaymentMethod === 'click' && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                            >
                              <Check className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Info */}
                    <div className="p-3 md:p-4 rounded-lg bg-blue-50 border border-blue-200 mt-4">
                      <p className="text-xs md:text-sm text-blue-700 flex items-start gap-2">
                        <Lock className="w-3 h-3 md:w-4 md:h-4 mt-0.5 flex-shrink-0" />
                        <span>Secure payment processing with {selectedPaymentMethod === 'payme' ? 'Payme' : 'Click'}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
      </motion.div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={selectedPlan.totalPrice}
          onPaymentSuccess={handlePaymentSuccess}
          title={`${t('subscription.subscribe')} - ${selectedPlan.name}`}
        />
      )}

      {/* Plan Detail Modal */}
      <AnimatePresence>
        {showPlanDetailModal && selectedPlan && (
          <PlanDetailModal
            isOpen={showPlanDetailModal}
            onClose={() => setShowPlanDetailModal(false)}
            plan={selectedPlan}
            onSubscribe={handleSubscribeFromDetail}
            currentPlan={currentPlan}
          />
        )}
      </AnimatePresence>

      {/* Payment Method Selection Dialog */}
      {showPaymentMethodDialog && selectedPlan && (
        <Dialog
          open={showPaymentMethodDialog}
          onOpenChange={setShowPaymentMethodDialog}
        >
          <DialogContent className="sm:max-w-[500px] bg-white border-gray-200">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl text-gray-900 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-emerald-600" />
                Select Payment Method
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Choose how you'd like to pay for your subscription
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5">
              {/* Payment Method List */}
              <div className="space-y-3">
                {/* Payme */}
                <div
                  className={`p-4 rounded-xl transition-all duration-300 cursor-pointer ${
                    selectedPaymentMethod === 'payme'
                      ? 'bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-400'
                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectPaymentMethod('payme')}
                >
                  <div className="flex items-center gap-4">
                    {/* Payme Logo */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <ImageWithFallback
                        src="https://payme.uz/images/logo.svg"
                        alt="Payme"
                        className="w-10 h-10 object-contain"
                      />
                    </div>

                    {/* Payment Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Payme</h3>
                      <p className="text-sm text-gray-600">Pay with Payme</p>
                    </div>

                    {/* Selection Indicator */}
                    {selectedPaymentMethod === 'payme' && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Click */}
                <div
                  className={`p-4 rounded-xl transition-all duration-300 cursor-pointer ${
                    selectedPaymentMethod === 'click'
                      ? 'bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-400'
                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectPaymentMethod('click')}
                >
                  <div className="flex items-center gap-4">
                    {/* Click Logo */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <ImageWithFallback
                        src="https://click.uz/click/images/logo.svg"
                        alt="Click"
                        className="w-10 h-10 object-contain"
                      />
                    </div>

                    {/* Payment Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Click</h3>
                      <p className="text-sm text-gray-600">Pay with Click</p>
                    </div>

                    {/* Selection Indicator */}
                    {selectedPaymentMethod === 'click' && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Summary */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">You're subscribing to:</p>
                <p className="font-semibold text-gray-900">{selectedPlan.name}</p>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  {formatPrice(selectedPlan.totalPrice)} UZS
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentMethodDialog(false)}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={handlePayWithMethod}
                  disabled={isProcessingPayment || !selectedPaymentMethod}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-lg disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Processing...
                    </>
                  ) : (
                    <>Pay Now</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}