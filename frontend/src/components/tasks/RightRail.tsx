import type { Task } from '../../lib/types';
import { CalendarWidget } from './CalendarWidget';
import { MilestoneCard } from './MilestoneCard';

interface RightRailProps {
  tasks: Task[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export function RightRail({ tasks, selectedDate, onSelectDate }: RightRailProps) {
  return (
    <div className="flex flex-col gap-5">
      <CalendarWidget selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <MilestoneCard tasks={tasks} />
    </div>
  );
}
