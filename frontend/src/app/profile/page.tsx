'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI } from '@/lib/api';
import { getClientToken, clearClientToken } from '@/lib/auth';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = getClientToken();
    if (!authToken) {
      router.push('/auth/login?redirect=/profile');
      return;
    }
    setToken(authToken);
    loadProfile(authToken);
  }, []);

  const loadProfile = async (authToken: string) => {
    try {
      const [userRes, addressesRes] = await Promise.all([
        usersAPI.getProfile(authToken),
        usersAPI.getAddresses(authToken),
      ]);
      setUser(userRes);
      setAddresses(addressesRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearClientToken();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>

            {user && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{user.name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{user.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{user.email || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Language</p>
                  <p className="font-medium text-gray-900">{user.language === 'EN' ? 'English' : 'বাংলা'}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="mt-6 w-full px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Delivery Addresses</h2>
              <Link
                href="/profile/addresses/new"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add New
              </Link>
            </div>

            {addresses.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No addresses saved</p>
            ) : (
              <div className="space-y-4">
                {addresses.map((addr: any) => (
                  <div
                    key={addr.id}
                    className={`border rounded-lg p-4 ${
                      addr.is_default ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    {addr.label && (
                      <p className="font-medium text-gray-900 mb-1">
                        {addr.label}
                        {addr.is_default && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">{addr.street}</p>
                    <p className="text-sm text-gray-600">
                      {addr.city}
                      {addr.state ? `, ${addr.state}` : ''} {addr.postal_code}
                    </p>
                    <p className="text-sm text-gray-600">{addr.country}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Phone:</span> {addr.phone}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
