'use client';

import { useState } from 'react';
import { fairnessAPI, drawsAPI } from '@/lib/api';
import { computeWinner } from '@/lib/crypto';
import Link from 'next/link';

export default function VerifyPage() {
  const [drawId, setDrawId] = useState('');
  const [draws, setDraws] = useState<any[]>([]);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [serverResult, setServerResult] = useState<any>(null);
  const [clientResult, setClientResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState('');

  const loadSettledDraws = async () => {
    try {
      const response = await drawsAPI.list({ status: 'settled', limit: 20 });
      setDraws(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load draws');
    }
  };

  const handleVerify = async () => {
    if (!drawId) {
      setError('Please enter a draw ID');
      return;
    }

    setError('');
    setLoading(true);
    setVerificationData(null);
    setServerResult(null);
    setClientResult(null);

    try {
      const data = await fairnessAPI.getVerificationData(drawId);
      setVerificationData(data);

      if (!data.can_verify) {
        setError('This draw cannot be verified yet (not settled or missing data)');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch verification data');
    } finally {
      setLoading(false);
    }
  };

  const handleServerCompute = async () => {
    if (!drawId) return;

    setComputing(true);
    setError('');

    try {
      const result = await fairnessAPI.verifyDrawResult(drawId);
      setServerResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute server verification');
    } finally {
      setComputing(false);
    }
  };

  const handleClientCompute = async () => {
    if (!verificationData) return;

    setComputing(true);
    setError('');

    try {
      const { hash, winnerIndex } = await computeWinner(
        verificationData.beacon_value,
        verificationData.merkle_root,
        verificationData.total_tickets
      );

      setClientResult({
        computed_hash: hash,
        computed_winner_index: winnerIndex,
        expected_winner_serial: verificationData.winner_serial,
      });
    } catch (err: any) {
      setError('Failed to compute client verification: ' + err.message);
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Verify Draw Results</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Provably-Fair Verification</h2>
          <p className="text-gray-600 mb-6">
            Verify any draw result independently using public data. The winner is computed
            deterministically using a public randomness beacon and the Merkle root of all tickets.
          </p>

          <div className="mb-4">
            <button
              onClick={loadSettledDraws}
              className="text-sm text-blue-600 hover:text-blue-700 mb-2"
            >
              Load settled draws
            </button>
            {draws.length > 0 && (
              <select
                onChange={(e) => setDrawId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              >
                <option value="">Select a draw</option>
                {draws.map((draw) => (
                  <option key={draw.id} value={draw.id}>
                    {draw.title} - {draw.status}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter Draw ID"
              value={drawId}
              onChange={(e) => setDrawId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleVerify}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Verify'}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {verificationData && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Data</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Draw Title</p>
                  <p className="font-medium text-gray-900">{verificationData.draw_title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    {verificationData.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Tickets (Paid)</p>
                  <p className="font-medium text-gray-900">{verificationData.total_tickets}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Winner Serial</p>
                  <p className="font-medium text-blue-600">#{verificationData.winner_serial || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Beacon Value ({verificationData.beacon_source})</p>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="font-mono text-sm text-gray-900 break-all">
                      {verificationData.beacon_value || 'Not available'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Merkle Root</p>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="font-mono text-sm text-gray-900 break-all">
                      {verificationData.merkle_root || 'Not available'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Verification Formula</p>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <code className="text-sm text-blue-900">{verificationData.verification_formula}</code>
                  </div>
                </div>
              </div>

              {verificationData.can_verify && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleServerCompute}
                    disabled={computing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Server-Side Verification
                  </button>
                  <button
                    onClick={handleClientCompute}
                    disabled={computing}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Client-Side Verification
                  </button>
                </div>
              )}
            </div>

            {serverResult && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Server-Side Verification Result
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Computed Hash (SHA256)</p>
                    <p className="font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded break-all">
                      {serverResult.computed_hash}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Computed Winner Index</p>
                      <p className="font-medium text-gray-900">{serverResult.computed_winner_index}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Expected Winner Serial</p>
                      <p className="font-medium text-gray-900">#{serverResult.expected_winner_serial}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Actual Winner Serial</p>
                    <p className="font-medium text-gray-900">#{serverResult.actual_winner_serial}</p>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 ${
                      serverResult.matches
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <p
                      className={`font-semibold ${
                        serverResult.matches ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {serverResult.matches ? '✓ Verification PASSED' : '✗ Verification FAILED'}
                    </p>
                    <p className={`text-sm ${serverResult.matches ? 'text-green-700' : 'text-red-700'}`}>
                      {serverResult.matches
                        ? 'The computed winner matches the declared winner. The draw is provably fair.'
                        : 'The computed winner does NOT match the declared winner. Please report this issue.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {clientResult && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Client-Side Verification Result (Computed in Your Browser)
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Computed Hash (SHA256)</p>
                    <p className="font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded break-all">
                      {clientResult.computed_hash}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Computed Winner Index</p>
                      <p className="font-medium text-gray-900">{clientResult.computed_winner_index}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Expected Winner Serial</p>
                      <p className="font-medium text-gray-900">#{clientResult.expected_winner_serial}</p>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 ${
                      serverResult && clientResult.computed_hash === serverResult.computed_hash
                        ? 'bg-purple-50 border-purple-500'
                        : 'bg-yellow-50 border-yellow-500'
                    }`}
                  >
                    <p className="font-semibold text-purple-800">
                      ✓ Client-side computation complete
                    </p>
                    <p className="text-sm text-purple-700">
                      {serverResult && clientResult.computed_hash === serverResult.computed_hash
                        ? 'Your browser computed the same result as the server. The draw is independently verifiable.'
                        : 'Computation complete. You can verify this matches the server result above.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {verificationData.fairness_events && verificationData.fairness_events.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fairness Events Log</h3>
                <div className="space-y-2">
                  {verificationData.fairness_events.map((event: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50">
                      <p className="font-medium text-gray-900">{event.event_type}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
