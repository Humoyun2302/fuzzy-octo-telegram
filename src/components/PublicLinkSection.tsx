import { useState } from 'react';
import { motion } from 'motion/react';
import { Link2, Copy, Check, Edit2, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';

interface PublicLinkSectionProps {
  barberId: string;
  currentUsername?: string;
  onUsernameUpdate?: (newUsername: string) => void;
}

export function PublicLinkSection({ barberId, currentUsername, onUsernameUpdate }: PublicLinkSectionProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUsername || '');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const publicUrl = currentUsername 
    ? `${window.location.origin}/b/${currentUsername}`
    : `${window.location.origin}?barber=${barberId}`;

  const handleCopyLink = async () => {
    // Helper function for fallback copy method
    const fallbackCopy = (text: string): boolean => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        console.error('Fallback copy failed:', err);
        return false;
      }
    };

    try {
      // Check if Clipboard API is available and usable
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(publicUrl);
          setCopied(true);
          toast.success(t('toast.profileLinkCopied') || 'Link copied!');
          setTimeout(() => setCopied(false), 2000);
          return;
        } catch (clipboardError) {
          console.log('Clipboard API blocked, using fallback method');
          // Fall through to fallback method
        }
      }
      
      // Use fallback method
      const success = fallbackCopy(publicUrl);
      if (success) {
        setCopied(true);
        toast.success(t('toast.profileLinkCopied') || 'Link copied!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Fallback copy failed');
      }
    } catch (err) {
      console.error('All copy methods failed:', err);
      // Show URL in prompt as last resort
      const userCopied = prompt('Copy this link:', publicUrl);
      if (userCopied !== null) {
        toast.success(t('toast.profileLinkCopied') || 'Link copied!');
      }
    }
  };

  const validateUsername = (username: string): string | null => {
    if (!username || username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 30) {
      return 'Username must be less than 30 characters';
    }
    if (!/^[a-z0-9-]+$/.test(username)) {
      return 'Username can only contain lowercase letters, numbers, and hyphens';
    }
    if (username.startsWith('-') || username.endsWith('-')) {
      return 'Username cannot start or end with a hyphen';
    }
    if (username.includes('--')) {
      return 'Username cannot contain consecutive hyphens';
    }
    return null;
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username === currentUsername) {
      setIsAvailable(true);
      setError('');
      return;
    }

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      setIsAvailable(false);
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const sessionToken = localStorage.getItem('trimly_session_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber/username/check/${username}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': sessionToken || '',
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.available) {
        setIsAvailable(true);
        setError('');
      } else {
        setIsAvailable(false);
        setError(data.error || 'Username is already taken');
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setError('Failed to check username availability');
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const lowercase = value.toLowerCase();
    setNewUsername(lowercase);
    setIsAvailable(null);
    setError('');
  };

  const handleUsernameBlur = () => {
    if (newUsername && newUsername !== currentUsername) {
      checkUsernameAvailability(newUsername);
    }
  };

  const handleSaveUsername = async () => {
    if (!newUsername || newUsername === currentUsername) {
      setIsEditing(false);
      return;
    }

    const validationError = validateUsername(newUsername);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isAvailable === false) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const sessionToken = localStorage.getItem('trimly_session_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/barber/username/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Session-Token': sessionToken || '',
          },
          body: JSON.stringify({ username: newUsername }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update username');
      }

      toast.success('Username updated successfully!');
      setIsEditing(false);
      
      // Notify parent component
      if (onUsernameUpdate) {
        onUsernameUpdate(newUsername);
      }
    } catch (err: any) {
      console.error('Error updating username:', err);
      setError(err.message || 'Failed to update username');
      toast.error(err.message || 'Failed to update username');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewUsername(currentUsername || '');
    setError('');
    setIsAvailable(null);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('barber.publicProfileLink') || 'Public Profile Link'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('barber.publicProfileLinkDesc') || 'Share this link with your clients'}
          </p>
        </div>
      </div>

      {!isEditing ? (
        <div className="space-y-3">
          {/* Display current link */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <code className="flex-1 text-sm font-mono text-blue-600 dark:text-blue-400 truncate">
              {publicUrl}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyLink}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Edit username button */}
          {currentUsername && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="w-full gap-2"
            >
              <Edit2 className="w-4 h-4" />
              {t('barber.editUsername') || 'Edit Username'}
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Username input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('barber.username') || 'Username'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                  {window.location.origin}/b/
                </span>
              </div>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => handleUsernameChange(e.target.value)}
                onBlur={handleUsernameBlur}
                placeholder="your-username"
                className="w-full pl-[180px] pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving || isChecking}
              />
            </div>

            {/* Availability indicator */}
            {newUsername && newUsername !== currentUsername && !isChecking && (
              <div className="mt-2 flex items-center gap-2">
                {isAvailable === true && (
                  <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    <span>Username available</span>
                  </div>
                )}
                {isAvailable === false && (
                  <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    <X className="w-4 h-4" />
                    <span>{error || 'Username not available'}</span>
                  </div>
                )}
              </div>
            )}

            {isChecking && (
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Checking availability...
              </div>
            )}
          </div>

          {/* Error message */}
          {error && !isChecking && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveUsername}
              disabled={isSaving || isChecking || isAvailable === false || !newUsername}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {isSaving ? 'Saving...' : 'Save Username'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

          {/* Guidelines */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
              Username guidelines:
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 list-disc list-inside">
              <li>3-30 characters</li>
              <li>Lowercase letters, numbers, and hyphens only</li>
              <li>Cannot start or end with a hyphen</li>
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}