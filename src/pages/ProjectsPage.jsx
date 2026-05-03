import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Users, CheckSquare, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { projectApi, authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { Spinner, EmptyState, ConfirmDialog } from '../components/ui';
import toast from 'react-hot-toast';

function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name is required');
    setLoading(true);
    try {
      const { data } = await projectApi.create(form);
      toast.success('Project created!');
      onCreated(data);
      onClose();
      setForm({ name: '', description: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Project Name *</label>
          <input
            id="project-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
            placeholder="e.g. Website Redesign"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            id="project-desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field resize-none"
            rows={3}
            placeholder="Brief description of the project..."
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Spinner size="sm" /> : <Plus size={16} />}
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectCard({ project, isAdmin, onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectApi.delete(project.id);
      toast.success('Project deleted');
      onDelete(project.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="card-hover flex flex-col gap-4 animate-fade-in">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <FolderKanban size={18} className="text-white" />
          </div>
          {isAdmin && (
            <button
              onClick={(e) => { e.preventDefault(); setConfirmOpen(true); }}
              className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-900/20 transition-all duration-200"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-gray-100 text-base mb-1 line-clamp-1">{project.name}</h3>
          <p className="text-gray-500 text-sm line-clamp-2 min-h-[2.5rem]">
            {project.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {project.members?.length || 0} members
          </span>
          <span className="flex items-center gap-1">
            <CheckSquare size={12} />
            {project.taskCount || 0} tasks
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Calendar size={12} />
            {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <Link
          to={`/projects/${project.id}`}
          className="flex items-center justify-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300
                     border border-blue-800/50 hover:border-blue-600 bg-blue-900/10 hover:bg-blue-900/20
                     rounded-lg py-2 transition-all duration-200"
        >
          Open Project <ArrowRight size={14} />
        </Link>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? This will also delete all associated tasks.`}
        loading={deleting}
      />
    </>
  );
}

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    projectApi.getAll()
      .then(({ data }) => setProjects(data))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin() && (
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={isAdmin() ? "Create your first project to get started." : "You haven't been added to any projects yet."}
          action={isAdmin() && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 mx-auto">
              <Plus size={16} /> Create Project
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={isAdmin()}
              onDelete={(id) => setProjects(projects.filter(p => p.id !== id))}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(p) => setProjects([p, ...projects])}
      />
    </div>
  );
}
