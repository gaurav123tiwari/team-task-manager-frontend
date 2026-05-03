import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Calendar, Search, Filter, ArrowRight } from 'lucide-react';
import { taskApi } from '../api';
import { StatusBadge, Spinner, EmptyState, Pagination } from '../components/ui';
import toast from 'react-hot-toast';

function TaskRow({ task, onStatusChange }) {
  const [statusLoading, setStatusLoading] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    try {
      const { data } = await taskApi.updateStatus(task.id, newStatus);
      onStatusChange(data);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className={`card flex flex-col sm:flex-row sm:items-center gap-4 animate-fade-in
                     ${isOverdue ? 'border-red-800/40' : ''}`}>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-gray-200 text-sm">{task.title}</h3>
          <StatusBadge status={task.status} />
          {isOverdue && <span className="badge-overdue">Overdue</span>}
        </div>

        {task.description && (
          <p className="text-gray-500 text-xs line-clamp-1">{task.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-600">
          <Link
            to={`/projects/${task.projectId}`}
            className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors"
          >
            {task.projectName} <ArrowRight size={10} />
          </Link>
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
              <Calendar size={11} />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 w-full sm:w-36">
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={statusLoading}
          className="w-full bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg px-2.5 py-2
                     focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>
    </div>
  );
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadTasks = useCallback(() => {
    setLoading(true);
    const params = { page, size: 10, status: statusFilter || undefined, search: search || undefined };
    taskApi.getMyTasks(params)
      .then(({ data }) => {
        setTasks(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const statusCounts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="text-gray-500 text-sm mt-0.5">{totalElements} task{totalElements !== 1 ? 's' : ''} assigned to you</p>
        </div>
      </div>

      {/* Status Summary Pills */}
      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'To Do', key: 'TODO', cls: 'badge-todo' },
            { label: 'In Progress', key: 'IN_PROGRESS', cls: 'badge-in-progress' },
            { label: 'Done', key: 'DONE', cls: 'badge-done' },
          ].map(({ label, key, cls }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(0); }}
              className={`${cls} cursor-pointer transition-all duration-200 ${
                statusFilter === key ? 'ring-2 ring-offset-1 ring-offset-gray-950 ring-blue-500 scale-105' : 'hover:scale-105'
              }`}
            >
              {label}: {statusCounts[key] || 0}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="input-field pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="input-field pl-9 text-sm w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description={search || statusFilter ? "Try adjusting your search or filter." : "You have no tasks assigned yet."}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onStatusChange={(updated) => setTasks(tasks.map((t) => t.id === updated.id ? updated : t))}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
