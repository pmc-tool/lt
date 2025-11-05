'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ticketsAPI } from '@/lib/api';
import { getClientToken } from '@/lib/auth';
import Link from 'next/link';

export default function TicketsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    const authToken = getClientToken();
    if (!authToken) {
      router.push('/auth/login?redirect=/tickets');
      return;
    }
    setToken(authToken);
    loadTickets(authToken);
  }, [filter]);

  const loadTickets = async (authToken: string) => {
    try {
      const params: any = { limit: 50 };
      if (filter) params.status = filter;

      const response = await ticketsAPI.list(params, authToken);
      setTickets(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by status</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All tickets</option>
            <option value="RESERVED">Reserved</option>
            <option value="PAID">Paid</option>
            <option value="ENTERED">Entered</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No tickets found</p>
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              Buy your first ticket
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tickets.map((ticket: any) => (
              <div key={ticket.id} className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-600">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Ticket Serial</p>
                    <p className="text-2xl font-bold text-gray-900">#{ticket.serial}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ticket.status === 'PAID' || ticket.status === 'ENTERED'
                        ? 'bg-green-100 text-green-800'
                        : ticket.status === 'RESERVED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Draw ID:</span> {ticket.draw_id.slice(0, 8)}...
                  </p>
                  <p>
                    <span className="font-medium">Order ID:</span> {ticket.order_id.slice(0, 8)}...
                  </p>
                  <p>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>

                {ticket.status === 'RESERVED' && (
                  <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded">
                    Waiting for COD payment collection
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
