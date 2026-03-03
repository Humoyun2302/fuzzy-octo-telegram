import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, AlertCircle, CheckCircle, Calendar, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PaymentModal } from './PaymentModal';
import { SubscriptionManagement } from './SubscriptionManagement';
import { useLanguage } from '../contexts/LanguageContext';

interface SubscriptionSectionProps {
  subscriptionStatus: 'active' | 'expired' | 'pending' | 'free_trial';
  expiryDate: string | null;
  currentPlan?: '1-month' | '6-months' | '1-year' | string | null;
  onPaymentSuccess: (planId: string) => void;
  onManageSubscription?: () => void;
  isSubscriptionActive: boolean;
}

export function SubscriptionSection({ 
  subscriptionStatus, 
  expiryDate, 
  currentPlan, 
  onPaymentSuccess, 
  onManageSubscription,
  isSubscriptionActive
}: SubscriptionSectionProps) {
  const { t } = useLanguage();
  const [showPayment, setShowPayment] = useState(false);
  const [showSubscriptionPage, setShowSubscriptionPage] = useState(false);

  // Plan details matching SubscriptionManagement
  const planDetails = {
    '1-month': {
      id: '1-month',
      name: t('subscription.oneMonth'),
      duration: 1,
      totalPrice: 99990,
      monthlyPrice: 99990,
    },
    '6-months': {
      id: '6-months',
      name: t('subscription.sixMonths'),
      duration: 6,
      totalPrice: 539990,
      monthlyPrice: 89998,
      savings: 180000,
    },
    '1-year': {
      id: '1-year',
      name: t('subscription.oneYear'),
      duration: 12,
      totalPrice: 959990,
      monthlyPrice: 79999,
      savings: 599900,
    },
  };

  const activePlan = (currentPlan && planDetails[currentPlan as keyof typeof planDetails]) 
    ? planDetails[currentPlan as keyof typeof planDetails] 
    : {
        id: currentPlan || 'unknown',
        name: (currentPlan && currentPlan.includes('trial')) ? 'Free Trial' : (currentPlan || t('subscription.none') || 'None'),
        duration: 0,
        totalPrice: 0,
        monthlyPrice: 0,
        savings: 0
      };

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

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

  const handlePaymentSuccess = (planId: string) => {
    setShowPayment(false);
    onPaymentSuccess(planId);
  };

  // Determine if we should show "Manage" or "Renew"
  // Show "Manage" ONLY if active AND not a free trial
  // If active but free trial, show "Renew" (to encourage upgrade)
  // If expired, show "Renew"
  const showManageButton = isSubscriptionActive && subscriptionStatus !== 'free_trial';

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-100 pb-3 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <CardTitle className="text-base font-semibold text-gray-900">
                {t('subscription.title')}
              </CardTitle>
            </div>
            {isSubscriptionActive ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                {t('subscription.active')}
              </Badge>
            ) : (
               <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-[#fffbfb]">
                {t('subscription.expired')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-500">{t('subscription.currentPlan')}:</span>
                <span className="font-medium text-gray-900">{activePlan.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {isSubscriptionActive 
                    ? t('subscription.nextPaymentDue') 
                    : t('subscription.expiredOn')}
                  {' '}
                  <span className={`font-medium ${
                    isSubscriptionActive 
                      ? 'text-emerald-600' 
                      : 'text-red-600'
                  }`}>
                    {expiryDate ? formatDate(expiryDate) : 'N/A'}
                  </span>
                </span>
              </div>
            </div>
            
            <Button 
              onClick={() => {
                if (onManageSubscription) {
                  onManageSubscription();
                } else {
                  setShowSubscriptionPage(true);
                }
              }}
              variant={showManageButton ? "outline" : "default"}
              className={showManageButton ? "" : "bg-gradient-to-r from-emerald-600 to-blue-600 text-white"}
            >
              {showManageButton ? t('subscription.manageSubscription') : t('subscription.renewNow')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showSubscriptionPage && (
          <SubscriptionManagement
            currentPlan={currentPlan}
            subscriptionStatus={subscriptionStatus}
            expiryDate={expiryDate}
            isSubscriptionActive={isSubscriptionActive}
            onClose={() => setShowSubscriptionPage(false)}
            onSubscribe={(planId) => {
              console.log('Subscribed to plan:', planId);
              setShowSubscriptionPage(false);
              onPaymentSuccess(planId);
            }}
            barberId="" // This is a fallback, parent should handle subscription management
          />
        )}
      </AnimatePresence>
    </>
  );
}
