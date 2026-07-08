import { CumpleTasksApp } from "@/components/cumple-tasks-app";
import {
  getTasksForToday,
  notifications,
  profiles,
  rewardTotals,
  taskTemplates
} from "@/lib/mock-data";

export default function Home() {
  return (
    <CumpleTasksApp
      initialTasks={getTasksForToday()}
      initialProfiles={profiles}
      initialTemplates={taskTemplates}
      initialTotals={rewardTotals}
      initialNotifications={notifications}
    />
  );
}
