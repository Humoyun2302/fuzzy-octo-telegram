import { useState, useEffect } from 'react';
import { supabase, supabaseConfig } from '../utils/supabase/client';
import { Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type ConnectionStatus = 'checking' | 'connected' | 'failed';

export function SupabaseDebugBanner() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastRequestStatus, setLastRequestStatus] = useState<'ok' | 'failed' | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Only show in dev/preview OR when debug flag is enabled
  useEffect(() => {
    // Check if running in development environment
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname.includes('127.0.0.1') ||
                  window.location.hostname.includes('figma') ||
                  window.location.hostname.includes('preview') ||
                  window.location.hostname.includes('dev') ||
                  window.location.hostname.includes('staging');
    
    // Check for manual debug flag in localStorage
    const debugFlagEnabled = localStorage.getItem('supabase_debug') === 'true';
    
    // Show if either condition is true
    const shouldShow = isDev || debugFlagEnabled;
    
    console.log('[SUPABASE DEBUG BANNER] Visibility check:', {
      hostname: window.location.hostname,
      isDev,
      debugFlagEnabled,
      shouldShow
    });
    
    setIsVisible(shouldShow);
  }, []);

  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🔍 [Debug Banner] Testing Supabase connection...');
        
        const { data, error } = await supabase.from('barbers').select('id').limit(1);
        
        if (error) {
          console.error('❌ [Debug Banner] Connection test failed:', error);
          setStatus('failed');
          setLastRequestStatus('failed');
          setLastError(error.message || 'Unknown error');
        } else {
          console.log('✅ [Debug Banner] Connection test successful');
          setStatus('connected');
          setLastRequestStatus('ok');
          setLastError(null);
        }
      } catch (e: any) {
        console.error('❌ [Debug Banner] Connection test exception:', e);
        setStatus('failed');
        setLastRequestStatus('failed');
        setLastError(e?.message || 'Connection error');
      }
    };

    if (isVisible) {
      testConnection();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const expectedProject = 'gxethvdtqpqtfibpznub';
  const isCorrectProject = supabaseConfig.projectId === expectedProject;

  return (
    <div hidden className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 max-w-sm border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4" />
        <span className="font-semibold">Supabase Debug</span>
      </div>
      
      <div className="space-y-1.5">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {status === 'checking' && <AlertCircle className="w-3 h-3 text-yellow-400" />}
          {status === 'connected' && <CheckCircle className="w-3 h-3 text-green-400" />}
          {status === 'failed' && <XCircle className="w-3 h-3 text-red-400" />}
          <span className="text-gray-300">Status:</span>
          <span className={
            status === 'connected' ? 'text-green-400 font-semibold' :
            status === 'failed' ? 'text-red-400 font-semibold' :
            'text-yellow-400'
          }>
            {status === 'checking' ? 'Checking...' : 
             status === 'connected' ? 'Connected' : 
             'Failed'}
          </span>
        </div>

        {/* Project ID */}
        <div className="flex items-center gap-2">
          <span className="text-gray-300">Project:</span>
          <span className={`font-mono text-[11px] ${isCorrectProject ? 'text-blue-400' : 'text-red-400'}`}>
            {supabaseConfig.projectId}
          </span>
          {isCorrectProject ? (
            <CheckCircle className="w-3 h-3 text-green-400" />
          ) : (
            <XCircle className="w-3 h-3 text-red-400" />
          )}
        </div>

        {/* Expected Project Validation */}
        {!isCorrectProject && (
          <div className="bg-red-900/30 border border-red-700 rounded px-2 py-1">
            <div className="flex items-center gap-2">
              <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
              <div className="text-[10px]">
                <div className="text-red-300 font-semibold">Wrong Project!</div>
                <div className="text-gray-400">Expected: {expectedProject}</div>
              </div>
            </div>
          </div>
        )}

        {/* Full URL */}
        <div className="flex items-start gap-2">
          <span className="text-gray-300 flex-shrink-0">URL:</span>
          <span className="text-gray-400 font-mono text-[10px] break-all">
            {supabaseConfig.url}
          </span>
        </div>

        {/* Last Request Status */}
        {lastRequestStatus && (
          <div className="flex items-center gap-2">
            <span className="text-gray-300">Last Request:</span>
            <span className={lastRequestStatus === 'ok' ? 'text-green-400' : 'text-red-400'}>
              {lastRequestStatus === 'ok' ? '✓ OK' : '✗ Failed'}
            </span>
          </div>
        )}

        {/* Error Message */}
        {lastError && (
          <div className="bg-red-900/20 border border-red-800 rounded px-2 py-1 mt-1">
            <div className="text-[10px] text-red-300 break-words">
              {lastError}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 text-[10px] transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}