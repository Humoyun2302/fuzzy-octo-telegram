import { motion } from 'motion/react';
import { X, FileText, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { useLanguage } from '../contexts/LanguageContext';

interface TermsAndConditionsProps {
  onClose: () => void;
}

export function TermsAndConditions({ onClose }: TermsAndConditionsProps) {
  const { t } = useLanguage();
  const sections = [1, 2, 3, 4, 5];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        <Card className="flex flex-col h-full max-h-[85vh]">
          <CardHeader className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-[#5B8CFF]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t('terms.title')}
                  </h2>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6 text-gray-700 dark:text-gray-300 space-y-6">
                <p className="font-medium text-gray-900 dark:text-white">{t('terms.intro')}</p>
                
                {sections.map(i => (
                  <section key={i}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      {t(`terms.section${i}Title`)}
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {t(`terms.section${i}Content`)}
                    </p>
                  </section>
                ))}

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {t('terms.lastUpdated')}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>

          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-[rgba(249,250,251,0)] dark:bg-gray-800/50">
            <Button
              onClick={onClose}
              className="w-full"
              variant="default"
            >
              {t('common.close')}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}