import { motion } from 'motion/react';
import { Heart, Search as SearchIcon } from 'lucide-react';
import { Button } from './ui/button';
import { BarberCard } from './BarberCard';
import { Barber } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface FavoritesPageProps {
  favoriteBarbers: Barber[];
  onBookNow: (barber: Barber) => void;
  onToggleFavorite: (barberId: string) => void;
  onFindBarbers: () => void;
}

export function FavoritesPage({ 
  favoriteBarbers, 
  onBookNow, 
  onToggleFavorite,
  onFindBarbers 
}: FavoritesPageProps) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            <h1>{t('common.favorites')}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {favoriteBarbers.length > 0 
              ? `${favoriteBarbers.length} ${favoriteBarbers.length === 1 ? 'barber saved' : 'barbers saved'}`
              : 'No favorite barbers yet'
            }
          </p>
        </motion.div>

        {favoriteBarbers.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {favoriteBarbers.map((barber, index) => (
              <motion.div
                key={barber.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <BarberCard
                  barber={barber}
                  onBookNow={onBookNow}
                  isFavorite={true}
                  onToggleFavorite={onToggleFavorite}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 px-4"
          >
            <Heart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="mb-3">No favorites yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Start adding barbers to your favorites by clicking the heart icon on their profile cards
            </p>
            <Button
              onClick={onFindBarbers}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
            >
              <SearchIcon className="w-4 h-4" />
              {t('common.findBarber')}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
