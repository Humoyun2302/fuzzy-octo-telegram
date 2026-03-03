import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, DollarSign, ChevronDown, X, RefreshCw, Phone, Copy, User } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Booking } from '../types';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../utils/supabase/client';

// Safe string helpers to prevent crashes on undefined/null values
const safeStr = (v: any): string => (v == null ? '' : String(v));
const safeSplit = (v: any, sep: string): string[] => safeStr(v).split(sep);

interface BookingCardProps {
  booking: Booking;
  viewAs: 'customer' | 'barber';
  onCancel?: (id: string) => void;
  onReschedule?: () => void;
  onBookAgain?: () => void;
}

export function BookingCard({ booking, viewAs, onCancel, onReschedule, onBookAgain }: BookingCardProps) {
  const [barberPhone, setBarberPhone] = useState<string | null>(null);
  const { t } = useLanguage();

  // Fetch barber phone from Supabase for customer view
  useEffect(() => {
    const fetchBarberPhone = async () => {
      if (viewAs === 'customer' && booking.barberId) {
        try {
          const { data, error } = await supabase
            .from('barbers')
            .select('phone')
            .eq('id', booking.barberId)
            .single();
          
          if (!error && data?.phone) {
            setBarberPhone(data.phone);
          }
        } catch (err) {
          console.error('Error fetching barber phone:', err);
        }
      }
    };

    fetchBarberPhone();
  }, [booking.barberId, viewAs]);

  const statusColors = {
    confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    pending: 'bg-amber-100 text-amber-700 border-amber-300',
    cancelled: 'bg-red-100 text-red-700 border-red-300',
    rescheduled: 'bg-orange-100 text-orange-700 border-orange-300',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    const weekdayMap: Record<number, string> = {
      0: t('weekdays.short.sun'),
      1: t('weekdays.short.mon'),
      2: t('weekdays.short.tue'),
      3: t('weekdays.short.wed'),
      4: t('weekdays.short.thu'),
      5: t('weekdays.short.fri'),
      6: t('weekdays.short.sat'),
    };

    const weekday = weekdayMap[date.getDay()];
    const day = date.getDate();
    
    return `${weekday} ${day}`;
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel(booking.id);
      toast.success(t('toast.bookingCancelled'));
    }
  };

  const handleReschedule = () => {
    if (onReschedule) {
      onReschedule();
    }
  };

  // Use joined barber/customer objects if available, fallback to deprecated fields
  const displayName = viewAs === 'customer' 
    ? (booking.barber?.full_name || booking.barberName || 'Barber')
    : (booking.customer?.full_name || booking.customerName || (booking as any).manualCustomerName || 'Customer');
  const displayAvatar = viewAs === 'customer' 
    ? (booking.barber?.avatar || booking.barberAvatar)
    : booking.customerAvatar;

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      toast.success(t('bookingCard.phoneCopied'), {
        description: phone,
      });
    }).catch(() => {
      toast.error(t('bookingCard.phoneCopyFailed'));
    });
  };

  const handleCallPhone = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="overflow-hidden border-0 transition-all duration-200 bg-white dark:bg-gray-800 h-full rounded-3xl shadow-sm hover:shadow-md">
        {/* Top Section - Soft Modern Gradient with Name & Service */}
        <div className="bg-gradient-to-b from-[#5B8CFF]/15 to-white dark:from-[#5B8CFF]/20 dark:to-gray-800 px-5 py-5 text-center">
          <h3 className="text-xl font-bold dark:text-white mb-1 text-[#1b2944]">
            {viewAs === 'customer' 
              ? (booking.barber?.full_name || booking.barberName || 'Barber') 
              : ((booking as any).source === 'manual' || (booking as any).source === 'guest' 
                  ? ((booking as any).manualCustomerName || 'Walk-in Customer') 
                  : (booking.customer?.full_name || booking.customerName || 'Customer')
                )
            }
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {booking.serviceType}
          </p>
        </div>

        <CardContent className="p-5">
          {/* Status Information - Show for cancelled or rescheduled */}
          {viewAs === 'barber' && (booking.status === 'cancelled' || booking.status === 'rescheduled') && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-2xl border ${
                booking.status === 'cancelled'
                  ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                  : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
              }`}
            >
              <div className="space-y-1.5">
                {booking.status === 'cancelled' && booking.cancelledAt && (
                  <div className="text-sm">
                    <span className="font-semibold text-red-700 dark:text-red-400">{t('bookingCard.cancelled')}</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t('bookingCard.updated')} {formatDateTime(booking.cancelledAt)}
                    </p>
                  </div>
                )}
                {booking.status === 'rescheduled' && booking.previousDate && booking.previousTime && (
                  <div className="text-sm">
                    <span className="font-semibold text-orange-700 dark:text-orange-400">{t('bookingCard.rescheduled')}</span>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      <p>{t('bookingCard.previous')} {formatDate(booking.previousDate)} {t('bookingCard.at')} {booking.previousTime}</p>
                      <p>{t('bookingCard.new')} {formatDate(booking.date)} {t('bookingCard.at')} {booking.startTime}</p>
                      {booking.updatedAt && (
                        <p className="mt-1 text-gray-500">{t('bookingCard.updated')} {formatDateTime(booking.updatedAt)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Horizontal Layout (Desktop) / Vertical (Mobile) */}
          <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-4 mb-4">
            
            {/* Left Block - Info Stack (Date, Time, Price) */}
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#5B8CFF] flex-shrink-0" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {(() => {
                    const date = new Date(booking.date);
                    const months = t('common.months.short') as unknown as string[];
                    const monthName = (Array.isArray(months) && months[date.getMonth()]) || date.toLocaleString('en-US', { month: 'short' });
                    const month = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                    const day = date.getDate().toString().padStart(2, '0');
                    return `${month} ${day}`;
                  })()}
                </span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#5B8CFF] flex-shrink-0" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {safeSplit(booking.startTime, ':').slice(0, 2).join(':')} - {safeSplit(booking.endTime, ':').slice(0, 2).join(':')}
                </span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-[#5B8CFF] flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatPrice(booking.price)} UZS
                </span>
              </div>
            </div>

            {/* Right Block - Action Buttons Column */}
            {viewAs === 'customer' && booking.status !== 'cancelled' && (
              <div className="flex flex-col gap-2.5 w-full md:w-auto md:min-w-[140px] md:justify-center">
                <Button
                  size="sm"
                  onClick={handleReschedule}
                  className="w-full h-10 px-4 gap-2 text-sm font-semibold bg-[#5B8CFF] text-white hover:bg-[#4a80f0] dark:bg-[#5B8CFF] dark:hover:bg-[#4a80f0] transition-all duration-200 rounded-2xl shadow-sm hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('bookingCard.reschedule')}</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="w-full h-10 px-4 gap-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200 rounded-2xl"
                >
                  <X className="w-4 h-4" />
                  <span>{t('bookingCard.cancel')}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Phone Number Section - Bottom */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                {t('bookingCard.phoneNumberLabel')}
              </span>
              {viewAs === 'customer' && barberPhone ? (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#5B8CFF]" />
                  <a
                    href={`tel:${barberPhone}`}
                    className="font-semibold text-[#5B8CFF] hover:text-[#155DFC] transition-colors text-sm"
                  >
                    {barberPhone}
                  </a>
                </div>
              ) : viewAs === 'barber' && (booking.customerPhone || booking.customer?.phone || (booking as any).manualCustomerPhone) ? (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#5B8CFF]" />
                  <a
                    href={`tel:${booking.customerPhone || booking.customer?.phone || (booking as any).manualCustomerPhone}`}
                    className="font-semibold text-[#5B8CFF] hover:text-[#155DFC] transition-colors text-sm"
                  >
                    {booking.customerPhone || booking.customer?.phone || (booking as any).manualCustomerPhone}
                  </a>
                </div>
              ) : (
                <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}