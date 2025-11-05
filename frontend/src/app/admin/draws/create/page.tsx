'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import { adminAuth } from '@/lib/admin-auth';

export default function CreateDrawPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    start_at: '',
    end_at: '',
    ticket_price: '',
    max_tickets: '',
    low_sales_threshold_pct: '30',
    beacon_source: 'BITCOIN',
    beacon_rule: 'NEXT_BLOCK_AFTER_CLOSE',
    terms_url: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const token = adminAuth.getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: formData.title,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
        ticket_price: parseFloat(formData.ticket_price),
        max_tickets: parseInt(formData.max_tickets),
        low_sales_threshold_pct: parseFloat(formData.low_sales_threshold_pct),
        beacon_source: formData.beacon_source,
        beacon_rule: formData.beacon_rule,
        terms_url: formData.terms_url || undefined,
      };

      await adminAPI.createDraw(payload, token);
      alert('Draw created successfully!');
      router.push('/admin/draws');
    } catch (err: any) {
      setError(err.message || 'Failed to create draw');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Create New Draw</h1>
          <a
            href="/admin/draws"
            className="text-gray-600 hover:text-gray-900"
          >
            Back to Draws
          </a>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Draw Title *
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g. Weekly Lottery - January 2025"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="start_at" className="block text-sm font-medium text-gray-700">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="start_at"
                  id="start_at"
                  required
                  value={formData.start_at}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="end_at" className="block text-sm font-medium text-gray-700">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="end_at"
                  id="end_at"
                  required
                  value={formData.end_at}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Ticket Configuration */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="ticket_price" className="block text-sm font-medium text-gray-700">
                  Ticket Price (USD) *
                </label>
                <input
                  type="number"
                  name="ticket_price"
                  id="ticket_price"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.ticket_price}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="10.00"
                />
              </div>

              <div>
                <label htmlFor="max_tickets" className="block text-sm font-medium text-gray-700">
                  Maximum Tickets *
                </label>
                <input
                  type="number"
                  name="max_tickets"
                  id="max_tickets"
                  required
                  min="1"
                  value={formData.max_tickets}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="1000"
                />
              </div>
            </div>

            {/* Low Sales Threshold */}
            <div>
              <label htmlFor="low_sales_threshold_pct" className="block text-sm font-medium text-gray-700">
                Low Sales Threshold (%) *
              </label>
              <input
                type="number"
                name="low_sales_threshold_pct"
                id="low_sales_threshold_pct"
                required
                min="0"
                max="100"
                step="0.1"
                value={formData.low_sales_threshold_pct}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                If tickets sold is below this percentage, draw may be rolled over or refunded
              </p>
            </div>

            {/* Beacon Configuration */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="beacon_source" className="block text-sm font-medium text-gray-700">
                  Beacon Source *
                </label>
                <select
                  name="beacon_source"
                  id="beacon_source"
                  required
                  value={formData.beacon_source}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="BITCOIN">Bitcoin Block Hash</option>
                  <option value="DRAND">Drand Beacon</option>
                </select>
              </div>

              <div>
                <label htmlFor="beacon_rule" className="block text-sm font-medium text-gray-700">
                  Beacon Rule *
                </label>
                <select
                  name="beacon_rule"
                  id="beacon_rule"
                  required
                  value={formData.beacon_rule}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="NEXT_BLOCK_AFTER_CLOSE">Next block after close</option>
                  <option value="BLOCK_AT_HEIGHT">Block at specific height</option>
                  <option value="DRAND_ROUND_AFTER_CLOSE">Drand round after close</option>
                </select>
              </div>
            </div>

            {/* Terms URL */}
            <div>
              <label htmlFor="terms_url" className="block text-sm font-medium text-gray-700">
                Terms & Conditions URL
              </label>
              <input
                type="url"
                name="terms_url"
                id="terms_url"
                value={formData.terms_url}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://example.com/terms"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <a
                href="/admin/draws"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Draw'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
