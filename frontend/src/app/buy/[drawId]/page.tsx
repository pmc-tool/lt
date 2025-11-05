'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { drawsAPI, ordersAPI, usersAPI } from '@/lib/api';
import { getClientToken } from '@/lib/auth';
import Link from 'next/link';

export default function BuyTicketPage() {
  const params = useParams();
  const router = useRouter();
  const drawId = params.drawId as string;

  const [token, setToken] = useState<string | null>(null);
  const [draw, setDraw] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = getClientToken();
    if (!authToken) {
      router.push(`/auth/login?redirect=/buy/${drawId}`);
      return;
    }
    setToken(authToken);
    loadData(authToken);
  }, []);

  const loadData = async (authToken: string) => {
    try {
      const [drawRes, addressesRes] = await Promise.all([
        drawsAPI.get(drawId),
        usersAPI.getAddresses(authToken),
      ]);

      setDraw(drawRes);
      setAddresses(addressesRes);

      // Auto-select default address
      const defaultAddr = addressesRes.find((a: any) => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError('');
    setSubmitting(true);

    try {
      const result = await ordersAPI.create(
        {
          draw_id: drawId,
          quantity,
          address_id: selectedAddressId,
        },
        token
      );

      // Redirect to order confirmation
      router.push(`/orders/${result.order.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!draw) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Draw not found</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount = draw.ticket_price * quantity;
  const maxQuantity = Math.min(10, draw.tickets_remaining || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to draws
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{draw.title}</h1>
          <p className="text-gray-600 mb-4">Quick Buy - 2-3 Taps</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Ticket Price:</span>
              <span className="ml-2 font-semibold">৳{draw.ticket_price}</span>
            </div>
            <div>
              <span className="text-gray-600">Available:</span>
              <span className="ml-2 font-semibold">{draw.tickets_remaining}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleBuy} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity (1-10 tickets)
            </label>
            <input
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={submitting}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Address (COD)
            </label>
            {addresses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3">No addresses found</p>
                <Link
                  href="/profile/addresses/new"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Add an address
                </Link>
              </div>
            ) : (
              <select
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={submitting}
              >
                <option value="">Select an address</option>
                {addresses.map((addr: any) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label ? `${addr.label} - ` : ''}
                    {addr.street}, {addr.city}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount:</span>
              <span className="text-blue-600">৳{totalAmount}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Cash on Delivery - Pay when we collect</p>
          </div>

          <button
            type="submit"
            disabled={submitting || addresses.length === 0 || !selectedAddressId}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Placing Order...' : 'Place Order (COD)'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Reservation valid for 6 hours. We'll collect payment within this time.
          </p>
        </form>
      </main>
    </div>
  );
}
