import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Settings, Edit, Share2, MapPin, TrendingUp, DollarSign,
  Users, Star, Clock, LogOut, Calendar, Scissors, Copy, Check, Navigation
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { User, Booking, Barber } from '../types';
import { BookingCard } from './BookingCard';
import { toast } from 'sonner@2.0.3';
import { calculatePriceRange } from '../utils/priceUtils';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileProfilePageProps {
  user: User;
  bookings?: Booking[];
  barberProfile?: Barber;
  stats?: any;
  onBack: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
  onCancelBooking?: (id: string) => void;
  onRescheduleBooking?: () => void;
  onBookAgain?: () => void;
}

export function MobileProfilePage({
  user,
  bookings = [],
  barberProfile,
  stats,
  onBack,
  onEditProfile,
  onLogout,
  onCancelBooking,
  onRescheduleBooking,
  onBookAgain,
}: MobileProfilePageProps) {
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isBarber = user.role === 'barber';
  const upcomingBookings = bookings.filter(b => b.status !== 'cancelled');
  const pastBookings = bookings.filter(b => b.status === 'cancelled');

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/barber/${user.id}`;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    toast.success(t('toast.profileLinkCopied'));
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const handleOpenMap = () => {
    if (barberProfile?.districts?.[0]) {
      const location = `${barberProfile.districts[0]}, Tashkent, Uzbekistan`;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
      window.open(mapsUrl, '_blank');
      toast.success(t('toast.openingMap'));
    }
  };

  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Sticky Header */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg">{t('customer.profile.myProfile')}</h2>
        <Button
          variant="ghost"
          size="sm"
          className="p-2"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Scrollable Content */}
      <div ref={profileRef} className="overflow-y-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6"
        >
          <div className="flex flex-col items-center text-center mb-4">
            <Avatar className="w-28 h-28 ring-4 ring-emerald-100 dark:ring-emerald-900 mb-4">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h1 className="mb-1">{user.name}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isBarber ? barberProfile?.bio || t('customer.profile.professionalBarber') : `${t('customer.profile.loyalCustomerSince')} ${new Date().getFullYear()}`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={onEditProfile}
              className="flex-1 gap-2"
              variant="outline"
            >
              <Edit className="w-4 h-4" />
              {t('customer.profile.editProfile')}
            </Button>
            {isBarber && (
              <Button
                onClick={handleShareLink}
                className="flex-1 gap-2"
                variant="outline"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    {t('customer.profile.copied')}
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    {t('customer.profile.shareLink')}
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>

        <Separator />

        {/* Customer View */}
        {!isBarber && (
          <div className="p-4 space-y-6">
            {/* My Bookings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  {t('customer.myBookings')}
                </h3>
                <Badge>{upcomingBookings.length} {t('customer.profile.upcoming')}</Badge>
              </div>

              {upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      viewAs="customer"
                      onCancel={onCancelBooking}
                      onReschedule={onRescheduleBooking}
                      onBookAgain={onBookAgain}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('customer.profile.noUpcomingBookings')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="mb-4 text-gray-600">{t('customer.profile.pastBookings')}</h3>
                <div className="space-y-3 opacity-60">
                  {pastBookings.slice(0, 3).map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      viewAs="customer"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Barber View */}
        {isBarber && barberProfile && (
          <div className="p-4 space-y-6">
            {/* Workplace Location */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
                {t('customer.profile.workplaceLocation')}
              </h3>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20">
                    <p className="text-sm mb-2">{t('customer.profile.workingDistricts')}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {barberProfile.districts.map((district) => (
                        <Badge key={district} variant="secondary">
                          {district}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      onClick={handleOpenMap}
                      className="w-full gap-2"
                      size="sm"
                    >
                      <Navigation className="w-4 h-4" />
                      {t('customer.profile.getDirections')}
                    </Button>
                  </div>
                  {/* Map Preview Placeholder */}
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <p className="text-sm text-gray-500">{t('customer.profile.mapPreview')}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  {t('customer.profile.myStats')}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200">
                    <CardContent className="p-4 text-center">
                      <Users className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                      <p className="text-2xl font-semibold">{stats.totalCustomersThisWeek}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t('customer.profile.customers')}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                      <p className="text-lg font-semibold">{formatPrice(stats.todaysEarnings)}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t('customer.profile.earnings')}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <Star className="w-6 h-6 text-blue-600 mx-auto mb-2 fill-current" />
                      <p className="text-2xl font-semibold">{barberProfile.rating}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t('customer.profile.rating')}</p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Services & Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="flex items-center gap-2 mb-4">
                <Scissors className="w-5 h-5 text-purple-600" />
                {t('customer.profile.servicesPricing')}
              </h3>
              <div className="space-y-2">
                {/* Use services if available, fallback to specialties */}
                {barberProfile.services && barberProfile.services.length > 0 ? (
                  barberProfile.services.map((service) => (
                    <Card key={service.name}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <span className="text-sm">{service.name}</span>
                        <Badge variant="outline">
                          {formatPrice(service.price)} UZS
                        </Badge>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  barberProfile.specialties.map((service, index) => (
                    <Card key={service}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <span className="text-sm">{service}</span>
                        <Badge variant="outline">
                          {formatPrice(barberProfile.priceRange.min + (index * 20000))} UZS
                        </Badge>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </motion.div>

            {/* Availability */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  {t('customer.profile.availability')}
                </h3>
                <Button variant="outline" size="sm">
                  {t('customer.profile.editHours')}
                </Button>
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('customer.profile.mondayFriday')}</span>
                      <span>9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('customer.profile.saturday')}</span>
                      <span>10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('customer.profile.sunday')}</span>
                      <span className="text-red-600">{t('customer.profile.closed')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Customer Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-yellow-600" />
                {t('customer.profile.customerReviews')}
              </h3>
              <div className="space-y-3">
                {[1, 2, 3].map((review) => (
                  <Card key={review}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={`https://i.pravatar.cc/150?img=${review}`} />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{t('customer.profile.customer')} {review}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('customer.profile.excellentService')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Logout Button - Fixed at Bottom */}
        <div className="p-4 pb-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200"
            >
              <LogOut className="w-4 h-4" />
              {t('customer.profile.logout')}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}