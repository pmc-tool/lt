'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { codAPI } from '@/lib/api';
import { adminAuth } from '@/lib/admin-auth';

interface CODTask {
  id: string;
  order_id: string;
  agent_id?: string;
  status: string;
  visit_at?: string;
  collected_at?: string;
  fail_reason?: string;
  created_at: string;
  order?: {
    id: string;
    total_amount: number;
    user: {
      name?: string;
      phone?: string;
    };
    address: {
      street: string;
      city: string;
      postal_code: string;
      phone: string;
    };
  };
}

interface CODStats {
  total_tasks: number;
  pending: number;
  assigned: number;
  collected: number;
  failed: number;
  collection_rate_pct: string;
}

export default function AdminCODPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<CODTask[]>([]);
  const [stats, setStats] = useState<CODStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const token = adminAuth.getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }

    fetchData(token);
  }, [router, statusFilter, agentFilter]);

  const fetchData = async (token: string) => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (agentFilter) params.agent = agentFilter;

      const [tasksData, statsData] = await Promise.all([
        codAPI.listTasks(params, token),
        codAPI.getStats(token),
      ]);

      setTasks(tasksData.tasks || tasksData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load COD tasks');
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        adminAuth.logout();
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)));
    }
  };

  const handleAssign = async () => {
    if (selectedTasks.size === 0 || !agentName.trim()) {
      alert('Please select tasks and enter agent name');
      return;
    }

    const token = adminAuth.getToken();
    if (!token) return;

    try {
      setActionLoading(true);
      await codAPI.assignTasks(
        {
          task_ids: Array.from(selectedTasks),
          agent_name: agentName.trim(),
        },
        token
      );
      alert(`${selectedTasks.size} task(s) assigned successfully`);
      setShowAssignModal(false);
      setSelectedTasks(new Set());
      setAgentName('');
      fetchData(token);
    } catch (err: any) {
      alert(`Failed to assign tasks: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: string) => {
    const token = adminAuth.getToken();
    if (!token) return;

    let failReason = undefined;
    if (status.startsWith('FAILED')) {
      failReason = prompt('Enter failure reason:');
      if (!failReason) return;
    }

    try {
      await codAPI.updateTaskStatus(taskId, { status, fail_reason: failReason }, token);
      alert('Task status updated');
      fetchData(token);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      COLLECTED: 'bg-green-100 text-green-800',
      FAILED_NO_SHOW: 'bg-red-100 text-red-800',
      FAILED_ADDRESS_INVALID: 'bg-red-100 text-red-800',
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">COD Task Management</h1>
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={selectedTasks.size === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Assign Selected ({selectedTasks.size})
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
            <a href="/admin/cod" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.total_tasks}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
              <div className="text-sm text-gray-600">Assigned</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.collected}</div>
              <div className="text-sm text-gray-600">Collected</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.collection_rate_pct}%</div>
              <div className="text-sm text-gray-600">Collection Rate</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="COLLECTED">Collected</option>
            <option value="FAILED_NO_SHOW">Failed - No Show</option>
            <option value="FAILED_ADDRESS_INVALID">Failed - Invalid Address</option>
          </select>

          <input
            type="text"
            placeholder="Filter by agent"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />

          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {selectedTasks.size === tasks.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Tasks Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading COD tasks...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">No COD tasks found.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <li key={task.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => handleToggleSelect(task.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Order #{task.order_id.substring(0, 8)}... - $
                              {task.order?.total_amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {task.order?.user?.name} ({task.order?.user?.phone})
                            </p>
                            <p className="text-sm text-gray-500">
                              {task.order?.address.street}, {task.order?.address.city}{' '}
                              {task.order?.address.postal_code}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            {getStatusBadge(task.status)}
                            {task.agent_id && (
                              <span className="text-xs text-gray-500">Agent: {task.agent_id}</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {task.status === 'ASSIGNED' && (
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'COLLECTED')}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                            >
                              Mark Collected
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'FAILED_NO_SHOW')}
                              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              Mark Failed
                            </button>
                          </div>
                        )}

                        {task.fail_reason && (
                          <p className="mt-2 text-sm text-red-600">Reason: {task.fail_reason}</p>
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

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Assign Tasks to Agent
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter agent name"
                />
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Assigning {selectedTasks.size} task(s)
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  disabled={actionLoading}
                  className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={actionLoading || !agentName.trim()}
                  className="flex-1 bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
