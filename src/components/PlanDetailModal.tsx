import { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Calendar, Star, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  duration: number;
  monthlyPrice: number;
  totalPrice: number;
  savings?: number;
  popular?: boolean;
}

interface PlanDetailModalProps {
  plan: SubscriptionPlan;
  onClose: () => void;
  onSubscribe: () => void;
}

export function PlanDetailModal({ plan, onClose, onSubscribe }: PlanDetailModalProps) {
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

  const benefits = [
    {
      icon: Check,
      text: t('subscription.benefit1'),
    },
    {
      icon: TrendingUp,
      text: t('subscription.benefit2'),
    },
    {
      icon: Star,
      text: t('subscription.benefit3'),
    },
    {
      icon: DollarSign,
      text: t('subscription.benefit4'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-t-[0.625rem] sm:rounded-[0.625rem] w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-b from-gray-800 to-gray-800/95 backdrop-blur-sm z-10 px-6 pt-6 pb-4 border-b border-gray-700/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white w-10 h-10 hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <h2 className="text-white text-xl pr-10">{plan.name}</h2>
          <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Pricing Details */}
          <div className="bg-gray-900/50 rounded-[0.625rem] p-6 border border-gray-700/50">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-white mb-1">
                {formatPrice(plan.totalPrice)} UZS
              </div>
              <div className="text-sm text-gray-400">
                {plan.duration > 1 ? (
                  <span>
                    {formatPrice(plan.monthlyPrice)} UZS/{t('subscription.month')}
                  </span>
                ) : (
                  <span>{t('subscription.total')}</span>
                )}
              </div>
            </div>

            {/* Savings Breakdown */}
            {plan.savings && plan.duration > 1 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Monthly (1 month plan)</span>
                  <span className="text-sm text-gray-300">129,990 UZS</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Your plan ({plan.duration} months)</span>
                  <span className="text-sm text-white font-medium">
                    {formatPrice(plan.monthlyPrice)} UZS/mo
                  </span>
                </div>
                <div className="border-t border-emerald-500/20 mt-3 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-400">You save per month:</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatPrice(129990 - plan.monthlyPrice)} UZS
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-emerald-400/80">Total savings:</span>
                    <span className="text-sm font-medium text-emerald-400">
                      {formatPrice(plan.savings)} UZS
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Features List */}
          <div>
            <h3 className="text-white font-medium mb-3">What's included:</h3>
            <div className="space-y-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-gray-300 text-sm leading-relaxed">{benefit.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white text-sm font-medium mb-1">
                  {t('subscription.securePayment')}
                </h4>
                <p className="text-xs text-gray-400">
                  {t('subscription.securePaymentDesc')}. {t('subscription.flexiblePaymentDesc')}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="sticky bottom-0 bg-gradient-to-t from-gray-800 to-gray-800/95 backdrop-blur-sm px-6 py-4 border-t border-gray-700/50">
          <Button
            onClick={onSubscribe}
            className="w-full py-6 text-base bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 shadow-lg"
          >
            {t('subscription.subscribe')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}