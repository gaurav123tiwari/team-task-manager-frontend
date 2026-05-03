import { useState, useEffect } from 'react';
import {
  LayoutDashboard, CheckSquare, Clock, AlertTriangle,
  FolderKanban, TrendingUp, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';

const StatCard = ({ label, value, icon: Icon, color, subLabel }) => (
  <div className="card flex items-center gap-4 hover:border-gray-700 transition-all duration-200">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-3xl font-bold text-gray-100 leading-none">{value ?? '—'}</p>
      <p className="text-gray-500 text-sm mt-0.5">{label}</p>
      {subLabel && <p className="text-xs text-gray-600 mt-0.5">{subLabel}</p>}
    </div>
  </div>
);

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completionRate = stats
    ? stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {isAdmin() ? 'Here\'s an overview of your entire workspace.' : 'Here\'s your personal task overview.'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Total Tasks"
          value={stats?.totalTasks}
          icon={CheckSquare}
          color="bg-blue-600"
          subLabel={isAdmin() ? 'Across all projects' : 'Assigned to you'}
        />
        <StatCard
          label="Completed"
          value={stats?.completedTasks}
          icon={TrendingUp}
          color="bg-green-600"
          subLabel={`${completionRate}% completion rate`}
        />
        <StatCard
          label="In Progress"
          value={stats?.inProgressTasks}
          icon={Clock}
          color="bg-purple-600"
        />
        <StatCard
          label="To Do"
          value={stats?.pendingTasks}
          icon={LayoutDashboard}
          color="bg-gray-600"
        />
        <StatCard
          label="Overdue"
          value={stats?.overdueTasks}
          icon={AlertTriangle}
          color={stats?.overdueTasks > 0 ? 'bg-red-600' : 'bg-gray-600'}
        />
        <StatCard
          label="Projects"
          value={stats?.totalProjects}
          icon={FolderKanban}
          color="bg-cyan-600"
          subLabel={isAdmin() ? 'Total projects' : 'You are a member of'}
        />
      </div>

      {/* Progress Bar */}
      {stats?.totalTasks > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Overall Progress</h2>
            <span className="text-blue-400 font-bold text-lg">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{stats.completedTasks} completed</span>
            <span>{stats.totalTasks - stats.completedTasks} remaining</span>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/projects"
          className="card hover:border-blue-700/50 hover:bg-blue-900/10 transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center group-hover:bg-blue-800/50 transition-colors">
              <FolderKanban size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-200 group-hover:text-white transition-colors">Browse Projects</p>
              <p className="text-xs text-gray-500">View all your projects</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
        </Link>

        <Link
          to="/my-tasks"
          className="card hover:border-purple-700/50 hover:bg-purple-900/10 transition-all duration-200 group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-900/50 rounded-lg flex items-center justify-center group-hover:bg-purple-800/50 transition-colors">
              <CheckSquare size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-200 group-hover:text-white transition-colors">My Tasks</p>
              <p className="text-xs text-gray-500">Tasks assigned to you</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
