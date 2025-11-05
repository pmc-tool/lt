'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ordersAPI } from '@/lib/api';
import { getClientToken } from '@/lib/auth';
import Link from 'next/link';

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = getClientToken();
    if (!authToken) {
      router.push(`/auth/login?redirect=/orders/${orderId}`);
      return;
    }
    setToken(authToken);
    loadOrder(authToken);
  }, []);

  const loadOrder = async (authToken: string) => {
    try {
      const result = await ordersAPI.get(orderId, authToken);
      setOrder(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Order not found'}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const expiresAt = new Date(order.expires_at);
  const isExpired = expiresAt < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-center text-gray-600 mb-6">
            Your tickets have been reserved. We'll collect payment via COD.
          </p>

          <div className="border-t border-b border-gray-200 py-4 my-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Order ID</p>
                <p className="font-mono font-medium">{order.id.slice(0, 13)}...</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'COLLECTED'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'PENDING' || order.status === 'ASSIGNED'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div>
                <p className="text-gray-600">Quantity</p>
                <p className="font-medium">{order.quantity} tickets</p>
              </div>
              <div>
                <p className="text-gray-600">Total Amount</p>
                <p className="font-medium text-blue-600">৳{order.total_amount}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Delivery Address</h3>
            {order.address && (
              <div className="text-sm text-gray-600">
                <p>{order.address.street}</p>
                <p>
                  {order.address.city}
                  {order.address.state ? `, ${order.address.state}` : ''} {order.address.postal_code}
                </p>
                <p>{order.address.country}</p>
                <p className="mt-2">
                  <span className="font-medium">Phone:</span> {order.address.phone}
                </p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Your Tickets</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {order.tickets?.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-center"
                >
                  <p className="text-xs text-gray-600">Ticket</p>
                  <p className="font-bold text-blue-600">#{ticket.serial}</p>
                </div>
              ))}
            </div>
          </div>

          {!isExpired && order.status === 'PENDING' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Reservation expires:</strong> {expiresAt.toLocaleString()}
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Our agent will visit your address within 6 hours to collect payment. Please keep the
                exact amount ready.
              </p>
            </div>
          )}

          {order.status === 'COLLECTED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Payment collected!</strong> Your tickets are now confirmed and entered into
                the draw.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Link
            href="/tickets"
            className="flex-1 text-center px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            View All Tickets
          </Link>
          <Link
            href="/"
            className="flex-1 text-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Buy More Tickets
          </Link>
        </div>
      </main>
    </div>
  );
}
