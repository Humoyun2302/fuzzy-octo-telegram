import { useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from './utils/supabase/info.tsx';

export default function AdminSync() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('[ADMIN SYNC] Calling sync endpoint...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-166b98fa/admin/sync-slot-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [ADMIN SYNC] Error:', data);
        toast.error(`Sync failed: ${data.error || 'Unknown error'}`);
        setResult({ error: data });
        return;
      }

      console.log('✅ [ADMIN SYNC] Success:', data);
      toast.success('Database sync completed successfully!');
      setResult(data);
    } catch (e: any) {
      console.error('❌ [ADMIN SYNC] Exception:', e);
      toast.error(`Sync failed: ${e.message}`);
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Admin: Database Sync Tool</CardTitle>
            <CardDescription>
              Sync the <code>is_booked</code> column with the <code>status</code> column in the barber_slots table
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What this does:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Sets <code>is_booked = true</code> for all slots with <code>status = 'booked'</code></li>
                <li>Sets <code>is_booked = false</code> for all slots with <code>status = 'available'</code></li>
                <li>This is a one-time fix to sync old database rows</li>
              </ul>
            </div>

            <Button 
              onClick={runSync} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Syncing...' : 'Run Database Sync'}
            </Button>

            {result && (
              <div className={`rounded-lg p-4 ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <h3 className={`font-semibold mb-2 ${result.error ? 'text-red-900' : 'text-green-900'}`}>
                  {result.error ? '❌ Error' : '✅ Success'}
                </h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}

            {result && !result.error && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Summary:</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>Total slots: <strong>{result.total_slots}</strong></li>
                  <li>Slots updated: <strong>{result.updated}</strong></li>
                  <li>Booked slots updated: <strong>{result.booked_slots_updated}</strong></li>
                  <li>Available slots updated: <strong>{result.available_slots_updated}</strong></li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
