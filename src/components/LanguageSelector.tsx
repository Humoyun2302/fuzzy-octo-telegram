import { motion } from 'motion/react';
import { Languages, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'inline' | 'card' | 'dropdown';
}

export function LanguageSelector({ variant = 'inline' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: 'uz' as const, name: "O'zbek", flag: '🇺🇿' },
    { code: 'ru' as const, name: 'Русский', flag: '🇷🇺' },
    { code: 'en' as const, name: 'English', flag: '🇬🇧' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0];

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-[8px] hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 backdrop-blur-sm bg-[rgba(255,255,255,0.46)]">
            <Languages className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
            <span className="text-base leading-none text-[rgb(10,30,63)]">{currentLanguage.flag}</span>
            <span className="font-medium text-xs hidden sm:inline">{currentLanguage.name}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`cursor-pointer gap-2 ${
                language === lang.code ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : ''
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {language === lang.code && (
                <span className="text-[#5B8CFF] dark:text-blue-400">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'card') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-5 h-5 text-blue-600" />
            <Label>{t('settings.language')}</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <motion.div
                key={lang.code}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge
                  variant={language === lang.code ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-2 text-sm transition-all"
                  onClick={() => setLanguage(lang.code)}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Label className="mb-2 block">{t('settings.selectLanguage')}</Label>
      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <motion.div
            key={lang.code}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Badge
              variant={language === lang.code ? 'default' : 'outline'}
              className="cursor-pointer px-4 py-2 text-sm transition-all"
              onClick={() => setLanguage(lang.code)}
            >
              <span className="mr-2">{lang.flag}</span>
              {lang.name}
            </Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
}