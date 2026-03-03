import { AlertCircle, CreditCard } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface SubscriptionExpiredBannerProps {
  subscriptionStatus: 'active' | 'expired' | 'pending' | 'inactive';
  subscriptionExpiryDate?: string | null;
  isSubscriptionActive?: boolean;
  onRenew: () => void;
}

export function SubscriptionExpiredBanner({ subscriptionStatus, subscriptionExpiryDate, isSubscriptionActive, onRenew }: SubscriptionExpiredBannerProps) {
  const { t } = useLanguage();

  // CRITICAL: Check if subscription is truly expired based on calculated isSubscriptionActive
  // or by checking the expiry date directly, not just relying on the status string
  const now = new Date();
  const expiryDate = subscriptionExpiryDate ? new Date(subscriptionExpiryDate) : null;
  const isExpired = expiryDate ? expiryDate < now : false;
  
  // Show banner if:
  // 1. Status is explicitly 'expired', OR
  // 2. isSubscriptionActive is explicitly false, OR
  // 3. Expiry date is in the past
  const shouldShowBanner = subscriptionStatus === 'expired' || isSubscriptionActive === false || isExpired;
  
  console.log('[SUBSCRIPTION BANNER] 🔍 Banner visibility check:', {
    subscriptionStatus,
    subscriptionExpiryDate,
    isSubscriptionActive,
    isExpired,
    shouldShowBanner
  });

  if (!shouldShowBanner) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 shadow-lg"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-full shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900 mb-1">
              {t('subscription.expiredWarning') || "Your subscription has expired"}
            </h3>
            <p className="text-sm text-red-800 leading-relaxed max-w-xl">
              {t('subscription.expiredBannerMessage') || "To make your account visible to clients, please renew your subscription."}
            </p>
          </div>
        </div>
        <Button 
          onClick={onRenew}
          className="w-full md:w-auto bg-gradient-to-r from-[#5B8CFF] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shrink-0 gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <CreditCard className="w-4 h-4" />
          {t('subscription.renewSubscription') || "Renew subscription"}
        </Button>
      </div>
    </motion.div>
  );
}