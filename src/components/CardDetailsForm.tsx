import { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

interface CardDetailsFormProps {
  onSubmit: (cardDetails: CardDetails) => void;
  submitLabel?: string;
  isProcessing?: boolean;
}

export interface CardDetails {
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardType: 'uzcard' | 'humo' | 'visa' | 'mastercard' | 'unknown';
}

export function CardDetailsForm({ onSubmit, submitLabel = 'Save card & pay', isProcessing = false }: CardDetailsFormProps) {
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardType: 'unknown',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const detectCardType = (cardNumber: string): CardDetails['cardType'] => {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    // Uzcard: starts with 8600, 5614, 9860, 6262, 5440
    if (/^(8600|5614|9860|6262|5440)/.test(cleaned)) {
      return 'uzcard';
    }
    
    // Humo: starts with 9860 (but different than Uzcard pattern), 6262 (but different)
    if (/^(9860|6262)/.test(cleaned) && !/^(8600|5614)/.test(cleaned)) {
      return 'humo';
    }
    
    // Visa: starts with 4
    if (/^4/.test(cleaned)) {
      return 'visa';
    }
    
    // Mastercard: starts with 51-55 or 2221-2720
    if (/^5[1-5]/.test(cleaned) || /^(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(cleaned)) {
      return 'mastercard';
    }
    
    return 'unknown';
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const limited = cleaned.slice(0, 16);
    const formatted = limited.match(/.{1,4}/g)?.join(' ') || limited;
    return formatted;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    const cardType = detectCardType(formatted);
    setCardDetails({ ...cardDetails, cardNumber: formatted, cardType });
    if (errors.cardNumber) {
      setErrors({ ...errors, cardNumber: '' });
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setCardDetails({ ...cardDetails, expiryDate: formatted });
    if (errors.expiryDate) {
      setErrors({ ...errors, expiryDate: '' });
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCardDetails({ ...cardDetails, cvv: value });
    if (errors.cvv) {
      setErrors({ ...errors, cvv: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!cardDetails.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    const cleanedCardNumber = cardDetails.cardNumber.replace(/\s/g, '');
    if (!cleanedCardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cleanedCardNumber.length < 16) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    }

    if (!cardDetails.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else {
      const [month, year] = cardDetails.expiryDate.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      
      if (!month || !year) {
        newErrors.expiryDate = 'Invalid format (MM/YY)';
      } else if (parseInt(month) < 1 || parseInt(month) > 12) {
        newErrors.expiryDate = 'Invalid month';
      } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiryDate = 'Card has expired';
      }
    }

    if (!cardDetails.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (cardDetails.cvv.length < 3) {
      newErrors.cvv = 'CVV must be 3 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(cardDetails);
    }
  };

  const getCardIcon = () => {
    switch (cardDetails.cardType) {
      case 'uzcard':
        return (
          <div className="px-3 py-1.5 rounded bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-medium">
            UZCARD
          </div>
        );
      case 'humo':
        return (
          <div className="px-3 py-1.5 rounded bg-gradient-to-r from-green-600 to-green-500 text-white text-xs font-medium">
            HUMO
          </div>
        );
      case 'visa':
        return (
          <div className="px-3 py-1.5 rounded bg-gradient-to-r from-blue-800 to-blue-700 text-white text-xs font-medium">
            VISA
          </div>
        );
      case 'mastercard':
        return (
          <div className="px-3 py-1.5 rounded bg-gradient-to-r from-red-600 to-orange-600 text-white text-xs font-medium">
            MASTERCARD
          </div>
        );
      default:
        return <CreditCard className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Card Type Indicators */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600 dark:text-gray-400">Accepted cards:</span>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs">
            UZCARD
          </div>
          <div className="px-2.5 py-1 rounded bg-gradient-to-r from-green-600 to-green-500 text-white text-xs">
            HUMO
          </div>
          <div className="px-2.5 py-1 rounded bg-gradient-to-r from-blue-800 to-blue-700 text-white text-xs">
            VISA
          </div>
          <div className="px-2.5 py-1 rounded bg-gradient-to-r from-red-600 to-orange-600 text-white text-xs">
            MC
          </div>
        </div>
      </div>

      {/* Cardholder Name */}
      <div>
        <Label htmlFor="cardholderName">Cardholder Name *</Label>
        <Input
          id="cardholderName"
          value={cardDetails.cardholderName}
          onChange={(e) => {
            setCardDetails({ ...cardDetails, cardholderName: e.target.value.toUpperCase() });
            if (errors.cardholderName) {
              setErrors({ ...errors, cardholderName: '' });
            }
          }}
          placeholder="JOHN DOE"
          className={`mt-1 ${errors.cardholderName ? 'border-red-500' : ''}`}
          disabled={isProcessing}
        />
        {errors.cardholderName && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 mt-1 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.cardholderName}
          </motion.p>
        )}
      </div>

      {/* Card Number */}
      <div>
        <Label htmlFor="cardNumber">Card Number *</Label>
        <div className="relative mt-1">
          <Input
            id="cardNumber"
            value={cardDetails.cardNumber}
            onChange={handleCardNumberChange}
            placeholder="1234 5678 9012 3456"
            className={`pr-24 ${errors.cardNumber ? 'border-red-500' : ''}`}
            disabled={isProcessing}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getCardIcon()}
          </div>
        </div>
        {errors.cardNumber && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 mt-1 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.cardNumber}
          </motion.p>
        )}
      </div>

      {/* Expiry Date and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expiryDate">Expiry Date *</Label>
          <Input
            id="expiryDate"
            value={cardDetails.expiryDate}
            onChange={handleExpiryChange}
            placeholder="MM/YY"
            className={`mt-1 ${errors.expiryDate ? 'border-red-500' : ''}`}
            maxLength={5}
            disabled={isProcessing}
          />
          {errors.expiryDate && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 mt-1 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {errors.expiryDate}
            </motion.p>
          )}
        </div>
        <div>
          <Label htmlFor="cvv">CVV/CVC *</Label>
          <Input
            id="cvv"
            type="password"
            value={cardDetails.cvv}
            onChange={handleCvvChange}
            placeholder="123"
            className={`mt-1 ${errors.cvv ? 'border-red-500' : ''}`}
            maxLength={3}
            disabled={isProcessing}
          />
          {errors.cvv && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 mt-1 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {errors.cvv}
            </motion.p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 gap-2"
        size="lg"
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            {submitLabel}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        🔒 Your card details are encrypted and secure
      </p>
    </form>
  );
}
