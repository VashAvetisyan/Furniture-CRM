import { ChevronRightIcon } from '@/components/icons';
import Avatar from '@/components/ui/Avatar';
import { activities } from '../data';

export default function ActivityStream() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-lg font-bold text-dark mb-4">Ակտիվության հոսք</h2>

      <div className="space-y-5">
        {activities.map((activity) => (
          <div key={activity.name}>
            {/* User header */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar color={activity.color} initials={activity.initials} size="sm" />
              <div>
                <p className="text-xs font-semibold text-dark">{activity.name}</p>
                <p className="text-[11px] text-text-muted">{activity.role}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="ml-9 space-y-1.5">
              {activity.actions.map((action, i) => (
                <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm flex-shrink-0">{action.icon}</span>
                  <p className="text-xs text-gray-600 leading-snug">{action.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full text-center text-sm text-primary font-medium hover:underline flex items-center justify-center gap-1">
        Տեսնել ավելին <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}