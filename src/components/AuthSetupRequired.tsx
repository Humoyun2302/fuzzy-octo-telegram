import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface AuthSetupRequiredProps {
  onRetry: () => void;
}

export function AuthSetupRequired({ onRetry }: AuthSetupRequiredProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-2 border-red-200 dark:border-red-900">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-red-600">Authentication Error</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Email authentication is not enabled. Please contact support.
            </p>
          </CardHeader>
          
          <CardContent>
            <Button
              onClick={onRetry}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}