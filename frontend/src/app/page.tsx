import { drawsAPI } from '@/lib/api';
import DrawCard from '@/components/DrawCard';
import Link from 'next/link';

export default async function HomePage() {
  let draws = [];
  let error = null;

  try {
    const response = await drawsAPI.list({ status: 'STARTED', limit: 10 });
    draws = response.data || [];
  } catch (e: any) {
    error = e.message;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Provably-Fair Lottery</h1>
            <nav className="space-x-4">
              <Link href="/tickets" className="text-gray-600 hover:text-gray-900">
                My Tickets
              </Link>
              <Link href="/profile" className="text-gray-600 hover:text-gray-900">
                Profile
              </Link>
              <Link href="/verify" className="text-gray-600 hover:text-gray-900">
                Verify Results
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Active Draws</h2>
          <p className="text-gray-600">Buy tickets in 2-3 taps with Cash on Delivery</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            Error loading draws: {error}
          </div>
        )}

        {draws.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No active draws at the moment</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {draws.map((draw: any) => (
            <DrawCard key={draw.id} draw={draw} />
          ))}
        </div>
      </main>
    </div>
  );
}
