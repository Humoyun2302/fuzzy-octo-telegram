/**
 * Subscription Service
 * Handles subscription management and visibility
 */

import { apiService } from './api.service';

export interface SubscriptionStatus {
  status: 'active' | 'inactive' | 'expired';
  plan: string;
  expiryDate: string | null;
  trialUsed: boolean;
  visibleToPublic: boolean;
  isActive: boolean;
}

export interface TrialActivationResponse {
  success: boolean;
  profile?: any;
  error?: string;
  code?: string;
}

export class SubscriptionService {
  /**
   * Start free trial for barber
   */
  async startTrial(): Promise<TrialActivationResponse> {
    try {
      console.log('🎁 Activating free trial...');
      
      const response = await apiService.post('/subscription/trial', {});
      
      if (response.success) {
        console.log('✅ Trial activated successfully');
        console.log('📊 Subscription details:', {
          status: response.profile?.subscriptionStatus,
          plan: response.profile?.subscriptionPlan,
          expiryDate: response.profile?.subscriptionExpiryDate,
          trialUsed: response.profile?.trialUsed
        });
        
        return {
          success: true,
          profile: response.profile
        };
      } else {
        console.error('❌ Trial activation failed:', response.error);
        return {
          success: false,
          error: response.error,
          code: response.code
        };
      }
    } catch (error: any) {
      console.error('❌ Trial activation exception:', error);
      return {
        success: false,
        error: error.message || 'Failed to activate trial'
      };
    }
  }

  /**
   * Upgrade subscription to paid plan
   */
  async upgradePlan(plan: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`💳 Upgrading to ${plan} plan...`);
      
      const response = await apiService.post('/subscription/upgrade', { plan });
      
      if (response.success) {
        console.log('✅ Subscription upgraded successfully');
        return { success: true };
      } else {
        console.error('❌ Subscription upgrade failed:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      console.error('❌ Subscription upgrade exception:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current subscription status
   */
  async getStatus(): Promise<SubscriptionStatus | null> {
    try {
      console.log('📊 Fetching subscription status...');
      
      const response = await apiService.get('/subscription/status');
      
      if (response.subscription) {
        console.log('✅ Subscription status:', response.subscription);
        return response.subscription;
      } else {
        console.warn('⚠️ No subscription data returned');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch subscription status:', error);
      return null;
    }
  }

  /**
   * Check if barber is visible to public
   */
  isVisibleToPublic(subscription: SubscriptionStatus): boolean {
    const {
      status,
      expiryDate,
      trialUsed,
      visibleToPublic,
      isActive
    } = subscription;

    // Must be active
    if (!isActive) {
      console.log('❌ Barber not active');
      return false;
    }

    // Check visibility flags
    const hasActiveSubscription = status === 'active';
    const hasUsedTrial = trialUsed === true;
    const isManuallyVisible = visibleToPublic === true;

    // Check expiry
    const subscriptionNotExpired = !expiryDate || new Date(expiryDate) > new Date();

    const visible = (hasActiveSubscription || hasUsedTrial || isManuallyVisible) && subscriptionNotExpired;

    console.log('👀 Visibility check:', {
      isActive,
      hasActiveSubscription,
      hasUsedTrial,
      isManuallyVisible,
      subscriptionNotExpired,
      result: visible
    });

    return visible;
  }

  /**
   * Get days remaining in subscription
   */
  getDaysRemaining(expiryDate: string | null): number {
    if (!expiryDate) return Infinity;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    return Math.max(0, days);
  }

  /**
   * Check if subscription is about to expire (within 7 days)
   */
  isExpiringSoon(expiryDate: string | null): boolean {
    const daysRemaining = this.getDaysRemaining(expiryDate);
    return daysRemaining > 0 && daysRemaining <= 7;
  }

  /**
   * Format expiry date for display
   */
  formatExpiryDate(expiryDate: string | null, locale: string = 'en'): string {
    if (!expiryDate) return 'Never';
    
    const date = new Date(expiryDate);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return date.toLocaleDateString(locale, options);
  }
}

export const subscriptionService = new SubscriptionService();
