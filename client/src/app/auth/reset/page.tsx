'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<string|null>(null);

  useEffect(() => {
    // This component is disabled - redirect to the main reset password page
    setMsg('This page is no longer available. Redirecting to the main reset password page...');
    setTimeout(() => {
      router.push('/reset-password');
    }, 2000);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#D8AC35]/20 dark:from-black dark:via-gray-900 dark:to-[#00ff41]/10 flex items-center justify-center">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Page Disabled
        </h1>
        
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300">
            This page is no longer available and has been disabled to prevent conflicts with the new authentication system.
          </p>
          
          {msg && (
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-md">
              <p className="text-blue-700 dark:text-blue-300 text-sm">{msg}</p>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <a 
              href="/reset-password" 
              className="text-sm text-[#D8AC35] dark:text-[#00ff41] hover:underline"
            >
              → Go to Reset Password
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
