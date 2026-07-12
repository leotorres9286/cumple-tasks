import { CumpleTasksApp } from "@/components/cumple-tasks-app";
import { createClient } from "@/lib/supabase/server";
import type {
  NotificationEvent,
  Profile,
  RewardTotal,
  TaskAssignment,
  TaskTemplate,
  TaskWithRelations,
  Weekday
} from "@/lib/types";
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
  time_start: string | null;
  time_end: string | null;
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

interface NotificationRow {
  id: string;
  task_occurrence_id: string;
  recipient_id: string;
  actor_id: string;
  message: string;
  read_at: string | null;
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
      startTime: row.time_start ? row.time_start.slice(0, 5) : null,
      endTime: row.time_end ? row.time_end.slice(0, 5) : null
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

function mapNotification(row: NotificationRow): NotificationEvent {
  return {
    id: row.id,
    taskOccurrenceId: row.task_occurrence_id,
    recipientId: row.recipient_id,
    actorId: row.actor_id,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

  const today = todayIso();

  // Materialize today's occurrences before reading the board. Idempotent.
  await supabase.rpc("ensure_occurrences_for_date", { target_date: today });

  const [
    tasksResult,
    totalsResult,
    notificationsResult,
    profilesResult,
    templatesResult,
    assignmentsResult
  ] = await Promise.all([
    supabase.rpc("tasks_for_date", { target_date: today }),
    supabase.rpc("reward_totals"),
    supabase
      .from("notification_events")
      .select("id,task_occurrence_id,recipient_id,actor_id,message,read_at,created_at")
      .order("created_at", { ascending: false })
      .returns<NotificationRow[]>(),
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

  const initialTasks = (tasksResult.data as TaskWithRelations[] | null) ?? [];
  const initialTotals = (totalsResult.data as RewardTotal[] | null) ?? [];
  const initialNotifications = notificationsResult.data?.map(mapNotification) ?? [];
  const initialProfiles = profilesResult.data?.map(mapProfile) ?? [];
  const initialTemplates = templatesResult.data?.map(mapTemplate) ?? [];
  const initialAssignments = assignmentsResult.data?.map(mapAssignment) ?? [];

  return (
    <CumpleTasksApp
      initialTasks={initialTasks}
      initialProfiles={initialProfiles}
      initialTemplates={initialTemplates}
      initialAssignments={initialAssignments}
      initialTotals={initialTotals}
      initialNotifications={initialNotifications}
      viewerProfile={mapProfile(profile)}
    />
  );
}
