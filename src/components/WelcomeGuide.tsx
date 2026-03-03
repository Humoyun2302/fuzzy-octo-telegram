import { motion } from 'motion/react';
import { User, Scissors, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface WelcomeGuideProps {
  onClose: () => void;
}

export function WelcomeGuide({ onClose }: WelcomeGuideProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-2xl w-full"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="w-6 h-6 text-emerald-600" />
              Welcome to BarberBook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-gray-600 mb-4">
                Experience the platform from different perspectives. Choose a role below to explore:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-emerald-900">Customer View</h4>
                    <Badge variant="outline" className="text-xs">Default Demo</Badge>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ Browse and search barbers</li>
                  <li>✓ View and manage bookings</li>
                  <li>✓ Filter by price, rating, distance</li>
                  <li>✓ Cancel & reschedule appointments</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-blue-900">Barber View</h4>
                    <Badge variant="outline" className="text-xs">Switch Role</Badge>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ View daily statistics & earnings</li>
                  <li>✓ Manage today's schedule</li>
                  <li>✓ Set working hours & availability</li>
                  <li>✓ Track weekly performance</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <h4 className="mb-2 text-amber-900">💡 Demo Features</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• All data is mock data for demonstration purposes</li>
                <li>• Try the search filters with price range slider</li>
                <li>• Expand booking cards to see more details</li>
                <li>• Toggle dark mode with the button in bottom-right</li>
                <li>• Experience smooth animations throughout</li>
              </ul>
            </div>

            <Button onClick={onClose} className="w-full" size="lg">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
