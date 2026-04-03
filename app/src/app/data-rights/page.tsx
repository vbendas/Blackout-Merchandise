'use client';

import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

function JsonDisplay({ data, title }: { data: any; title: string }) {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-zinc-200">{title}:</h4>
      <div className="flex space-x-2 mb-2">
        <Button
          onClick={() => {
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          size="sm"
        >
          Download JSON File
        </Button>
      </div>
      <pre className="bg-zinc-900 p-4 rounded border border-zinc-800 overflow-x-auto text-sm text-zinc-300 max-h-96 whitespace-pre-wrap break-words">
        {jsonString}
      </pre>
    </div>
  );
}

interface ResultData {
  type: string;
  message: string;
  data?: any;
}

export default function DataRightsPortal() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleRequest = async (type: 'access' | 'deletion' | 'portability') => {
    if (!isLoaded) {
      setAuthError('Authentication is loading. Please wait...');
      return;
    }

    if (!userId) {
      setAuthError('You must be logged in to exercise your data rights.');
      return;
    }

    setLoading(true);
    setResult(null);
    setAuthError(null);

    try {
      const response = await fetch(`/api/data-rights/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          format: type === 'portability' ? format : undefined,
        }),
      });

      const data = await response.json();

      if (type === 'portability' && format === 'csv' && data.csvUrl) {
        // Download CSV file
        const link = document.createElement('a');
        link.href = data.csvUrl;
        link.download = `data-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setResult({
          type: 'success',
          message: 'Your data has been exported successfully. The CSV file should begin downloading automatically.',
        });
      } else {
        setResult({
          type: response.ok ? 'success' : 'error',
          message: data.message || (response.ok ? 'Request completed successfully.' : 'Request failed.'),
          data: response.ok ? data : undefined,
        });
      }
    } catch (error) {
      console.error('Data rights request failed:', error);
      setResult({
        type: 'error',
        message: 'Failed to process your request. Please try again or contact support.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletion = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account and all associated data? This action cannot be undone.'
    );
    if (confirmed) {
      await handleRequest('deletion');
    }
  };

  return (
    <main className="max-w-2xl mx-auto py-16 px-4 bg-zinc-950 text-white min-h-screen">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-zinc-50">Data Rights Portal</h1>
          <p className="text-lg text-zinc-400">
            Exercise your GDPR rights to access, delete, or export your personal data
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6">
          {/* Right to Access */}
          <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50 mb-2">Right to Access</h2>
              <p className="text-zinc-400">Request a complete copy of all personal data we hold about you.</p>
            </div>
            <Button onClick={() => handleRequest('access')} disabled={loading} className="w-full sm:w-auto">
              {loading && result?.type === 'success' ? 'Processing...' : 'Request Data Access'}
            </Button>
          </div>

          {/* Right to Deletion */}
          <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50 mb-2">Right to Erasure</h2>
              <p className="text-zinc-400">
                Request deletion of your account and all associated personal data. This action cannot be undone.
              </p>
            </div>
            <Button onClick={handleDeletion} disabled={loading} variant="destructive" className="w-full sm:w-auto">
              {loading && result?.type === 'success' ? 'Processing...' : 'Delete My Account'}
            </Button>
          </div>

          {/* Right to Portability */}
          <div className="border border-zinc-800 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50 mb-2">Right to Portability</h2>
              <p className="text-zinc-400">
                Export your data in a machine-readable format to transfer to another service.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="json"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as 'json')}
                  className="text-zinc-800 focus:ring-zinc-400"
                />
                <label htmlFor="json" className="text-zinc-300">
                  JSON
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="csv"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as 'csv')}
                  className="text-zinc-800 focus:ring-zinc-400"
                />
                <label htmlFor="csv" className="text-zinc-300">
                  CSV
                </label>
              </div>
            </div>
            <Button onClick={() => handleRequest('portability')} disabled={loading} className="w-full sm:w-auto">
              {loading && result?.type === 'success' ? 'Processing...' : 'Export My Data'}
            </Button>
          </div>
        </div>

        {/* Auth Error Display */}
        {authError && (
          <div className="border rounded-lg p-6 border-red-800 bg-red-950/20">
            <h3 className="font-semibold mb-2 text-red-400">Authentication Required</h3>
            <p className="text-zinc-300 mb-4">{authError}</p>
            <p className="text-sm text-zinc-400">
              Please log in to access the Data Rights Portal.{' '}
              <a href="/signin" className="text-zinc-100 underline hover:text-zinc-200">
                Go to Login
              </a>
            </p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div
            className={`border rounded-lg p-6 ${
              result.type === 'success' ? 'border-green-800 bg-green-950/20' : 'border-red-800 bg-red-950/20'
            }`}
          >
            <h3 className={`font-semibold mb-2 ${result.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {result.type === 'success' ? 'Success' : 'Error'}
            </h3>
            <p className="text-zinc-300 mb-4">{result.message}</p>

            {/* Display access data if available */}
            {result.data && result.type === 'success' && result.message.includes('access') && (
              <JsonDisplay data={result.data} title="Your Personal Data" />
            )}

            {/* Display portability data if JSON format */}
            {result.data && result.type === 'success' && result.message.includes('export') && format === 'json' && (
              <JsonDisplay data={result.data} title="Your Export Data" />
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="border-t border-zinc-800 pt-8">
          <div className="text-center space-y-2">
            <p className="text-zinc-400">Need help with your data rights?</p>
            <p className="text-zinc-300">
              Contact our Data Protection Officer:{' '}
              <a href="mailto:dpo@merchfrom.com" className="text-zinc-100 underline hover:text-zinc-200">
                dpo@merchfrom.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
