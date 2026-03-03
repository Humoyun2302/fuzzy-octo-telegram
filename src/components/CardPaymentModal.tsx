import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CardDetailsForm, CardDetails } from './CardDetailsForm';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';

interface CardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  amount: number;
  planName: string;
  isSignup?: boolean;
}

export function CardPaymentModal({ 
  isOpen, 
  onClose, 
  onPaymentSuccess, 
  amount, 
  planName,
  isSignup = false 
}: CardPaymentModalProps) {
  const { t } = useLanguage();
}