import { motion, AnimatePresence } from 'motion/react';
import { X, User, LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

interface BookingOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestBooking: () => void;
  onSignIn: () => void;
}

export function BookingOptionsModal({
  isOpen,
  onClose,
  onGuestBooking,
  onSignIn,
}: BookingOptionsModalProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto"
          >
            <div className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl">
              {/* Header */}
              <div className="relative p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {t('booking.howToBook') || 'How would you like to book?'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('booking.chooseBookingMethod') || 'Choose your preferred booking method'}
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Guest Booking Option */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onGuestBooking}
                    className="w-full h-auto py-4 px-6 flex flex-col items-start gap-2 bg-primary hover:bg-primary/90"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-white text-base">
                          {t('booking.bookAsGuest') || 'Book as a Guest'}
                        </div>
                        <div className="text-xs text-white/80 mt-0.5">
                          {t('booking.noAccountRequired') || 'No account required'}
                        </div>
                      </div>
                    </div>
                  </Button>
                </motion.div>

                {/* Sign In Option */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onSignIn}
                    variant="outline"
                    className="w-full h-auto py-4 px-6 flex flex-col items-start gap-2 border-2"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <LogIn className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-foreground text-base">
                          {t('booking.signInOrCreate') || 'Sign in / Create account'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t('booking.saveBookingHistory') || 'Save your booking history'}
                        </div>
                      </div>
                    </div>
                  </Button>
                </motion.div>
              </div>

              {/* Safe area padding for mobile */}
              <div className="h-safe pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
