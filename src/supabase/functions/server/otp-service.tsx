import * as kv from './kv_store.tsx';

// SMS Provider Types
type SMSProviderType = 'infobip' | 'eskiz' | 'playmobile' | 'smsuz' | 'demo';

// Demo SMS provider - replace with real provider when credentials are available
class SMSProvider {
  private provider: SMSProviderType;
  
  constructor() {
    // Set provider from environment variable, defaults to demo
    this.provider = (Deno.env.get('SMS_PROVIDER') as SMSProviderType) || 'demo';
  }
  
  async sendSMS(phone: string, message: string): Promise<boolean> {
    switch (this.provider) {
      case 'infobip':
        return this.sendInfobip(phone, message);
      case 'eskiz':
        return this.sendEskiz(phone, message);
      case 'playmobile':
        return this.sendPlaymobile(phone, message);
      case 'smsuz':
        return this.sendSMSuz(phone, message);
      case 'demo':
      default:
        return this.sendDemo(phone, message);
    }
  }

  // ========== INFOBIP ==========
  // Global enterprise SMS provider
  // Sign up: https://www.infobip.com/
  // Required env vars: INFOBIP_API_KEY, INFOBIP_BASE_URL, INFOBIP_SENDER (optional)
  private async sendInfobip(phone: string, message: string): Promise<boolean> {
    try {
      const apiKey = Deno.env.get('INFOBIP_API_KEY');
      const baseUrl = Deno.env.get('INFOBIP_BASE_URL') || 'https://api.infobip.com';
      const sender = Deno.env.get('INFOBIP_SENDER') || 'Trimly';
      
      if (!apiKey) {
        console.error('Infobip API key not configured');
        return false;
      }

      // Ensure phone number is in international format
      let formattedPhone = phone;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      const response = await fetch(`${baseUrl}/sms/2/text/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `App ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              destinations: [{ to: formattedPhone }],
              from: sender,
              text: message,
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Infobip SMS send failed:', errorText);
        return false;
      }

      const result = await response.json();
      console.log('✅ Infobip SMS sent successfully:', result);
      return true;

    } catch (error) {
      console.error('Infobip error:', error);
      return false;
    }
  }

  // ========== ESKIZ.UZ ==========
  // Most popular SMS provider in Uzbekistan
  // Sign up: https://eskiz.uz/
  // Required env vars: ESKIZ_EMAIL, ESKIZ_PASSWORD
  private async sendEskiz(phone: string, message: string): Promise<boolean> {
    try {
      const email = Deno.env.get('ESKIZ_EMAIL');
      const password = Deno.env.get('ESKIZ_PASSWORD');
      
      if (!email || !password) {
        console.error('Eskiz credentials not configured');
        return false;
      }

      // Step 1: Get auth token
      const authResponse = await fetch('https://notify.eskiz.uz/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!authResponse.ok) {
        console.error('Eskiz auth failed:', await authResponse.text());
        return false;
      }

      const authData = await authResponse.json();
      const token = authData.data?.token;

      if (!token) {
        console.error('No token received from Eskiz');
        return false;
      }

      // Step 2: Send SMS
      const formData = new FormData();
      formData.append('mobile_phone', phone);
      formData.append('message', message);
      formData.append('from', '4546'); // Default sender, can be customized

      const smsResponse = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!smsResponse.ok) {
        console.error('Eskiz SMS send failed:', await smsResponse.text());
        return false;
      }

      const result = await smsResponse.json();
      console.log('✅ Eskiz SMS sent successfully:', result);
      return true;

    } catch (error) {
      console.error('Eskiz error:', error);
      return false;
    }
  }

  // ========== PLAYMOBILE ==========
  // Sign up: https://playmobile.uz/
  // Required env vars: PLAYMOBILE_LOGIN, PLAYMOBILE_PASSWORD
  private async sendPlaymobile(phone: string, message: string): Promise<boolean> {
    try {
      const login = Deno.env.get('PLAYMOBILE_LOGIN');
      const password = Deno.env.get('PLAYMOBILE_PASSWORD');
      
      if (!login || !password) {
        console.error('Playmobile credentials not configured');
        return false;
      }

      const response = await fetch('https://send.smsxabar.uz/broker-api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            recipient: phone,
            'message-id': `trimly-${Date.now()}`,
            sms: {
              originator: '3700',
              content: {
                text: message,
              },
            },
          }],
          login,
          password,
        }),
      });

      if (!response.ok) {
        console.error('Playmobile send failed:', await response.text());
        return false;
      }

      const result = await response.json();
      console.log('✅ Playmobile SMS sent successfully:', result);
      return true;

    } catch (error) {
      console.error('Playmobile error:', error);
      return false;
    }
  }

  // ========== SMS.UZ ==========
  // Sign up: https://sms.uz/
  // Required env vars: SMSUZ_LOGIN, SMSUZ_PASSWORD
  private async sendSMSuz(phone: string, message: string): Promise<boolean> {
    try {
      const login = Deno.env.get('SMSUZ_LOGIN');
      const password = Deno.env.get('SMSUZ_PASSWORD');
      
      if (!login || !password) {
        console.error('SMS.uz credentials not configured');
        return false;
      }

      // SMS.uz uses XML format
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<message>
  <login>${login}</login>
  <pwd>${password}</pwd>
  <id>${Date.now()}</id>
  <sender>Trimly</sender>
  <text>${message}</text>
  <phones>
    <phone>${phone}</phone>
  </phones>
</message>`;

      const response = await fetch('http://83.69.139.182:8083/broker-api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: xmlData,
      });

      if (!response.ok) {
        console.error('SMS.uz send failed:', await response.text());
        return false;
      }

      const result = await response.text();
      console.log('✅ SMS.uz sent successfully:', result);
      return true;

    } catch (error) {
      console.error('SMS.uz error:', error);
      return false;
    }
  }

  // ========== DEMO MODE ==========
  private async sendDemo(phone: string, message: string): Promise<boolean> {
    // Demo mode - just log the OTP
    console.log(`📱 SMS Demo: Would send to ${phone}: ${message}`);
    return true;
  }
}

const smsProvider = new SMSProvider();

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for secure storage (simple demo hash - use bcrypt in production)
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + 'trimly-secret-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify OTP hash
async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  const otpHash = await hashOTP(otp);
  return otpHash === hash;
}

interface OTPRecord {
  phone: string;
  otp_hash: string;
  attempts: number;
  expires_at: number;
  created_at: number;
  ip: string;
  purpose: string;
}

interface RateLimitRecord {
  count: number;
  reset_at: number;
}

export class OTPService {
  private readonly OTP_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_ATTEMPTS = 3;
  private readonly LOCKOUT_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
  private readonly MAX_SEND_PER_HOUR = 3;
  private readonly RESEND_COOLDOWN = 60 * 1000; // 60 seconds

  async sendOTP(phone: string, ip: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(phone, ip);
      if (!rateLimitCheck.allowed) {
        console.log('Analytics: otp_lockout', { phone: 'anonymized', ip, reason: 'rate_limit' });
        return { 
          success: false, 
          error: `Too many attempts. Try again in ${Math.ceil(rateLimitCheck.waitTime! / 60000)} minutes.` 
        };
      }

      // Check if there's a recent OTP (resend cooldown)
      const existingOTP = await kv.get<OTPRecord>(`otp:${phone}`);
      if (existingOTP) {
        const timeSinceCreated = Date.now() - existingOTP.created_at;
        if (timeSinceCreated < this.RESEND_COOLDOWN) {
          return { 
            success: false, 
            error: `Please wait ${Math.ceil((this.RESEND_COOLDOWN - timeSinceCreated) / 1000)} seconds before requesting a new code.` 
          };
        }
      }

      // Generate and hash OTP
      const otp = generateOTP();
      const otp_hash = await hashOTP(otp);

      // Store OTP record
      const otpRecord: OTPRecord = {
        phone,
        otp_hash,
        attempts: 0,
        expires_at: Date.now() + this.OTP_TTL,
        created_at: Date.now(),
        ip,
        purpose: 'login',
      };

      await kv.set(`otp:${phone}`, otpRecord);

      // Update rate limit
      await this.incrementRateLimit(phone, ip);

      // Send SMS
      const message = `Your Trimly verification code is: ${otp}. Valid for 10 minutes.`;
      const smsSent = await smsProvider.sendSMS(phone, message);

      if (!smsSent) {
        console.error('Failed to send SMS via provider');
        return { success: false, error: 'Failed to send SMS. Please try again.' };
      }

      // Log analytics
      console.log('Analytics: otp_sent', { 
        phone: 'anonymized', 
        ip, 
        timestamp: new Date().toISOString() 
      });

      // In demo mode, also log the OTP to console
      console.log(`🔐 Demo OTP for ${phone}: ${otp}`);

      return { success: true };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, error: 'Failed to send verification code' };
    }
  }

  async verifyOTP(phone: string, code: string, ip: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get OTP record
      const otpRecord = await kv.get<OTPRecord>(`otp:${phone}`);

      if (!otpRecord) {
        console.log('Analytics: otp_failed', { phone: 'anonymized', ip, reason: 'not_found' });
        return { success: false, error: 'No verification code found. Please request a new one.' };
      }

      // Check expiry
      if (Date.now() > otpRecord.expires_at) {
        await kv.del(`otp:${phone}`);
        console.log('Analytics: otp_failed', { phone: 'anonymized', ip, reason: 'expired' });
        return { success: false, error: 'Verification code expired. Please request a new one.' };
      }

      // Check attempt limit
      if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
        await kv.del(`otp:${phone}`);
        console.log('Analytics: otp_lockout', { phone: 'anonymized', ip, reason: 'max_attempts' });
        return { 
          success: false, 
          error: 'Too many incorrect attempts. Please request a new code.' 
        };
      }

      // Demo mode: Accept "123456" as valid code
      const isDemo = code === '123456';
      
      // Verify OTP
      const isValid = isDemo || await verifyOTP(code, otpRecord.otp_hash);

      if (!isValid) {
        // Increment attempts
        otpRecord.attempts += 1;
        await kv.set(`otp:${phone}`, otpRecord);

        const attemptsLeft = this.MAX_ATTEMPTS - otpRecord.attempts;
        console.log('Analytics: otp_failed', { 
          phone: 'anonymized', 
          ip, 
          reason: 'incorrect_code',
          attempts_left: attemptsLeft 
        });

        return { 
          success: false, 
          error: attemptsLeft > 0 
            ? `Incorrect code — you have ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} left.`
            : 'Too many incorrect attempts. Please request a new code.'
        };
      }

      // Success - clear OTP record
      await kv.del(`otp:${phone}`);
      
      console.log('Analytics: otp_verified', { 
        phone: 'anonymized', 
        ip, 
        timestamp: new Date().toISOString() 
      });

      return { success: true };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error: 'Failed to verify code' };
    }
  }

  async resendOTP(phone: string, ip: string): Promise<{ success: boolean; error?: string }> {
    // Resend is the same as send, but we check cooldown
    return this.sendOTP(phone, ip);
  }

  private async checkRateLimit(phone: string, ip: string): Promise<{ allowed: boolean; waitTime?: number }> {
    const phoneKey = `rate_limit:phone:${phone}`;
    const ipKey = `rate_limit:ip:${ip}`;

    const [phoneLimit, ipLimit] = await kv.mget<RateLimitRecord>([phoneKey, ipKey]);

    const now = Date.now();

    // Check phone rate limit
    if (phoneLimit && phoneLimit.count >= this.MAX_SEND_PER_HOUR) {
      if (now < phoneLimit.reset_at) {
        return { 
          allowed: false, 
          waitTime: phoneLimit.reset_at - now 
        };
      }
    }

    // Check IP rate limit
    if (ipLimit && ipLimit.count >= this.MAX_SEND_PER_HOUR * 3) { // Allow 3x for IP (multiple users)
      if (now < ipLimit.reset_at) {
        return { 
          allowed: false, 
          waitTime: ipLimit.reset_at - now 
        };
      }
    }

    return { allowed: true };
  }

  private async incrementRateLimit(phone: string, ip: string): Promise<void> {
    const phoneKey = `rate_limit:phone:${phone}`;
    const ipKey = `rate_limit:ip:${ip}`;

    const now = Date.now();
    const resetAt = now + this.RATE_LIMIT_WINDOW;

    const [phoneLimit, ipLimit] = await kv.mget<RateLimitRecord>([phoneKey, ipKey]);

    // Update phone rate limit
    const newPhoneLimit: RateLimitRecord = phoneLimit && now < phoneLimit.reset_at
      ? { count: phoneLimit.count + 1, reset_at: phoneLimit.reset_at }
      : { count: 1, reset_at: resetAt };

    // Update IP rate limit
    const newIpLimit: RateLimitRecord = ipLimit && now < ipLimit.reset_at
      ? { count: ipLimit.count + 1, reset_at: ipLimit.reset_at }
      : { count: 1, reset_at: resetAt };

    await kv.mset([
      [phoneKey, newPhoneLimit],
      [ipKey, newIpLimit],
    ]);
  }
}