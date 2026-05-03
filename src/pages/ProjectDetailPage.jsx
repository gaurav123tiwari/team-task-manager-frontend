import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Users, UserMinus, Search,
  CheckSquare, Calendar, Trash2, Edit2, Filter
} from 'lucide-react';
import { projectApi, taskApi, authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import {
  Spinner, EmptyState, StatusBadge, RoleBadge,
  ConfirmDialog, Pagination
} from '../components/ui';
import toast from 'react-hot-toast';

/* ─── Task Form Modal ─────────────────────────────────────────────── */
function TaskFormModal({ isOpen, onClose, projectId, editTask, onSaved, members }) {
  const isEdit = Boolean(editTask);
  const [form, setForm] = useState({
    title: '', description: '', status: 'TODO',
    dueDate: '', assignedToId: '', projectId,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editTask) {
      setForm({
        title: editTask.title || '',
        description: editTask.description || '',
        status: editTask.status || 'TODO',
        dueDate: editTask.dueDate || '',
        assignedToId: editTask.assignedTo?.id || '',
        projectId,
      });
    } else {
      setForm({ title: '', description: '', status: 'TODO', dueDate: '', assignedToId: '', projectId });
    }
  }, [editTask, projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Task title is required');
    setLoading(true);
    try {
      const payload = {
        ...form,
        assignedToId: form.assignedToId || null,
        dueDate: form.dueDate || null,
      };
      let data;
      if (isEdit) {
        ({ data } = await taskApi.update(editTask.id, payload));
        toast.success('Task updated!');
      } else {
        ({ data } = await taskApi.create(payload));
        toast.success('Task created!');
      }
      onSaved(data, isEdit);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Task' : 'Create Task'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field"
            placeholder="Task title"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field resize-none"
            rows={3}
            placeholder="Task description..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="input-field"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
        <div>
          <label className="label">Assign To</label>
          <select
            value={form.assignedToId}
            onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
            className="input-field"
          >
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Spinner size="sm" /> : <Plus size={16} />}
            {isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Add Member Modal ─────────────────────────────────────────────── */
function AddMemberModal({ isOpen, onClose, projectId, existingMembers, onAdded }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      authApi.getUsers().then(({ data }) => {
        const existingIds = new Set(existingMembers.map((m) => m.id));
        setUsers(data.filter((u) => !existingIds.has(u.id)));
      });
    }
  }, [isOpen, existingMembers]);

  const handleAdd = async () => {
    if (!selected) return toast.error('Please select a user');
    setLoading(true);
    try {
      const { data } = await projectApi.addMember(projectId, Number(selected));
      toast.success('Member added!');
      onAdded(data);
      onClose();
      setSelected('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team Member">
      <div className="space-y-4">
        <div>
          <label className="label">Select User</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="input-field"
          >
            <option value="">— Choose a user —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.role}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleAdd} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Spinner size="sm" /> : <Plus size={16} />}
            Add Member
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Task Card ────────────────────────────────────────────────────── */
function TaskCard({ task, isAdmin, onEdit, onDelete, onStatusChange }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await taskApi.delete(task.id);
      toast.success('Task deleted');
      onDelete(task.id);
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

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

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <>
      <div className={`card flex flex-col gap-3 animate-fade-in ${isOverdue ? 'border-red-800/50' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-gray-200 text-sm leading-snug flex-1">{task.title}</h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(task)}
                  className="text-gray-500 hover:text-blue-400 p-1 rounded hover:bg-blue-900/20 transition-all"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-900/20 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-gray-500 text-xs line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          {isOverdue && <span className="badge-overdue">Overdue</span>}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1">
            {task.assignedTo ? (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                  {task.assignedTo.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-gray-500">{task.assignedTo.name}</span>
              </div>
            ) : (
              <span className="text-gray-600">Unassigned</span>
            )}
          </div>
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
              <Calendar size={10} />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Quick status change */}
        <div className="pt-1 border-t border-gray-800">
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusLoading}
            className="w-full bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg px-2.5 py-1.5
                       focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="TODO">→ To Do</option>
            <option value="IN_PROGRESS">→ In Progress</option>
            <option value="DONE">→ Done</option>
          </select>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Delete "${task.title}"?`}
        loading={deleting}
      />
    </>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const loadProject = useCallback(() => {
    projectApi.getById(projectId).then(({ data }) => setProject(data)).catch(console.error);
  }, [projectId]);

  const loadTasks = useCallback(() => {
    const params = { page, size: 9, status: statusFilter || undefined, search: search || undefined };
    taskApi.getByProject(projectId, params)
      .then(({ data }) => {
        setTasks(data.content);
        setTotalPages(data.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, page, statusFilter, search]);

  useEffect(() => { loadProject(); }, [loadProject]);
  useEffect(() => { setLoading(true); loadTasks(); }, [loadTasks]);

  const handleRemoveMember = async (userId) => {
    try {
      const { data } = await projectApi.removeMember(projectId, userId);
      setProject(data);
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleTaskSaved = (task, isEdit) => {
    if (isEdit) setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    else { setTasks((prev) => [task, ...prev]); loadProject(); }
  };

  if (!project) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/projects" className="hover:text-gray-300 flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Projects
        </Link>
        <span>/</span>
        <span className="text-gray-300 font-medium">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{project.name}</h1>
            <p className="text-gray-500 text-sm mt-1 max-w-xl">{project.description || 'No description.'}</p>
          </div>
          {isAdmin() && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setMemberModalOpen(true)} className="btn-secondary flex items-center gap-2 text-sm">
                <Users size={15} /> Add Member
              </button>
              <button
                onClick={() => { setEditTask(null); setTaskModalOpen(true); }}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={15} /> New Task
              </button>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Team Members</p>
          <div className="flex flex-wrap gap-2">
            {project.members?.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5"
              >
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                  {m.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-gray-300">{m.name}</span>
                <RoleBadge role={m.role} />
                {isAdmin() && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-gray-600 hover:text-red-400 ml-1 transition-colors"
                  >
                    <UserMinus size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Filters */}
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
            className="input-field pl-9 pr-8 text-sm w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description={search || statusFilter ? "Try adjusting your filters." : "Create the first task for this project."}
          action={isAdmin() && !search && !statusFilter && (
            <button
              onClick={() => { setEditTask(null); setTaskModalOpen(true); }}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus size={16} /> Create Task
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin()}
              onEdit={(t) => { setEditTask(t); setTaskModalOpen(true); }}
              onDelete={(id) => setTasks(tasks.filter((t) => t.id !== id))}
              onStatusChange={(updated) => setTasks(tasks.map((t) => t.id === updated.id ? updated : t))}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <TaskFormModal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditTask(null); }}
        projectId={Number(projectId)}
        editTask={editTask}
        onSaved={handleTaskSaved}
        members={project.members || []}
      />

      <AddMemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        projectId={Number(projectId)}
        existingMembers={project.members || []}
        onAdded={(updated) => setProject(updated)}
      />
    </div>
  );
}
