import { RepProgress } from '@/lib/types';
import { CheckCircle, XCircle, Percent, Users } from 'lucide-react';

interface DashboardStatsProps {
  data: RepProgress[];
}

export function DashboardStats({ data }: DashboardStatsProps) {
  const totalSigned = data.reduce((sum, r) => sum + r.signed, 0);
  const totalNotSigned = data.reduce((sum, r) => sum + r.not_signed, 0);
  const totalStores = data.reduce((sum, r) => sum + r.total_stores, 0);
  const avgProgress = data.length > 0 
    ? Math.round(data.reduce((sum, r) => sum + r.progress, 0) / data.length)
    : 0;

  const stats = [
    {
      label: 'Total Reps',
      value: data.length,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Total Stores',
      value: totalStores,
      icon: Percent,
      color: 'bg-purple-500',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Signed',
      value: totalSigned,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Not Signed',
      value: totalNotSigned,
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Progress',
      value: `${avgProgress}%`,
      icon: Percent,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stat.value}</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
