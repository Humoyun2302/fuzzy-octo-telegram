import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { useState, useEffect } from 'react';
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
import { supabase } from '../utils/supabase/client';
import { SubscriptionSkeleton } from './SubscriptionSkeleton';

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
  barberId: string;
  currentPlan?: string;
  onClose: () => void;
  onSubscribe?: (planId: string) => void;
  subscriptionStatus?: 'active' | 'expired' | 'pending';
  expiryDate?: string;
  isSubscriptionActive?: boolean;
}

export function SubscriptionManagement({
  barberId,
  currentPlan,
  onClose,
  onSubscribe,
  subscriptionStatus,
  expiryDate,
  isSubscriptionActive,
}: SubscriptionManagementProps) {
  const { t } = useLanguage();
  
  // NEW: Fetch detailed subscription data from barbers table (Single Source of Truth as per user request)
  const [barberTableData, setBarberTableData] = useState<any>(null);
  
  // CRITICAL: Restore these state variables that were accidentally removed
  const [dbSubscriptionData, setDbSubscriptionData] = useState<any>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!barberId) {
        console.warn('[SUBSCRIPTION] No barberId provided');
        setIsLoadingSubscription(false);
        return;
      }
      
      try {
        console.log('[SUBSCRIPTION] 🔍 Fetching from barbers table for barberId:', barberId);
        
        // Fetch directly from barbers table as requested by user
        // This table contains the 'subscription_expiry_date' column shown in the screenshot
        const { data: barberData, error: barberError } = await supabase
          .from('barbers')
          .select('subscription_expiry_date, subscription_status, subscription_plan')
          .eq('id', barberId)
          .maybeSingle();
          
        if (barberError) {
           console.error('[SUBSCRIPTION] ❌ Error fetching from barbers table:', barberError);
        } else {
           console.log('[SUBSCRIPTION] ✅ Data from barbers table:', barberData);
           setBarberTableData(barberData);
        }
        
        // Also fetch from view as backup/supplementary
        const { data: viewData, error: viewError } = await supabase
          .from('v_barber_subscription')
          .select('*')
          .eq('barber_id', barberId)
          .maybeSingle();
        
        if (viewError) {
          console.error('[SUBSCRIPTION] ❌ Error fetching from view:', viewError);
        } else {
          setDbSubscriptionData(viewData);
        }

        // Also fetch history for details if needed
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('barber_id', barberId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (!subError) {
          setSubscriptionDetails(subData);
        }

      } catch (err) {
        console.error('[SUBSCRIPTION] ❌ Exception fetching subscription:', err);
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    
    fetchSubscriptionData();
  }, [barberId]);
  
  // CRITICAL: Use database values as the single source of truth
  // Priority: barberTableData (EXPLICIT USER REQUEST) > subscriptionDetails > dbSubscriptionData > props
  
  // 1. Get expiry date from barbers table 'subscription_expiry_date' column
  const barberTableExpiry = barberTableData?.subscription_expiry_date;
  
  const finalCurrentPlan = barberTableData?.subscription_plan || subscriptionDetails?.plan_type || dbSubscriptionData?.plan || currentPlan;
  const finalStatus = barberTableData?.subscription_status || subscriptionDetails?.status || dbSubscriptionData?.status || subscriptionStatus;
  const finalExpiryDate = barberTableExpiry || subscriptionDetails?.expires_at || dbSubscriptionData?.ends_at || expiryDate;
  
  // Calculate active status from database
  let finalIsActive = false;
  
  if (barberTableData) {
     // TRUST THE BARBERS TABLE COLUMN
     const now = new Date();
     const expiry = barberTableData.subscription_expiry_date ? new Date(barberTableData.subscription_expiry_date) : null;
     const status = barberTableData.subscription_status;
     
     const isActiveStatus = status === 'active' || status === 'free_trial';
     const isFutureExpiry = expiry ? expiry > now : false;
     
     if (isFutureExpiry) finalIsActive = true;
     else if (isActiveStatus && (!expiry || isFutureExpiry)) finalIsActive = true;
     
  } else if (subscriptionDetails) {
    // Check using subscriptions table data
    const now = new Date();
    const expiry = subscriptionDetails.expires_at ? new Date(subscriptionDetails.expires_at) : null;
    const isActiveStatus = subscriptionDetails.status === 'active' || subscriptionDetails.status === 'free_trial';
    const isFutureExpiry = expiry ? expiry > now : false;
    
    // Active if (future expiry) OR (active status AND no past expiry)
    if (isFutureExpiry) finalIsActive = true;
    else if (isActiveStatus && (!expiry || isFutureExpiry)) finalIsActive = true;
    
  } else if (dbSubscriptionData) {
    // Fallback to view data
    if (typeof dbSubscriptionData.is_subscription_active === 'boolean') {
      finalIsActive = dbSubscriptionData.is_subscription_active;
    } else if (dbSubscriptionData.ends_at) {
      finalIsActive = new Date(dbSubscriptionData.ends_at).getTime() > Date.now();
    }
  } else {
    // Fallback to props if no database data
    finalIsActive = isSubscriptionActive === true;
  }
  
  console.log('[SUBSCRIPTION] 🎯 Final computed values:', {
    dbData: dbSubscriptionData,
    finalCurrentPlan,
    finalStatus,
    finalExpiryDate,
    finalIsActive,
    isLoadingSubscription
  });
  
  // Use final values for display
  const isPlanActive = finalIsActive;
  const dbPlanId = finalCurrentPlan || '';
  
  // Check if it's a trial plan
  const isTrial = (dbPlanId.includes('trial') || dbPlanId.includes('free')) && isPlanActive;
  
  // Get display name for current plan - ALWAYS show database value if it exists
  const getCurrentPlanDisplayName = () => {
    // Use finalCurrentPlan from database
    if (finalCurrentPlan) {
      // If it's a trial plan
      if (finalCurrentPlan.includes('trial') || finalCurrentPlan.includes('free')) {
        // Extract trial duration if available
        const match = finalCurrentPlan.match(/(\d+)[-_]month/);
        if (match) {
          const months = match[1];
          return `${months}-${t('subscription.month')} ${t('subscription.freeTrialActive')}`;
        }
        return t('subscription.freeTrialActive');
      }
      
      // Find matching plan from plans array
      const normalizedPlanId = finalCurrentPlan.replace('_', '-');
      const matchedPlan = plans.find(p => p.id === normalizedPlanId);
      
      return matchedPlan ? matchedPlan.name : finalCurrentPlan;
    }
    
    return t('subscription.none');
  };
  
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
    
    try {
      // Generate a unique order ID
      const orderId = `BARDAK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const amount = selectedPlan.totalPrice;
      const merchantName = 'Bardak Barber Booking';
      
      // Redirect to payment provider
      if (selectedPaymentMethod === 'payme') {
        // Payme payment URL
        // In production, you would use your actual merchant_id from Payme
        const paymeUrl = `https://checkout.paycom.uz`;
        const merchantId = '5e730e8e0b852a417aa49ceb'; // Demo merchant ID - replace with your actual one
        
        // Payme expects amount in tiyin (1 UZS = 100 tiyin)
        const amountInTiyin = amount * 100;
        
        const paymentUrl = `${paymeUrl}/${merchantId}?` + new URLSearchParams({
          amount: amountInTiyin.toString(),
          'account[order_id]': orderId,
          'account[plan]': selectedPlan.id,
          'account[service]': 'subscription',
          lang: 'en'
        }).toString();
        
        // Open payment page
        window.location.href = paymentUrl;
        
      } else if (selectedPaymentMethod === 'click') {
        // Click payment URL
        // In production, you would use your actual service_id and merchant_id from Click
        const clickUrl = `https://my.click.uz/services/pay`;
        const serviceId = '12345'; // Demo service ID - replace with your actual one
        const merchantId = '67890'; // Demo merchant ID - replace with your actual one
        
        const paymentUrl = `${clickUrl}?` + new URLSearchParams({
          service_id: serviceId,
          merchant_id: merchantId,
          amount: amount.toString(),
          transaction_param: orderId,
          return_url: window.location.origin + '/payment-success',
          card_type: 'all'
        }).toString();
        
        // Open payment page
        window.location.href = paymentUrl;
      }
      
      // Note: After successful payment, the payment provider will redirect back to your app
      // You should handle the callback in your backend to verify the payment
      
    } catch (error) {
      console.error('Payment redirect error:', error);
      toast.error('Failed to redirect to payment provider');
      setIsProcessingPayment(false);
    }
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

  if (isLoadingSubscription) {
    return <SubscriptionSkeleton />;
  }

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
                className="inline-flex items-center justify-center w-10 h-10 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-2 md:mb-6 shadow-lg shadow-primary/20"
              >
                <Sparkles className="w-5 h-5 md:w-8 md:h-8 text-primary" />
              </motion.div>

              <h1 className="text-gray-900 mb-1 md:mb-4 text-lg md:text-3xl font-semibold">{t('subscription.chooseYourPlan')}</h1>
              <p className="text-gray-600 max-w-2xl mx-auto text-xs md:text-base hidden md:block">
                {t('subscription.planDescription')}
              </p>
            </motion.div>

            {/* Compact Subscription Status Section - Matches Design */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-3xl mx-auto mb-4 md:mb-8"
            >
              <Card className="bg-white border border-emerald-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-emerald-100 pb-3 md:pb-4 bg-gradient-to-r from-emerald-50/30 to-white bg-[rgba(193,255,208,0)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-[#5B8CFF]" />
                      <CardTitle className="text-base md:text-lg text-gray-900">
                        {t('subscription.title')}
                      </CardTitle>
                    </div>
                    {isPlanActive && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs px-2 md:px-3 py-1 gap-1">
                        <Check className="w-3 h-3" />
                        {t('subscription.active')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4">
                  {/* Active Status Box - Mint Green Background */}
                  {isPlanActive ? (
                    <div className="relative p-4 md:p-5 rounded-[24px] bg-gradient-to-br from-emerald-50/90 via-teal-50/80 to-green-50/90 backdrop-blur-xl border border-emerald-200/60 shadow-[0_8px_30px_rgb(5,150,105,0.12)] hover:shadow-[0_12px_40px_rgb(5,150,105,0.18)] transition-all duration-300">
                      {/* Glassmorphism overlay */}
                      <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                      
                      {/* Content */}
                      <div className="relative flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 flex items-center justify-center shadow-lg shadow-gray-200/50">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm md:text-base text-emerald-800 font-semibold tracking-tight">
                            ✓ {t('subscription.profileActive')}
                          </p>
                          <p className="text-xs md:text-sm text-gray-600 mt-1.5 font-medium">
                            {t('subscription.nextPaymentDue')} {finalExpiryDate ? formatDate(finalExpiryDate) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Decorative elements */}
                      <div className="absolute top-3 right-3 w-20 h-20 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
                    </div>
                  ) : (
                    <div className="p-3 md:p-4 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-start gap-2 md:gap-3">
                        <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs md:text-sm text-red-700 font-medium">
                            ⚠ {t('subscription.expiredWarning')}
                          </p>
                          <p className="text-[10px] md:text-xs text-red-600 mt-1">
                            {t('subscription.renewNowMessage')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

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
                      <Badge className="bg-gradient-to-r from-blue-500 to-emerald-500 text-[rgb(91,140,255)] border-0 px-3 md:px-4 py-1 md:py-1.5 shadow-lg text-xs">
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
                            className={`min-w-0 w-[110px] h-8 text-xs px-2 whitespace-nowrap flex-shrink-0 ${
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
                              <span className="truncate text-[14px] text-[rgb(255,255,255)]">{t('subscription.subscribe')}</span>
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
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-gray-900 mb-2 font-semibold">{t('subscription.securePayment')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.securePaymentDesc')}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                        <Zap className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-gray-900 mb-2 font-semibold">{t('subscription.instantActivation')}</h3>
                      <p className="text-sm text-gray-600">
                        {t('subscription.instantActivationDesc')}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                        <CreditCard className="w-6 h-6 text-primary" />
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
                <CreditCard className="w-6 h-6 text-[#5B8CFF]" />
                {t('subscription.selectPaymentMethod')}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {t('subscription.choosePaymentMethod')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5">
              {/* Payment Method List */}
              <div className="space-y-3">
                {/* Payme */}
                <div
                  className={`p-4 rounded-xl transition-all duration-300 cursor-pointer ${
                    selectedPaymentMethod === 'payme'
                      ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 border-2 border-[#5B8CFF]'
                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectPaymentMethod('payme')}
                >
                  <div className="flex items-center gap-4">
                    {/* Payme Logo */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <ImageWithFallback
                        src="https://cdn.payme.uz/logo/payme_01.png"
                        alt="Payme"
                        className="w-10 h-10 object-contain"
                      />
                    </div>

                    {/* Payment Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Payme</h3>
                      <p className="text-sm text-gray-600">{t('subscription.payWithPayme')}</p>
                    </div>

                    {/* Selection Indicator */}
                    {selectedPaymentMethod === 'payme' && (
                      <div className="w-6 h-6 rounded-full bg-[#5B8CFF] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Click */}
                <div
                  className={`p-4 rounded-xl transition-all duration-300 cursor-pointer ${
                    selectedPaymentMethod === 'click'
                      ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 border-2 border-[#5B8CFF]'
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
                      <p className="text-sm text-gray-600">{t('subscription.payWithClick')}</p>
                    </div>

                    {/* Selection Indicator */}
                    {selectedPaymentMethod === 'click' && (
                      <div className="w-6 h-6 rounded-full bg-[#5B8CFF] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Summary */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">{t('subscription.subscribingTo')}</p>
                <p className="font-semibold text-gray-900">{selectedPlan.name}</p>
                <p className="text-lg font-bold text-[rgb(42,100,238)] mt-1">
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
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  onClick={handlePayWithMethod}
                  disabled={isProcessingPayment || !selectedPaymentMethod}
                  className="flex-1 bg-[#5B8CFF] hover:bg-[#4A7BE8] text-white shadow-lg disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      {t('subscription.processing')}
                    </>
                  ) : (
                    <>{t('subscription.payNow')}</>
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