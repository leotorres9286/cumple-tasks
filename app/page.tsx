import { CumpleTasksApp } from "@/components/cumple-tasks-app";
import {
  getTasksForToday,
  notifications,
  profiles,
  rewardTotals,
  taskTemplates
} from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
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

  return (
    <CumpleTasksApp
      initialTasks={getTasksForToday()}
      initialProfiles={profiles}
      initialTemplates={taskTemplates}
      initialTotals={rewardTotals}
      initialNotifications={notifications}
      viewerProfile={mapProfile(profile)}
    />
  );
}
