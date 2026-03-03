import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CardListPageProps {
  onBack: () => void;
  onAddCard: () => void;
}

type PaymentMethod = 'payme' | 'click' | null;

export function CardListPage({ onBack, onAddCard }: CardListPageProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const { t } = useLanguage();

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    toast.success(`${method === 'payme' ? 'Payme' : 'Click'} selected as payment method`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Payment Methods</h1>
              <p className="text-sm text-gray-600">Choose your payment method</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="space-y-4">
          {/* Payme Payment Method */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card 
              className={`overflow-hidden cursor-pointer transition-all duration-200 ${
                selectedMethod === 'payme' 
                  ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-100' 
                  : 'border border-gray-200 hover:border-emerald-300 hover:shadow-md'
              }`}
              onClick={() => handleSelectMethod('payme')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* Payme Logo */}
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <ImageWithFallback
                      src="https://payme.uz/images/logo.svg"
                      alt="Payme"
                      className="w-12 h-12 object-contain"
                    />
                  </div>

                  {/* Payment Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Payme</h3>
                    <p className="text-sm text-gray-600">Pay with Payme</p>
                  </div>

                  {/* Selection Indicator */}
                  {selectedMethod === 'payme' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Click Payment Method */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card 
              className={`overflow-hidden cursor-pointer transition-all duration-200 ${
                selectedMethod === 'click' 
                  ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-100' 
                  : 'border border-gray-200 hover:border-emerald-300 hover:shadow-md'
              }`}
              onClick={() => handleSelectMethod('click')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* Click Logo */}
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <ImageWithFallback
                      src="https://click.uz/click/images/logo.svg"
                      alt="Click"
                      className="w-12 h-12 object-contain"
                    />
                  </div>

                  {/* Payment Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Click</h3>
                    <p className="text-sm text-gray-600">Pay with Click</p>
                  </div>

                  {/* Selection Indicator */}
                  {selectedMethod === 'click' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}