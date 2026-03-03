import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, DollarSign, Clock, TrendingUp, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatCard } from './StatCard';
import { BookingCard } from './BookingCard';
import { ScheduleCalendar } from './ScheduleCalendar';
import { BarberProfileEditor } from './BarberProfileEditor';
import { SubscriptionManagement } from './SubscriptionManagement';
import { ManualBookingForm } from './ManualBookingForm';
import { IncompleteProfileBanner } from './IncompleteProfileBanner';
import { SubscriptionExpiredBanner } from './SubscriptionExpiredBanner';
import { Booking, Stats, Barber, ManualBooking } from '../types';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';

interface BarberDashboardProps {
  barberName: string;
  stats: Stats;
  todaysBookings: Booking[];
  allBookings: Booking[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  barberProfile: Barber;
  onUpdateProfile: (updatedBarber: Barber) => void;
  onSaveManualBooking: (booking: ManualBooking) => void;
  onDeleteManualBooking: (id: string) => void;
  onAddBooking: (booking: Omit<Booking, 'id'>) => void;
}

export function BarberDashboard({
  barberName,
  stats,
  todaysBookings,
  allBookings,
  activeTab,
  onTabChange,
  barberProfile,
  onUpdateProfile,
  onSaveManualBooking,
  onDeleteManualBooking,
  onAddBooking,
}: BarberDashboardProps) {
  const { t } = useLanguage();
  const [showManualBookingForm, setShowManualBookingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateNavigationIndex, setDateNavigationIndex] = useState(0);
  const [scheduleRefreshTrigger, setScheduleRefreshTrigger] = useState(0);
  
  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  
  // Get unique dates with bookings (sorted, excluding past dates)
  const datesWithBookings = Array.from(
    new Set(allBookings.map(b => b.date))
  )
    .filter(date => date >= today) // Only future and today's dates
    .sort();
  
  // Get bookings to display (either selected date's or today's)
  const displayBookings = selectedDate 
    ? allBookings.filter(b => b.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime))
    : todaysBookings;

  // Filter out past bookings if the selected date is today (or if showing today's bookings by default)
  // We want to hide bookings that have already ended.
  const visibleBookings = displayBookings.filter(booking => {
    // If we are looking at a future date, show all
    if (booking.date > today) return true;
    
    // If we are looking at a past date, technically we should show history?
    // But the user issue implies they don't want to see "past" items in the "schedule".
    // However, "past dates" usually implies looking at history.
    // The issue specifically showed "Today" (Jan 31) with a past time (12:00).
    // So we primarily care about filtering TODAY's past bookings.
    if (booking.date < today) return true; // Keep history for past days if selected

    // It is today. Filter by time.
    // Use local time for comparison since booking times are local
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [endHour, endMinute] = booking.endTime.split(':').map(Number);
    const bookingEndMinutes = endHour * 60 + endMinute;
    
    return bookingEndMinutes > currentMinutes;
  });
  
  // Get visible date buttons (max 3)
  const MAX_VISIBLE_DATES = 3;
  const visibleDates = datesWithBookings.slice(dateNavigationIndex, dateNavigationIndex + MAX_VISIBLE_DATES);
  
  // Check if we can navigate
  const canNavigateLeft = dateNavigationIndex > 0;
  const canNavigateRight = dateNavigationIndex + MAX_VISIBLE_DATES < datesWithBookings.length;
  
  // Format date for display
  const formatDateButton = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate();
  };
  
  // Get month name for display
  const getMonthName = (dateStr: string) => {
    const date = new Date(dateStr);
    const months = t('common.months.short') as unknown as string[];
    
    // Check if we got an array (meaning translation exists)
    if (Array.isArray(months) && months[date.getMonth()]) {
       return months[date.getMonth()];
    }
    
    return date.toLocaleDateString('en-US', { month: 'short' });
  };
  
  const handleNavigateLeft = () => {
    if (canNavigateLeft) {
      setDateNavigationIndex(prev => Math.max(0, prev - 1));
    }
  };
  
  const handleNavigateRight = () => {
    if (canNavigateRight) {
      setDateNavigationIndex(prev => Math.min(datesWithBookings.length - MAX_VISIBLE_DATES, prev + 1));
    }
  };
  
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };
  
  // CRITICAL: Log subscription data passed to SubscriptionManagement
  console.log('[BARBER DASHBOARD] 📋 Subscription props for SubscriptionManagement:', {
    currentPlan: barberProfile.currentPlan,
    subscriptionStatus: barberProfile.subscriptionStatus,
    expiryDate: barberProfile.subscriptionExpiryDate,
    isSubscriptionActive: barberProfile.isSubscriptionActive,
    source: 'barberProfile prop from App.tsx currentUser state'
  });
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const handleSubscriptionRenewal = (planId: string) => {
    const now = new Date();
    let monthsToAdd = 1;
    
    if (planId === '6-months') monthsToAdd = 6;
    else if (planId === '1-year') monthsToAdd = 12;
    
    // If subscription is currently active and not expired, add to the existing expiry date
    // Otherwise start from today
    const currentExpiry = barberProfile.subscriptionExpiryDate 
      ? new Date(barberProfile.subscriptionExpiryDate) 
      : now;
    const startDate = (barberProfile.subscriptionStatus === 'active' && currentExpiry > now) 
      ? currentExpiry 
      : now;
      
    const newExpiryDate = new Date(startDate);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);
    
    onUpdateProfile({
      ...barberProfile,
      subscriptionStatus: 'active',
      currentPlan: planId as any,
      subscriptionExpiryDate: newExpiryDate.toISOString(),
      lastPaymentDate: now.toISOString()
    });

    toast.success(t('toast.subscriptionRenewed'));
  };

  if (activeTab === 'schedule') {
    return (
      <div className="flex-1 w-full bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-center font-normal text-[20px] py-[-20px] flex justify-center items-center px-[0px] py-[9px]">{t('customer.dashboard.manageSchedule')}</h1>
          </motion.div>
          <ScheduleCalendar barberId={barberProfile.id} refreshTrigger={scheduleRefreshTrigger} />
        </div>
      </div>
    );
  }

  if (activeTab === 'edit-profile') {
    return (
      <BarberProfileEditor
        barber={barberProfile}
        onClose={() => onTabChange('home')}
        onSave={onUpdateProfile}
      />
    );
  }

  if (activeTab === 'subscription') {
    return (
      <AnimatePresence>
        <SubscriptionManagement
          barberId={barberProfile.id}
          currentPlan={barberProfile.currentPlan}
          subscriptionStatus={barberProfile.subscriptionStatus}
          expiryDate={barberProfile.subscriptionExpiryDate}
          isSubscriptionActive={barberProfile.isSubscriptionActive}
          onClose={() => onTabChange('home')}
          onSubscribe={(planId) => {
            handleSubscriptionRenewal(planId);
            onTabChange('home');
          }}
        />
      </AnimatePresence>
    );
  }

  // Default to Home / Dashboard view
  return (
    <div className="flex-1 w-full bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <h1>{t('customer.dashboard.goodDay', { name: barberProfile?.full_name || barberName })}</h1>
            <motion.span
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="text-3xl"
            >
              👋
            </motion.span>
          </div>
          <p className="text-gray-600">{t('customer.dashboard.hereOverview')}</p>
        </motion.div>

        {/* Incomplete Profile Notification Banner */}
        <IncompleteProfileBanner
          barberProfile={barberProfile}
          onCompleteSetup={() => onTabChange('edit-profile')}
        />

        {/* Subscription Expired Notification Banner - Only shows when subscription is expired */}
        <SubscriptionExpiredBanner
          subscriptionStatus={barberProfile.subscriptionStatus}
          subscriptionExpiryDate={barberProfile.subscriptionExpiryDate}
          isSubscriptionActive={barberProfile.isSubscriptionActive}
          onRenew={() => onTabChange('subscription')}
        />
        
        {/* DEBUG: Log subscription status to help identify the issue */}
        {console.log('[BARBER DASHBOARD] 🔍 Subscription Status Debug:', {
          subscriptionStatus: barberProfile.subscriptionStatus,
          subscriptionExpiryDate: barberProfile.subscriptionExpiryDate,
          isSubscriptionActive: barberProfile.isSubscriptionActive,
          currentPlan: barberProfile.currentPlan,
          showingBanner: barberProfile.subscriptionStatus === 'expired'
        })}
        
        <Separator className="my-8" />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title={t('customer.dashboard.customersThisWeek')}
            value={stats.totalCustomersThisWeek}
            subtitle={t('customer.dashboard.activeBookings')}
            icon={Users}
            color="emerald"
          />
          <StatCard
            title={t('customer.dashboard.todaysEarnings')}
            value={`${formatPrice(stats.todaysEarnings)} UZS`}
            subtitle={t('customer.dashboard.fromCompletedServices')}
            icon={DollarSign}
            color="amber"
          />
        </div>

        <Separator className="my-8" />

        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2>{t('customer.dashboard.todaysSchedule')}</h2>
              <span className="text-sm text-gray-600 ml-2">
                ({visibleBookings.length} {visibleBookings.length !== 1 ? t('customer.dashboard.appointments') : t('customer.dashboard.appointment')})
              </span>
            </div>
            {/* Desktop Button - Hidden on mobile */}
            {barberProfile.isSubscriptionActive && (
              <Button
                onClick={() => setShowManualBookingForm(true)}
                className="hidden md:flex gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-lg rounded-[16px] px-5 py-2.5 transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                {t('manualBooking.addManualBooking')}
              </Button>
            )}
          </div>

          {visibleBookings.length > 0 ? (
            <div className="space-y-6">
              {/* Date Navigation - Always show if there are bookings */}
              {datesWithBookings.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleNavigateLeft}
                    disabled={!canNavigateLeft}
                    className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Previous dates"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  
                  <div className="flex gap-2">
                    {visibleDates.map((date) => (
                      <button
                        key={date}
                        onClick={() => handleDateClick(date)}
                        className={`min-w-[60px] px-4 py-2 rounded-[16px] border transition-all duration-300 ${
                          selectedDate === date
                            ? 'bg-[#5B8CFF] text-white border-[#5B8CFF]/30 shadow-lg shadow-[#5B8CFF]/25'
                            : 'bg-white/90 backdrop-blur-sm text-gray-600 border-gray-200/50 shadow-sm hover:shadow-md hover:border-[#5B8CFF]/30 hover:bg-[#5B8CFF]/5'
                        }`}
                      >
                        <div className="text-xs opacity-70">{getMonthName(date)}</div>
                        <div className="text-lg font-semibold">{formatDateButton(date)}</div>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleNavigateRight}
                    disabled={!canNavigateRight}
                    className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Next dates"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}
              
              {/* Bookings Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleBookings
                  .map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <BookingCard booking={booking} viewAs="barber" />
                    </motion.div>
                  ))}
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="text-center py-12 px-4 rounded-lg bg-white border-2 border-dashed border-gray-200">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">{t('customer.dashboard.noAppointmentsToday')}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t('customer.dashboard.enjoyFreeTime')}
                </p>
              </div>
              
              {/* Date Navigation - Show if there are bookings on other dates */}
              {datesWithBookings.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleNavigateLeft}
                    disabled={!canNavigateLeft}
                    className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Previous dates"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  
                  <div className="flex gap-2">
                    {visibleDates.map((date) => (
                      <button
                        key={date}
                        onClick={() => handleDateClick(date)}
                        className={`min-w-[60px] px-4 py-2 rounded-[16px] border transition-all duration-300 ${
                          selectedDate === date
                            ? 'bg-[#5B8CFF] text-white border-[#5B8CFF]/30 shadow-lg shadow-[#5B8CFF]/25'
                            : 'bg-white/90 backdrop-blur-sm text-gray-600 border-gray-200/50 shadow-sm hover:shadow-md hover:border-[#5B8CFF]/30 hover:bg-[#5B8CFF]/5'
                        }`}
                      >
                        <div className="text-xs opacity-70">{getMonthName(date)}</div>
                        <div className="text-lg font-semibold">{formatDateButton(date)}</div>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleNavigateRight}
                    disabled={!canNavigateRight}
                    className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    aria-label="Next dates"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Performance Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 rounded-lg bg-gradient-to-r from-blue-100 to-emerald-100 border border-blue-200"
        >
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-emerald-600 mt-1" />
            <div>
              <h3 className="mb-2">{t('customer.dashboard.performanceInsights')}</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• {t('customer.dashboard.insightServing', { count: stats.totalCustomersThisWeek })}</li>
                <li>• {t('customer.dashboard.insightPeakHours')}</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile FAB Button - Shown only on mobile */}
      {barberProfile.isSubscriptionActive && (
        <motion.button
          onClick={() => setShowManualBookingForm(true)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="md:hidden fixed bottom-20 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl border-2 border-[#5B8CFF]/30 text-[#5B8CFF] shadow-2xl shadow-blue-300/40 hover:shadow-blue-400/50 transition-all duration-300 flex items-center justify-center z-40 overflow-hidden"
          aria-label={t('manualBooking.addManualBooking')}
        >
          {/* Soft inner glow reflection */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent rounded-full pointer-events-none" />
          
          {/* Icon */}
          <Plus className="w-7 h-7 relative z-10 drop-shadow-sm" />
        </motion.button>
      )}

      {/* Manual Booking Form Modal */}
      {showManualBookingForm && (
        <ManualBookingForm
          onClose={() => setShowManualBookingForm(false)}
          onSubmit={async (booking) => {
            await onAddBooking(booking);
            // Trigger a refresh of the schedule calendar to show the newly booked slot
            setScheduleRefreshTrigger(prev => prev + 1);
            // Don't close - let the form handle closing after success animation
          }}
          barber={barberProfile}
        />
      )}
    </div>
  );
}