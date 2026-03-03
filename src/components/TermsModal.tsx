import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree?: () => void;
  mode?: 'terms' | 'privacy';
}

export function TermsModal({ isOpen, onClose, onAgree, mode = 'terms' }: TermsModalProps) {
  const { t } = useLanguage();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setHasScrolledToBottom(isAtBottom);
    }
  };

  const handleAgree = () => {
    if (onAgree) {
      onAgree();
    }
    onClose();
  };

  const sectionCount = mode === 'terms' ? 5 : 4;
  const sections = Array.from({ length: sectionCount }, (_, i) => i + 1);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 sm:inset-8 md:inset-16 bg-white rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t(`${mode}.title`)}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/80 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div
              ref={contentRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8"
              style={{ overscrollBehavior: 'contain' }}
            >
              <div className="max-w-3xl mx-auto space-y-6 text-gray-700">
                {mode === 'terms' && (
                  <p className="leading-relaxed font-medium text-gray-900">
                    {t('terms.intro')}
                  </p>
                )}

                {sections.map((i) => (
                  <section key={i}>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {t(`${mode}.section${i}Title`)}
                    </h3>
                    <p className="leading-relaxed">
                      {t(`${mode}.section${i}Content`)}
                    </p>
                  </section>
                ))}

                {mode === 'terms' && (
                  <section className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 italic">
                      {t('terms.lastUpdated')}
                    </p>
                  </section>
                )}

                {!hasScrolledToBottom && mode === 'terms' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[rgb(54,108,255)] pointer-events-none"
                  >
                    <span className="text-sm font-medium">{t('terms.scrollToBottom')}</span>
                    <motion.div
                      animate={{ y: [0, 8, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ChevronDown className="w-6 h-6" />
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 px-6 py-5 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between gap-4">
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="lg"
                  className={onAgree ? "flex-1 sm:flex-none" : "w-full sm:w-auto"}
                >
                  {t('common.close')}
                </Button>
                {onAgree && (
                  <Button
                    onClick={handleAgree}
                    disabled={!hasScrolledToBottom && mode === 'terms'}
                    size="lg"
                    className="flex-1 sm:flex-none sm:w-auto min-h-[52px] h-auto py-3 px-3 sm:px-6 bg-gradient-to-r from-[rgb(54,108,255)] to-[rgb(91,140,255)] hover:from-[rgb(54,108,255)]/90 hover:to-[rgb(91,140,255)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm sm:text-base font-medium whitespace-normal leading-tight"
                  >
                    {t('terms.agreeAndContinue')}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
