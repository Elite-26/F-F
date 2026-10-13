'use client';

import { useSession } from 'next-auth/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FileText, Users, CheckCircle, Clock } from 'lucide-react';

// Dummy data for charts
const applicationData = [
  { month: 'Jan', applications: 12, responses: 5 },
  { month: 'Feb', applications: 19, responses: 8 },
  { month: 'Mar', applications: 15, responses: 10 },
  { month: 'Apr', applications: 25, responses: 15 },
  { month: 'May', applications: 22, responses: 12 },
  { month: 'Jun', applications: 30, responses: 18 },
];

const statusData = [
  { name: 'Applied', value: 45 },
  { name: 'Interview', value: 20 },
  { name: 'Rejected', value: 25 },
  { name: 'Offer', value: 10 },
];

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b'];

const weeklyData = [
  { day: 'Mon', count: 5 },
  { day: 'Tue', count: 8 },
  { day: 'Wed', count: 6 },
  { day: 'Thu', count: 10 },
  { day: 'Fri', count: 7 },
  { day: 'Sat', count: 3 },
  { day: 'Sun', count: 2 },
];

export default function DashboardPage() {
  const { data: session } = useSession();

  const stats = [
    { 
      label: 'Total Applications', 
      value: '123', 
      icon: FileText, 
      color: 'bg-blue-500',
      change: '+12%'
    },
    { 
      label: 'Active Interviews', 
      value: '8', 
      icon: Clock, 
      color: 'bg-yellow-500',
      change: '+3'
    },
    { 
      label: 'Success Rate', 
      value: '18%', 
      icon: CheckCircle, 
      color: 'bg-green-500',
      change: '+2.5%'
    },
    { 
      label: 'Pending Responses', 
      value: '45', 
      icon: Users, 
      color: 'bg-purple-500',
      change: '-5'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {session?.user?.name}! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your job applications today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Over Time */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Applications Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={applicationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="applications" fill="#6366f1" name="Applications" />
              <Bar dataKey="responses" fill="#22c55e" name="Responses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Application Status Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Application Status
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Weekly Activity
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#6366f1" 
              strokeWidth={2}
              name="Applications"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {[
            { action: 'Applied to Senior Developer at Tech Corp', time: '2 hours ago', status: 'success' },
            { action: 'Interview scheduled with StartupXYZ', time: '5 hours ago', status: 'warning' },
            { action: 'Rejected from DataCo', time: '1 day ago', status: 'error' },
            { action: 'Applied to Full Stack Role at WebDev Inc', time: '2 days ago', status: 'success' },
          ].map((activity, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-gray-900">{activity.action}</span>
              </div>
              <span className="text-sm text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

