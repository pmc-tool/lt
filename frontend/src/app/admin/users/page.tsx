'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usersAdminAPI } from '@/lib/api';
import { adminAuth } from '@/lib/admin-auth';

interface User {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  status: string;
  language: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<'SOFT' | 'HARD'>('SOFT');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetchUsers(token);
  }, [router, statusFilter]);

  const fetchUsers = async (token: string) => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 100 };
      if (statusFilter) params.status = statusFilter;

      const response = await usersAdminAPI.listUsers(params, token);
      setUsers(response.users || response);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        adminAuth.logout();
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const token = adminAuth.getToken();
    if (!token) return;

    fetchUsers(token);
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      alert('Please enter a ban reason');
      return;
    }

    const token = adminAuth.getToken();
    if (!token) return;

    try {
      setActionLoading(true);
      await usersAdminAPI.banUser(
        selectedUser.id,
        {
          ban_type: banType,
          reason: banReason.trim(),
          duration_hours: banDuration ? parseInt(banDuration) : undefined,
        },
        token
      );
      alert('User banned successfully');
      setShowBanModal(false);
      setSelectedUser(null);
      setBanReason('');
      setBanDuration('');
      fetchUsers(token);
    } catch (err: any) {
      alert(`Failed to ban user: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    const token = adminAuth.getToken();
    if (!token || !confirm('Unban this user?')) return;

    try {
      await usersAdminAPI.unbanUser(userId, token);
      alert('User unbanned successfully');
      fetchUsers(token);
    } catch (err: any) {
      alert(`Failed to unban user: ${err.message}`);
    }
  };

  const handleFlagUser = async (userId: string) => {
    const flagType = prompt('Enter flag type (SPAM, DUPLICATE, CHARGEBACK, SUSPICIOUS):');
    if (!flagType) return;

    const reason = prompt('Enter flag reason:');
    if (!reason) return;

    const token = adminAuth.getToken();
    if (!token) return;

    try {
      await usersAdminAPI.flagUser(userId, { flag_type: flagType, reason }, token);
      alert('User flagged successfully');
      fetchUsers(token);
    } catch (err: any) {
      alert(`Failed to flag user: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      SOFT_BANNED: 'bg-yellow-100 text-yellow-800',
      HARD_BANNED: 'bg-red-100 text-red-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          statusColors[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      !searchQuery ||
      user.phone?.includes(searchQuery) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm mt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-3">
            <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </a>
            <a href="/admin/draws" className="text-gray-600 hover:text-gray-900">
              Draws
            </a>
            <a href="/admin/cod" className="text-gray-600 hover:text-gray-900">
              COD Tasks
            </a>
            <a href="/admin/users" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
              Users
            </a>
            <a href="/admin/audit" className="text-gray-600 hover:text-gray-900">
              Audit Logs
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SOFT_BANNED">Soft Banned</option>
            <option value="HARD_BANNED">Hard Banned</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <input
            type="text"
            placeholder="Search by phone, email, or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />

          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading users...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">No users found.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <li key={user.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-base font-medium text-gray-900">
                            {user.name || 'Unnamed User'}
                          </h3>
                          {getStatusBadge(user.status)}
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          {user.phone && <span>Phone: {user.phone}</span>}
                          {user.email && <span>Email: {user.email}</span>}
                          <span>Language: {user.language}</span>
                          <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <a
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View Details
                        </a>

                        {user.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowBanModal(true);
                              }}
                              className="bg-yellow-600 text-white px-3 py-1 text-sm rounded hover:bg-yellow-700"
                            >
                              Ban
                            </button>
                            <button
                              onClick={() => handleFlagUser(user.id)}
                              className="bg-orange-600 text-white px-3 py-1 text-sm rounded hover:bg-orange-700"
                            >
                              Flag
                            </button>
                          </>
                        )}

                        {(user.status === 'SOFT_BANNED' || user.status === 'HARD_BANNED') && (
                          <button
                            onClick={() => handleUnbanUser(user.id)}
                            className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                          >
                            Unban
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Ban User: {selectedUser.name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ban Type</label>
                  <select
                    value={banType}
                    onChange={(e) => setBanType(e.target.value as 'SOFT' | 'HARD')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="SOFT">SOFT (Blocks purchases only)</option>
                    <option value="HARD">HARD (Blocks login)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Required)
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter reason for ban"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (hours, optional)
                  </label>
                  <input
                    type="number"
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Leave empty for permanent"
                    min="1"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Leave empty for permanent ban. Enter hours for temporary ban.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => {
                    setShowBanModal(false);
                    setSelectedUser(null);
                    setBanReason('');
                    setBanDuration('');
                  }}
                  disabled={actionLoading}
                  className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBanUser}
                  disabled={actionLoading || !banReason.trim()}
                  className="flex-1 bg-red-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Banning...' : 'Ban User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
