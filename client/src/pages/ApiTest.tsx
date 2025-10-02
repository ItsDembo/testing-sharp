import React, { useState } from 'react';
import { sportsApi } from '@/services/sportsApi';

export default function ApiTest() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    setTestResults(null);

    try {
      console.log('🧪 Starting API test...');
      
      // Test 1: Basic games endpoint
      console.log('📊 Test 1: Getting all games...');
      const allGames = await sportsApi.getGames();
      console.log('✅ All games result:', allGames);
      
      // Test 2: Live games
      console.log('🔥 Test 2: Getting live games...');
      const liveGames = await sportsApi.getLiveGames();
      console.log('✅ Live games result:', liveGames);
      
      // Test 3: Upcoming games
      console.log('⏰ Test 3: Getting upcoming games...');
      const upcomingGames = await sportsApi.getUpcomingGames();
      console.log('✅ Upcoming games result:', upcomingGames);
      
      // Test 4: NBA games specifically
      console.log('🏀 Test 4: Getting NBA games...');
      const nbaGames = await sportsApi.getGames('nba');
      console.log('✅ NBA games result:', nbaGames);
      
      setTestResults({
        allGames: allGames,
        liveGames: liveGames,
        upcomingGames: upcomingGames,
        nbaGames: nbaGames,
        timestamp: new Date().toISOString()
      });
      
    } catch (err: any) {
      console.error('❌ API test failed:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testDirectFetch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = 'https://sharpshot.api.areyouwatchingthis.com/api/games.json?apiKey=3e8b23fdd1b6030714b9320484d7367b&_t=' + Date.now();
      console.log('🌐 Testing direct fetch to:', url);
      
      const response = await fetch(url);
      console.log('📡 Direct fetch response status:', response.status);
      console.log('📡 Direct fetch response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Direct fetch failed: ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Direct fetch successful:', data);
      
      setTestResults({
        directFetch: data,
        timestamp: new Date().toISOString()
      });
      
    } catch (err: any) {
      console.error('❌ Direct fetch failed:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Integration Test</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={testApi}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Sports API Service'}
          </button>
          
          <button
            onClick={testDirectFetch}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 ml-4"
          >
            {loading ? 'Testing...' : 'Test Direct API Fetch'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {testResults && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-4">
              {testResults.allGames && (
                <div>
                  <h3 className="font-medium">All Games ({testResults.allGames.length})</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(testResults.allGames, null, 2)}
                  </pre>
                </div>
              )}
              
              {testResults.directFetch && (
                <div>
                  <h3 className="font-medium">Direct Fetch Result</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(testResults.directFetch, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                Test completed at: {testResults.timestamp}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-8 bg-blue-50 p-4 rounded">
          <h3 className="font-medium mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Test Sports API Service" to test our API wrapper</li>
            <li>Click "Test Direct API Fetch" to test the API directly</li>
            <li>Check the browser console for detailed logs</li>
            <li>Look at the results below to see what data we're getting</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
