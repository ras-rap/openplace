// pages/admin/init-db.tsx
import { useState } from 'react';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Database, Loader2 } from 'lucide-react';

export default function InitDatabase() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const initializeDatabase = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to initialize database');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <>
      <Head>
        <title>Initialize Database - OpenPlace Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Database Setup</CardTitle>
            <CardDescription>
              Initialize the OpenPlace database tables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'success' && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will create the following tables:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                <li><code>canvases</code> - Store canvas configurations</li>
                <li><code>pixels</code> - Store pixel data</li>
              </ul>
            </div>

            <Button 
              onClick={initializeDatabase} 
              disabled={status === 'loading'}
              className="w-full"
            >
              {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === 'loading' ? 'Initializing...' : 'Initialize Database'}
            </Button>

            {status === 'success' && (
              <Button variant="outline" asChild className="w-full">
                <a href="/create-canvas">Create Your First Canvas</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}