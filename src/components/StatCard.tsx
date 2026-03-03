import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
}

export function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    emerald: {
      background: 'bg-gradient-to-br from-emerald-50/40 to-emerald-100/30',
      border: 'border-emerald-200/30',
      icon: 'text-emerald-500/70',
      glow: 'shadow-emerald-200/50'
    },
    blue: {
      background: 'bg-gradient-to-br from-blue-50/40 to-blue-100/30',
      border: 'border-blue-200/30',
      icon: 'text-blue-500/70',
      glow: 'shadow-blue-200/50'
    },
    amber: {
      background: 'bg-gradient-to-br from-amber-50/40 to-amber-100/30',
      border: 'border-amber-200/30',
      icon: 'text-amber-500/70',
      glow: 'shadow-amber-200/50'
    },
    purple: {
      background: 'bg-gradient-to-br from-purple-50/40 to-purple-100/30',
      border: 'border-purple-200/30',
      icon: 'text-purple-500/70',
      glow: 'shadow-purple-200/50'
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
        <CardContent className="p-6 rounded-[20px]">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">{title}</p>
              <h2 className="mb-1">{value}</h2>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative"
            >
              {/* Liquid glass container */}
              <div className={`
                relative p-4 rounded-[20px]
                ${colorClasses[color].background}
                ${colorClasses[color].border}
                border backdrop-blur-xl
                shadow-lg ${colorClasses[color].glow}
                overflow-hidden
              `}>
                {/* Soft inner glow reflection */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-[20px] pointer-events-none" />
                
                {/* Subtle bottom reflection */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/20 to-transparent rounded-b-[20px] pointer-events-none" />
                
                {/* Icon */}
                <Icon className={`w-5 h-5 relative z-10 ${colorClasses[color].icon} drop-shadow-sm`} />
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}