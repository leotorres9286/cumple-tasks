import { CumpleTasksApp } from "@/components/cumple-tasks-app";
import {
  getTasksForToday,
  notifications,
  profiles as mockProfiles,
  rewardTotals,
  taskAssignments as mockTaskAssignments,
  taskTemplates as mockTaskTemplates
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TaskAssignment, TaskTemplate, Weekday } from "@/lib/types";
import { redirect } from "next/navigation";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  role: Profile["role"];
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

interface TaskTemplateRow {
  id: string;
  name: string;
  description: string;
  kind: TaskTemplate["kind"];
  time_start: string;
  time_end: string;
  recurrence_kind: TaskTemplate["recurrence"]["kind"];
  recurrence_weekdays: Weekday[];
  recurrence_month_day: number | null;
  valid_from: string;
  valid_until: string | null;
  reward_points: number;
  supervisor_id: string;
  created_by: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskAssignmentRow {
  id: string;
  task_template_id: string;
  responsible_id: string;
  created_at: string;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    initials: row.initials,
    role: row.role,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTemplate(row: TaskTemplateRow): TaskTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind,
    timeWindow: {
      startTime: row.time_start.slice(0, 5),
      endTime: row.time_end.slice(0, 5)
    },
    recurrence: {
      kind: row.recurrence_kind,
      weekdays: row.recurrence_weekdays,
      monthDay: row.recurrence_month_day ?? undefined
    },
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    rewardPoints: row.reward_points,
    supervisorId: row.supervisor_id,
    createdBy: row.created_by,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAssignment(row: TaskAssignmentRow): TaskAssignment {
  return {
    id: row.id,
    taskTemplateId: row.task_template_id,
    responsibleId: row.responsible_id,
    createdAt: row.created_at
  };
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,initials,role,avatar_color,created_at,updated_at")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (error || !profile) {
    redirect("/login?error=No se encontro el perfil de usuario.");
  }

  const [profilesResult, templatesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,full_name,initials,role,avatar_color,created_at,updated_at")
      .order("full_name", { ascending: true })
      .returns<ProfileRow[]>(),
    supabase
      .from("task_templates")
      .select(
        "id,name,description,kind,time_start,time_end,recurrence_kind,recurrence_weekdays,recurrence_month_day,valid_from,valid_until,reward_points,supervisor_id,created_by,active,created_at,updated_at"
      )
      .order("created_at", { ascending: false })
      .returns<TaskTemplateRow[]>(),
    supabase
      .from("task_assignments")
      .select("id,task_template_id,responsible_id,created_at")
      .returns<TaskAssignmentRow[]>()
  ]);

  const initialProfiles =
    profilesResult.data && profilesResult.data.length > 0
      ? profilesResult.data.map(mapProfile)
      : mockProfiles;
  const initialTemplates = templatesResult.data?.map(mapTemplate) ?? mockTaskTemplates;
  const initialAssignments =
    assignmentsResult.data?.map(mapAssignment) ?? mockTaskAssignments;

  return (
    <CumpleTasksApp
      initialTasks={getTasksForToday()}
      initialProfiles={initialProfiles}
      initialTemplates={initialTemplates}
      initialAssignments={initialAssignments}
      initialTotals={rewardTotals}
      initialNotifications={notifications}
      viewerProfile={mapProfile(profile)}
    />
  );
}
