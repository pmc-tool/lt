'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auditAPI } from '@/lib/api';
import { adminAuth } from '@/lib/admin-auth';

interface AuditLog {
  id: string;
  actor_id: string;
  role: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  ip_address: string;
  payload_hash: string;
  created_at: string;
}

interface AuditStats {
  total_logs: number;
  by_action_type: Array<{ action_type: string; count: number }>;
  by_entity_type: Array<{ entity_type: string; count: number }>;
  by_actor: Array<{ actor_id: string; count: number }>;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetchData(token);
  }, [router, actionTypeFilter, entityTypeFilter, actorFilter]);

  const fetchData = async (token: string) => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 100 };
      if (actionTypeFilter) params.action_type = actionTypeFilter;
      if (entityTypeFilter) params.entity_type = entityTypeFilter;
      if (actorFilter) params.actor_id = actorFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const statsParams: any = {};
      if (startDate) statsParams.start_date = startDate;
      if (endDate) statsParams.end_date = endDate;

      const [logsData, statsData] = await Promise.all([
        auditAPI.list(params, token),
        auditAPI.getStats(statsParams, token),
      ]);

      setLogs(logsData.logs || logsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        adminAuth.logout();
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const token = adminAuth.getToken();
    if (!token) return;

    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await auditAPI.export(params, token);

      // Convert to CSV (simple implementation)
      const csv = [
        'ID,Actor ID,Role,Action Type,Entity Type,Entity ID,Description,IP Address,Created At',
        ...data.logs.map((log: AuditLog) =>
          [
            log.id,
            log.actor_id,
            log.role,
            log.action_type,
            log.entity_type,
            log.entity_id || '',
            `"${log.description}"`,
            log.ip_address,
            log.created_at,
          ].join(',')
        ),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Failed to export: ${err.message}`);
    }
  };

  const getActionTypeBadge = (actionType: string) => {
    const colors: Record<string, string> = {
      DRAW_CREATED: 'bg-blue-100 text-blue-800',
      DRAW_UPDATED: 'bg-indigo-100 text-indigo-800',
      DRAW_CLOSED: 'bg-yellow-100 text-yellow-800',
      DRAW_SETTLED: 'bg-green-100 text-green-800',
      USER_BANNED: 'bg-red-100 text-red-800',
      USER_UNBANNED: 'bg-green-100 text-green-800',
      USER_FLAGGED: 'bg-orange-100 text-orange-800',
      COD_ASSIGNED: 'bg-purple-100 text-purple-800',
    };

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          colors[actionType] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {actionType.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </button>
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
            <a href="/admin/users" className="text-gray-600 hover:text-gray-900">
              Users
            </a>
            <a href="/admin/audit" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
              Audit Logs
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Logs</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.total_logs.toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Top Action Types</h3>
              <ul className="space-y-1 text-sm">
                {stats.by_action_type.slice(0, 3).map((item) => (
                  <li key={item.action_type} className="flex justify-between">
                    <span className="text-gray-700">{item.action_type}</span>
                    <span className="font-semibold text-gray-900">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Top Entities</h3>
              <ul className="space-y-1 text-sm">
                {stats.by_entity_type.slice(0, 3).map((item) => (
                  <li key={item.entity_type} className="flex justify-between">
                    <span className="text-gray-700">{item.entity_type}</span>
                    <span className="font-semibold text-gray-900">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">All Actions</option>
                <option value="DRAW_CREATED">Draw Created</option>
                <option value="DRAW_UPDATED">Draw Updated</option>
                <option value="DRAW_CLOSED">Draw Closed</option>
                <option value="DRAW_SETTLED">Draw Settled</option>
                <option value="USER_BANNED">User Banned</option>
                <option value="USER_UNBANNED">User Unbanned</option>
                <option value="COD_ASSIGNED">COD Assigned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="">All Entities</option>
                <option value="DRAW">Draw</option>
                <option value="USER">User</option>
                <option value="ORDER">Order</option>
                <option value="COD_TASK">COD Task</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  const token = adminAuth.getToken();
                  if (token) fetchData(token);
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading audit logs...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">No audit logs found.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {logs.map((log) => (
                <li key={log.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getActionTypeBadge(log.action_type)}
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{log.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>Actor: {log.actor_id.substring(0, 8)}...</span>
                          <span>Role: {log.role}</span>
                          <span>Entity: {log.entity_type}</span>
                          {log.entity_id && <span>ID: {log.entity_id.substring(0, 8)}...</span>}
                          <span>IP: {log.ip_address}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {log.payload_hash.substring(0, 16)}...
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
