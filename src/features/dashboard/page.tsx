'use client';

import { useQuery } from '@tanstack/react-query';
import { taskService, type DashboardDTO } from '@/services/task.service';
import { useAuthStore } from '@/stores';
import KpiCards               from './components/KpiCards';
import UpcomingDeadlines      from './components/UpcomingDeadlines';
import TodayCalls             from './components/TodayCalls';
import WorkloadWidget         from './components/WorkloadWidget';
import DeliveryTodayWidget    from './components/DeliveryTodayWidget';
import TaskStatusBreakdownWidget from './components/TaskStatusBreakdownWidget';
import RecentActivityWidget   from './components/RecentActivityWidget';
import MyTasksWidget          from './components/MyTasksWidget';

export default function DashboardPage() {
  const isEmployee = useAuthStore((s) => s.role === 'employee');

  const { data: dashboard, isLoading } = useQuery<DashboardDTO>({
    queryKey: ['dashboard'],
    queryFn:  taskService.getDashboard,
    staleTime: 60 * 1000,
    retry: false,
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-dark">Գլխավոր</h1>
      </div>

      <KpiCards dashboard={dashboard} isLoading={isLoading} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5 mt-3 sm:mt-4 md:mt-5">
        <div className="md:col-span-2 space-y-3 sm:space-y-4 md:space-y-5">
          {isEmployee && <MyTasksWidget tasks={dashboard?.my_tasks} isLoading={isLoading} />}
          <UpcomingDeadlines deadlines={dashboard?.upcoming_deadlines} isLoading={isLoading} />
          <TodayCalls calls={dashboard?.today_calls} isLoading={isLoading} />
          <RecentActivityWidget activity={dashboard?.recent_activity} isLoading={isLoading} />
        </div>
        <div className="space-y-3 sm:space-y-4 md:space-y-5">
          <TaskStatusBreakdownWidget breakdown={dashboard?.task_status_breakdown} isLoading={isLoading} />
          <WorkloadWidget workload={dashboard?.workload} isLoading={isLoading} />
          <DeliveryTodayWidget stats={dashboard?.delivery_today} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
