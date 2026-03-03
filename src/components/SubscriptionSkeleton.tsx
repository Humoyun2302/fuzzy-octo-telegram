import { motion } from 'motion/react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { X } from 'lucide-react';

export function SubscriptionSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-emerald-50/30 w-full"
    >
      <div className="min-h-screen py-3 md:py-8 px-3 md:px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="text-center mb-4 md:mb-12 relative flex flex-col items-center">
            {/* Close Button Placeholder - Using actual button but disabled/invisible-ish to maintain layout */}
            <div className="absolute -top-1 md:top-0 right-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200/50" />

            {/* Icon Placeholder */}
            <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 mb-2 md:mb-6 overflow-hidden relative shadow-sm">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </div>

            {/* Title Placeholder */}
            <div className="h-6 md:h-8 w-48 bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 rounded-lg mb-3 relative overflow-hidden">
               <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </div>
            
            {/* Description Placeholder */}
            <div className="hidden md:block h-4 w-96 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-blue-100/50 rounded-lg relative overflow-hidden">
               <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </div>
          </div>

          {/* Status Card Skeleton */}
          <div className="max-w-3xl mx-auto mb-4 md:mb-8">
            <Card className="bg-white border border-emerald-100/50 shadow-sm overflow-hidden min-h-[100px] relative">
              <CardContent className="h-full flex items-center p-4 md:p-5 gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 flex-shrink-0 relative overflow-hidden">
                   <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-1/3 bg-gradient-to-r from-blue-100/80 via-purple-100/80 to-blue-100/80 rounded relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </div>
                  <div className="h-4 w-1/2 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-blue-100/50 rounded relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 mb-6 md:mb-12 px-0 md:px-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="relative overflow-hidden bg-white border border-gray-100 shadow-sm flex flex-col rounded-2xl h-[120px] md:h-[450px]">
                {/* Desktop Layout */}
                <div className="hidden md:flex flex-col h-full p-6">
                  <div className="flex flex-col items-center pb-8 border-b border-gray-50">
                    <div className="h-8 w-32 bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 rounded-lg mb-4 relative overflow-hidden">
                       <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                      />
                    </div>
                    <div className="h-16 w-full bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 rounded-lg relative overflow-hidden">
                       <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center items-center py-6">
                    <div className="h-10 w-40 bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 rounded-lg mb-3 relative overflow-hidden">
                       <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                      />
                    </div>
                    <div className="h-4 w-24 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 rounded-lg relative overflow-hidden">
                       <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                      />
                    </div>
                  </div>

                  <div className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 relative overflow-hidden mt-auto">
                     <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                    />
                  </div>
                </div>

                {/* Mobile Layout (Compact) */}
                <div className="flex md:hidden items-center justify-between p-3 gap-3 h-full">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 w-24 bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 rounded relative overflow-hidden">
                       <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                      />
                    </div>
                    <div className="h-6 w-32 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 rounded relative overflow-hidden">
                       <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                      />
                    </div>
                  </div>
                  
                  <div className="w-[110px] h-8 rounded-lg bg-gradient-to-r from-blue-100 via-purple-100 to-blue-100 relative overflow-hidden flex-shrink-0">
                     <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: "linear" }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
