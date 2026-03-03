import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';

interface AddCardPageProps {
  onBack: () => void;
  onCardAdded: (cardDetails: any) => void;
}

export function AddCardPage({ onBack, onCardAdded }: AddCardPageProps) {
  const { t } = useLanguage();
  const [cardDetails, setCardDetails] = useState({
    holderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });

  const [cardType, setCardType] = useState<'uzcard' | 'humo' | 'visa' | 'mastercard' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detect card type based on number
  const detectCardType = (number: string): typeof cardType => {
    const cleaned = number.replace(/\s/g, '');
    
    // Uzcard: starts with 8600, 5614, 6262, 5440
    if (/^(8600|5614|6262|5440)/.test(cleaned)) return 'uzcard';
    
    // Humo: starts with 9860
    if (/^9860/.test(cleaned)) return 'humo';
    
    // Visa: starts with 4
    if (/^4/.test(cleaned)) return 'visa';
    
    // Mastercard: starts with 51-55 or 2221-2720
    if (/^(5[1-5]|2[2-7])/.test(cleaned)) return 'mastercard';
    
    return null;
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    if (cleaned.length <= 16 && /^\d*$/.test(cleaned)) {
      const formatted = formatCardNumber(cleaned);
      setCardDetails({ ...cardDetails, cardNumber: formatted });
      setCardType(detectCardType(cleaned));
      if (errors.cardNumber) {
        setErrors({ ...errors, cardNumber: '' });
      }
    }
  };

  const handleExpiryDateChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      const formatted = formatExpiryDate(cleaned);
      setCardDetails({ ...cardDetails, expiryDate: formatted });
      if (errors.expiryDate) {
        setErrors({ ...errors, expiryDate: '' });
      }
    }
  };

  const handleCvvChange = (value: string) => {
    if (value.length <= 3 && /^\d*$/.test(value)) {
      setCardDetails({ ...cardDetails, cvv: value });
      if (errors.cvv) {
        setErrors({ ...errors, cvv: '' });
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!cardDetails.holderName.trim()) {
      newErrors.holderName = 'Cardholder name is required';
    }

    const cleanedNumber = cardDetails.cardNumber.replace(/\s/g, '');
    if (!cleanedNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cleanedNumber.length !== 16) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    } else if (!cardType) {
      newErrors.cardNumber = 'Invalid card number';
    }

    if (!cardDetails.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else if (cardDetails.expiryDate.length !== 5) {
      newErrors.expiryDate = 'Invalid expiry date';
    } else {
      const [month, year] = cardDetails.expiryDate.split('/').map(Number);
      if (month < 1 || month > 12) {
        newErrors.expiryDate = 'Invalid month';
      }
    }

    if (!cardDetails.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (cardDetails.cvv.length !== 3) {
      newErrors.cvv = 'CVV must be 3 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t('toast.fixFormErrors'));
      return;
    }

    // Simulate API call
    setTimeout(() => {
      onCardAdded({
        ...cardDetails,
        type: cardType,
        lastFour: cardDetails.cardNumber.slice(-4),
      });
    }, 500);
  };

  const cardLogos: Record<string, string> = {
    uzcard: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Uzcard_logo.svg/320px-Uzcard_logo.svg.png',
    humo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Humo_logo.svg/320px-Humo_logo.svg.png',
    visa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/320px-Visa_Inc._logo.svg.png',
    mastercard: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/320px-Mastercard-logo.svg.png',
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
              <h1 className="text-xl">Add Card</h1>
              <p className="text-sm text-gray-600">Enter your card details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6"
        >
          {/* Card Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative w-full h-48 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 p-6 text-white shadow-xl overflow-hidden"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl transform translate-x-8 -translate-y-8" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl transform -translate-x-12 translate-y-12" />
            </div>

            {/* Card content */}
            <div className="relative h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <CreditCard className="w-10 h-10" />
                {cardType && (
                  <motion.img
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={cardLogos[cardType]}
                    alt={cardType}
                    className="h-8 object-contain"
                  />
                )}
              </div>

              <div>
                <p className="text-xl tracking-wider mb-3 font-mono">
                  {cardDetails.cardNumber || '•••• •••• •••• ••••'}
                </p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs opacity-70 mb-1">CARDHOLDER</p>
                    <p className="text-sm uppercase tracking-wide">
                      {cardDetails.holderName || 'YOUR NAME'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70 mb-1">EXPIRES</p>
                    <p className="text-sm tracking-wide">
                      {cardDetails.expiryDate || 'MM/YY'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Cardholder Name */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label htmlFor="holderName">Cardholder Name</Label>
              <Input
                id="holderName"
                placeholder="John Doe"
                value={cardDetails.holderName}
                onChange={(e) => {
                  setCardDetails({ ...cardDetails, holderName: e.target.value });
                  if (errors.holderName) {
                    setErrors({ ...errors, holderName: '' });
                  }
                }}
                className={errors.holderName ? 'border-red-500' : ''}
              />
              {errors.holderName && (
                <p className="text-sm text-red-600 mt-1">{errors.holderName}</p>
              )}
            </motion.div>

            {/* Card Number */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className={errors.cardNumber ? 'border-red-500' : ''}
                />
                {cardType && (
                  <motion.img
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={cardLogos[cardType]}
                    alt={cardType}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-6 object-contain"
                  />
                )}
              </div>
              {errors.cardNumber && (
                <p className="text-sm text-red-600 mt-1">{errors.cardNumber}</p>
              )}
            </motion.div>

            {/* Expiry Date & CVV */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={cardDetails.expiryDate}
                  onChange={(e) => handleExpiryDateChange(e.target.value)}
                  className={errors.expiryDate ? 'border-red-500' : ''}
                />
                {errors.expiryDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.expiryDate}</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="password"
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={(e) => handleCvvChange(e.target.value)}
                  className={errors.cvv ? 'border-red-500' : ''}
                />
                {errors.cvv && (
                  <p className="text-sm text-red-600 mt-1">{errors.cvv}</p>
                )}
              </motion.div>
            </div>
          </div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-6 text-base shadow-lg"
            >
              Save Card
            </Button>
          </motion.div>
        </motion.form>

        {/* Security Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-500 mt-4"
        >
          🔒 Your card information is encrypted and secure
        </motion.p>
      </div>
    </div>
  );
}
