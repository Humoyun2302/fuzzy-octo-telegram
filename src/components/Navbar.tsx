import { motion } from 'motion/react';
import { Home, Search, Calendar, Scissors, LogOut, Clock, Wallet, Edit, Heart, CreditCard, User, Map as MapIcon } from 'lucide-react';
import { Button } from './ui/button';
import { UserRole } from '../types';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface NavbarProps {
  currentUser: { name: string; role: UserRole } | null;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navbar({ currentUser, onLogout, activeTab, onTabChange }: NavbarProps) {
  const { t } = useLanguage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  const navItems = currentUser
    ? currentUser.role === 'customer'
      ? [
          { id: 'search', label: t('common.home'), icon: Home },
          { id: 'map', label: t('common.map'), icon: MapIcon },
          { id: 'favorites', label: t('common.favorites'), icon: Heart },
          { id: 'home', label: t('common.myAppointments'), icon: Calendar },
          { id: 'profile', label: t('common.profile'), icon: User },
        ]
      : [
          { id: 'home', label: t('common.home'), icon: Home },
          { id: 'schedule', label: t('barber.schedule'), icon: Calendar },
          { id: 'subscription', label: t('subscription.title'), icon: CreditCard },
          { id: 'edit-profile', label: t('barber.editProfile'), icon: Edit },
        ]
    : [
        { id: 'search', label: t('common.home'), icon: Home },
        { id: 'map', label: t('common.map'), icon: MapIcon },
        { id: 'profile', label: t('common.profile'), icon: User },
      ];

  return (
    <>
      {/* Top Bar - Desktop & Mobile */}
      <motion.nav
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 glass backdrop-blur-xl border-b border-primary/10"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 sm:py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-primary text-lg sm:text-xl font-bold tracking-tight">Bardak</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {/* Desktop Nav Items */}
              {navItems.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    variant={activeTab === item.id ? 'default' : 'ghost'}
                    onClick={() => onTabChange(item.id)}
                    size="sm"
                    className={`gap-2 transition-all duration-300 h-8 ${
                      activeTab === item.id
                        ? 'shadow-lg'
                        : ''
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Button>
                </motion.div>
              ))}

              {/* Desktop Right Side */}
              <div className="flex items-center gap-2 ml-2">
                {/* Info Pills - Desktop only */}
                <div className="hidden lg:flex items-center gap-2">
                  <div className="px-2 py-1 rounded-lg bg-secondary/50 border border-primary/10 flex items-center gap-1.5 text-xs text-foreground font-medium shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>UTC +5</span>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-secondary/50 border border-primary/10 flex items-center gap-1.5 text-xs text-foreground font-medium shadow-sm">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span>UZS</span>
                  </div>
                </div>

                {/* Language Selector */}
                <LanguageSelector variant="dropdown" />

                {/* Logout Button - Only show if logged in */}
                {currentUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoutClick}
                    className="gap-2 h-8 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{t('common.logout')}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Top Right */}
            <div className="flex md:hidden items-center gap-2">
              {/* Language Selector */}
              <LanguageSelector variant="dropdown" />

              {/* Logout Button - Icon only on mobile - Only show if logged in */}
              {currentUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogoutClick}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Bottom Navigation - Mobile Only */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      >
        {/* Classic white navbar with top shadow */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
          {/* Navigation Items */}
          <div className="flex items-center justify-around px-6 py-2 relative">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="flex flex-col items-center justify-center gap-1 min-w-[60px] py-0.5 relative"
                >
                  {/* Top indicator line - only for active with animation */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabIndicator"
                      className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-primary dark:bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  {/* Icon container with animation */}
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    {isActive && (
                      <motion.div
                        layoutId="activeTabCircle"
                        className="absolute w-10 h-10 rounded-full bg-secondary dark:bg-secondary/20"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <item.icon 
                      className={`w-5 h-5 relative z-10 transition-colors duration-300 ${
                        isActive 
                          ? 'text-primary dark:text-primary' 
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                      strokeWidth={2}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Logout Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center relative shadow-lg shadow-red-100/50 border border-red-100/50 backdrop-blur-sm">
              {/* Glassmorphism inner glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-100/30 to-transparent"></div>
              {/* Soft 3D depth effect */}
              <div className="absolute inset-[2px] rounded-2xl bg-gradient-to-br from-white/40 to-transparent"></div>
              <LogOut className="w-7 h-7 text-red-500 relative z-10 drop-shadow-sm" />
            </div>
            <DialogTitle className="text-xl text-center font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{t('common.logout')}</DialogTitle>
            <DialogDescription className="text-center text-gray-600 leading-relaxed pt-1">
              {t('common.logoutDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={handleCancelLogout}
              className="flex-1 sm:flex-none sm:min-w-[120px]"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmLogout}
              className="flex-1 sm:flex-none sm:min-w-[120px] bg-red-500 hover:bg-red-600"
            >
              {t('common.logout')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}