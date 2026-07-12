"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { ActionResult, RecurrenceKind, TaskKind, UserRole, Weekday } from "@/lib/types";

function toActionError(error: unknown): ActionResult {
  return {
    ok: false,
    message: error instanceof Error ? error.message : "Ocurrio un error inesperado."
  };
}

const weekdays: Weekday[] = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo"
];

function readString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readNullableDate(formData: FormData, name: string) {
  const value = readString(formData, name);
  return value ? `${value}T00:00:00.000Z` : null;
}

function readPositiveInteger(formData: FormData, name: string, fallback = 0) {
  const value = Number.parseInt(readString(formData, name), 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readRecurrence(formData: FormData) {
  const recurrenceKind = readString(formData, "recurrenceKind") as RecurrenceKind;
  const selectedWeekdays = formData
    .getAll("weekdays")
    .map(String)
    .filter((day): day is Weekday => weekdays.includes(day as Weekday));
  const monthDay = readPositiveInteger(formData, "monthDay", 1);

  if (!["diaria", "semanal", "mensual"].includes(recurrenceKind)) {
    throw new Error("Tipo de recurrencia invalido.");
  }

  if (recurrenceKind === "semanal" && selectedWeekdays.length === 0) {
    throw new Error("Selecciona al menos un dia para tareas semanales.");
  }

  if (recurrenceKind === "mensual" && (monthDay < 1 || monthDay > 31)) {
    throw new Error("El dia mensual debe estar entre 1 y 31.");
  }

  return {
    recurrenceKind,
    recurrenceWeekdays: recurrenceKind === "semanal" ? selectedWeekdays : [],
    recurrenceMonthDay: recurrenceKind === "mensual" ? monthDay : null
  };
}

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesion requerida.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (error || profile?.role !== "admin") {
    throw new Error("Solo un admin puede gestionar esta seccion.");
  }

  return { supabase, user };
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    serviceRoleKey === "replace-with-service-role-key-for-server-jobs-only"
  ) {
    throw new Error("Configura SUPABASE_SERVICE_ROLE_KEY para crear o borrar usuarios.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function readRole(formData: FormData) {
  const role = readString(formData, "role") as UserRole;

  if (!["admin", "supervisor", "responsable"].includes(role)) {
    throw new Error("Rol de usuario invalido.");
  }

  return role;
}

function readProfilePayload(formData: FormData) {
  const fullName = readString(formData, "fullName");
  const role = readRole(formData);
  const avatarColor = readString(formData, "avatarColor") || "#3e6b4f";
  const initials = (readString(formData, "initials") || getInitials(fullName)).slice(0, 3);

  if (!fullName || !initials) {
    throw new Error("Nombre e iniciales son obligatorios.");
  }

  return {
    full_name: fullName,
    initials: initials.toUpperCase(),
    role,
    avatar_color: avatarColor
  };
}

function readTemplatePayload(formData: FormData, createdBy: string) {
  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const kind = readString(formData, "kind") as TaskKind;
  const timeStart = readString(formData, "timeStart");
  const timeEnd = readString(formData, "timeEnd");
  const supervisorId = readString(formData, "supervisorId");
  const validFrom = readNullableDate(formData, "validFrom");
  const validUntil = readNullableDate(formData, "validUntil");
  const rewardPoints = readPositiveInteger(formData, "rewardPoints", 0);
  const { recurrenceKind, recurrenceWeekdays, recurrenceMonthDay } = readRecurrence(formData);

  if (!name || !timeStart || !timeEnd || !supervisorId || !validFrom) {
    throw new Error("Faltan campos obligatorios de la tarea.");
  }

  if (!["accion", "puntuacion"].includes(kind)) {
    throw new Error("Tipo de tarea invalido.");
  }

  return {
    name,
    description,
    kind,
    time_start: timeStart,
    time_end: timeEnd,
    recurrence_kind: recurrenceKind,
    recurrence_weekdays: recurrenceWeekdays,
    recurrence_month_day: recurrenceMonthDay,
    valid_from: validFrom,
    valid_until: validUntil,
    reward_points: rewardPoints,
    supervisor_id: supervisorId,
    created_by: createdBy,
    active: formData.get("active") === "on"
  };
}

function readResponsibleIds(formData: FormData) {
  return Array.from(new Set(formData.getAll("responsibleIds").map(String).filter(Boolean)));
}

export async function createTaskTemplate(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    const payload = readTemplatePayload(formData, user.id);
    const responsibleIds = readResponsibleIds(formData);

    if (responsibleIds.length === 0) {
      throw new Error("Selecciona al menos un responsable.");
    }

    const { data: template, error } = await supabase
      .from("task_templates")
      .insert(payload)
      .select("id")
      .single<{ id: string }>();

    if (error || !template) {
      throw new Error(error?.message ?? "No se pudo crear la tarea.");
    }

    const { error: assignmentError } = await supabase.from("task_assignments").insert(
      responsibleIds.map((responsibleId) => ({
        task_template_id: template.id,
        responsible_id: responsibleId
      }))
    );

    if (assignmentError) {
      throw new Error(assignmentError.message);
    }

    revalidatePath("/");
    return { ok: true, message: `Tarea "${payload.name}" creada.` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTaskTemplate(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    const templateId = readString(formData, "templateId");
    const payload = readTemplatePayload(formData, user.id);
    const responsibleIds = readResponsibleIds(formData);

    if (!templateId) {
      throw new Error("Falta el identificador de la tarea.");
    }

    if (responsibleIds.length === 0) {
      throw new Error("Selecciona al menos un responsable.");
    }

    const { error } = await supabase
      .from("task_templates")
      .update(payload)
      .eq("id", templateId);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("task_assignments")
      .delete()
      .eq("task_template_id", templateId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { error: insertError } = await supabase.from("task_assignments").insert(
      responsibleIds.map((responsibleId) => ({
        task_template_id: templateId,
        responsible_id: responsibleId
      }))
    );

    if (insertError) {
      throw new Error(insertError.message);
    }

    revalidatePath("/");
    return { ok: true, message: `Tarea "${payload.name}" actualizada.` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setTaskTemplateActive(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const templateId = readString(formData, "templateId");
    const active = readString(formData, "active") === "true";

    if (!templateId) {
      throw new Error("Falta el identificador de la tarea.");
    }

    const { error } = await supabase
      .from("task_templates")
      .update({ active })
      .eq("id", templateId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    return { ok: true, message: active ? "Tarea activada." : "Tarea pausada." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTaskTemplate(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const templateId = readString(formData, "templateId");

    if (!templateId) {
      throw new Error("Falta el identificador de la tarea.");
    }

    const { error } = await supabase.from("task_templates").delete().eq("id", templateId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    return { ok: true, message: "Tarea borrada." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createManagedUser(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const email = readString(formData, "email");
    const password = readString(formData, "password");
    const profilePayload = readProfilePayload(formData);

    if (!email || password.length < 6) {
      throw new Error("Introduce email y una contrasena de al menos 6 caracteres.");
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: profilePayload.full_name
      }
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "No se pudo crear el usuario.");
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .update(profilePayload)
      .eq("id", data.user.id);

    if (profileError) {
      throw new Error(profileError.message);
    }

    revalidatePath("/");
    return { ok: true, message: `Usuario "${profilePayload.full_name}" creado.` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateManagedUser(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    const userId = readString(formData, "userId");
    const profilePayload = readProfilePayload(formData);

    if (!userId) {
      throw new Error("Falta el identificador del usuario.");
    }

    if (userId === user.id && profilePayload.role !== "admin") {
      throw new Error("No puedes quitarte tu propio rol admin.");
    }

    const { error } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", userId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    return { ok: true, message: `Usuario "${profilePayload.full_name}" actualizado.` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteManagedUser(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { user } = await requireAdmin();
    const adminClient = createAdminClient();
    const userId = readString(formData, "userId");

    if (!userId) {
      throw new Error("Falta el identificador del usuario.");
    }

    if (userId === user.id) {
      throw new Error("No puedes borrar tu propio usuario.");
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/");
    return { ok: true, message: "Usuario borrado." };
  } catch (error) {
    return toActionError(error);
  }
}
