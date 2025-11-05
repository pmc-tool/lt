'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import { adminAuth } from '@/lib/admin-auth';

interface Draw {
  id: string;
  title: string;
  status: string;
  start_at: string;
  end_at: string;
  ticket_price: number;
  max_tickets: number;
  tickets_sold: number;
  winner_serial?: number;
  created_at: string;
}

export default function AdminDrawsPage() {
  const router = useRouter();
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetchDraws(token);
  }, [router, statusFilter]);

  const fetchDraws = async (token: string) => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (statusFilter) params.status = statusFilter;

      const response = await adminAPI.listDraws(params, token);
      setDraws(response.draws || response);
    } catch (err: any) {
      setError(err.message || 'Failed to load draws');
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        adminAuth.logout();
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDraw = async (drawId: string) => {
    const token = adminAuth.getToken();
    if (!token || !confirm('Close this draw and publish Merkle root?')) return;

    try {
      setActionLoading(drawId);
      await adminAPI.closeDraw(drawId, token);
      alert('Draw closed successfully. Merkle root published.');
      fetchDraws(token);
    } catch (err: any) {
      alert(`Failed to close draw: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSettleDraw = async (drawId: string) => {
    const token = adminAuth.getToken();
    if (!token || !confirm('Settle this draw and compute winner?')) return;

    try {
      setActionLoading(drawId);
      await adminAPI.settleDraw(drawId, token);
      alert('Draw settled successfully. Winner computed.');
      fetchDraws(token);
    } catch (err: any) {
      alert(`Failed to settle draw: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      STARTED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-yellow-100 text-yellow-800',
      SETTLED: 'bg-blue-100 text-blue-800',
      ROLLED_OVER: 'bg-purple-100 text-purple-800',
    };

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          statusColors[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Draw Management</h1>
          <a
            href="/admin/draws/create"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create New Draw
          </a>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm mt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-3">
            <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </a>
            <a href="/admin/draws" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
              Draws
            </a>
            <a href="/admin/cod" className="text-gray-600 hover:text-gray-900">
              COD Tasks
            </a>
            <a href="/admin/users" className="text-gray-600 hover:text-gray-900">
              Users
            </a>
            <a href="/admin/audit" className="text-gray-600 hover:text-gray-900">
              Audit Logs
            </a>
          </div>
        </div>
      </nav>

      {/* Filters */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="STARTED">Started</option>
            <option value="CLOSED">Closed</option>
            <option value="SETTLED">Settled</option>
            <option value="ROLLED_OVER">Rolled Over</option>
          </select>
        </div>

        {/* Draws Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading draws...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : draws.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">No draws found.</p>
            <a
              href="/admin/draws/create"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create First Draw
            </a>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {draws.map((draw) => (
                <li key={draw.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{draw.title}</h3>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            {new Date(draw.start_at).toLocaleDateString()} -{' '}
                            {new Date(draw.end_at).toLocaleDateString()}
                          </span>
                          <span>
                            Price: ${draw.ticket_price} | Sold: {draw.tickets_sold}/{draw.max_tickets}
                          </span>
                          {draw.winner_serial !== null && draw.winner_serial !== undefined && (
                            <span className="text-green-600 font-medium">
                              Winner: #{draw.winner_serial}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(draw.status)}

                        {draw.status === 'STARTED' && (
                          <button
                            onClick={() => handleCloseDraw(draw.id)}
                            disabled={actionLoading === draw.id}
                            className="bg-yellow-600 text-white px-3 py-1 text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
                          >
                            {actionLoading === draw.id ? 'Closing...' : 'Close'}
                          </button>
                        )}

                        {draw.status === 'CLOSED' && (
                          <button
                            onClick={() => handleSettleDraw(draw.id)}
                            disabled={actionLoading === draw.id}
                            className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === draw.id ? 'Settling...' : 'Settle'}
                          </button>
                        )}

                        <a
                          href={`/admin/draws/${draw.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View Details
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
