import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Edit2, Trash2, Clock, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Service } from '../types';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';

interface ServicesManagerProps {
  services: Service[];
  onServicesChange: (services: Service[]) => void;
}

export function ServicesManager({ services, onServicesChange }: ServicesManagerProps) {
  const { t } = useLanguage();
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  
  const displayedServices = showAll ? services : services.slice(0, 6);
  const hasMore = services.length > 6;

  const [formData, setFormData] = useState<Omit<Service, 'id' | 'orderIndex'>>({
    name: '',
    duration: 30,
    price: 50000,
    description: ''
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const handleSaveService = () => {
    if (!formData.name.trim()) {
      toast.error(t('toast.serviceNameRequired'));
      return;
    }
    
    if (Number.isNaN(formData.duration) || formData.duration <= 0) {
      toast.error(t('toast.durationMustBePositive'));
      return;
    }
    
    if (Number.isNaN(formData.price) || formData.price <= 0) {
      toast.error(t('toast.priceMustBePositive'));
      return;
    }

    if (formData.description && formData.description.length > 150) {
      toast.error(t('toast.descriptionTooLong'));
      return;
    }

    if (editingServiceId) {
      // Update existing service
      const updatedServices = services.map(s => 
        s.id === editingServiceId 
          ? { ...s, ...formData }
          : s
      );
      onServicesChange(updatedServices);
      toast.success(t('toast.serviceUpdated'));
    } else {
      // Add new service - use a random ID to prevent collisions
      const newService: Service = {
        id: `service-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ...formData,
        orderIndex: services.length
      };
      onServicesChange([...services, newService]);
      toast.success(t('toast.serviceAdded'));
    }

    resetForm();
  };

  const handleEditService = (service: Service) => {
    setFormData({
      name: service.name,
      duration: service.duration,
      price: service.price,
      description: service.description || ''
    });
    setEditingServiceId(service.id);
    setIsAddingService(true);
    
    // Scroll to form after a brief delay to allow form to render
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteService = (serviceId: string) => {
    onServicesChange(services.filter(s => s.id !== serviceId));
    toast.success(t('toast.serviceRemoved'));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      duration: 30,
      price: 50000,
      description: ''
    });
    setIsAddingService(false);
    setEditingServiceId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-base sm:text-lg">{t('servicesManager.title')}</h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {t('servicesManager.description')}
          </p>
        </div>
      </div>

      {/* Service List */}
      {services.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {displayedServices.map((service) => (
              <motion.div 
                key={service.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group hover:shadow-md transition-all duration-200">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      {/* Service Info */}
                      <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm sm:text-base">{service.name}</h4>
                          {service.description && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Edit/Delete Buttons */}
                        <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditService(service)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteService(service.id)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Duration and Price */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Clock className="w-3 h-3" />
                          <span className="hidden xs:inline">{service.duration} min</span>
                          <span className="xs:hidden">{service.duration}m</span>
                        </Badge>
                        <Badge variant="outline" className="gap-1 text-xs">
                          <DollarSign className="w-3 h-3" />
                          <span className="truncate max-w-[120px] sm:max-w-none">{formatPrice(service.price)} UZS</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      )}

      {/* Show More/Less Button */}
      {hasMore && (
        <Button
          variant="outline"
          onClick={() => setShowAll(!showAll)}
          className="w-full gap-2"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>{t('servicesManager.showLess')}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>{t('servicesManager.showMore', { count: services.length - 6 })}</span>
            </>
          )}
        </Button>
      )}

      {/* Add Service Form */}
      <AnimatePresence>
        {isAddingService ? (
          <motion.div
            ref={formRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-2 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-sm sm:text-base">
                  {editingServiceId ? t('servicesManager.editService') : t('servicesManager.addNewService')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                {/* Service Name */}
                <div>
                  <Label htmlFor="serviceName" className="text-xs sm:text-sm">
                    {t('servicesManager.serviceName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="serviceName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('servicesManager.serviceNamePlaceholder')}
                    maxLength={50}
                    className="text-sm"
                  />
                </div>

                {/* Duration and Price */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="duration" className="text-xs sm:text-sm">
                      {t('servicesManager.duration')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      max="480"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price" className="text-xs sm:text-sm">
                      {t('servicesManager.price')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="1000"
                      max="10000000"
                      step="1000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-xs sm:text-sm">
                    {t('servicesManager.descriptionOptional')}
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('servicesManager.descriptionPlaceholder')}
                    maxLength={150}
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('servicesManager.charactersCount', { current: formData.description?.length || 0, max: 150 })}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveService}
                    className="w-full sm:flex-1 text-xs sm:text-sm"
                  >
                    {editingServiceId ? t('servicesManager.updateService') : t('servicesManager.addService')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddingService(true)}
            className="w-full gap-2 border-dashed border-2 text-xs sm:text-sm py-5 sm:py-6 rounded-[18px]"
          >
            <Plus className="w-4 h-4" />
            {t('servicesManager.addService')}
          </Button>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {services.length === 0 && !isAddingService && (
        <div className="text-center py-6 sm:py-8 px-3 sm:px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
            {t('servicesManager.emptyStateMessage')}
          </p>
          <Button
            type="button"
            onClick={() => setIsAddingService(true)}
            className="gap-2 text-xs sm:text-sm whitespace-normal h-auto"
          >
            <Plus className="w-4 h-4" />
            {t('servicesManager.addFirstService')}
          </Button>
        </div>
      )}
    </div>
  );
}