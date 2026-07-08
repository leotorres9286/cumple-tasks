"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RecurrenceKind, TaskKind, Weekday } from "@/lib/types";

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
  const supabase = await createClient();
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
    throw new Error("Solo un admin puede gestionar tareas.");
  }

  return { supabase, user };
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

export async function createTaskTemplate(formData: FormData) {
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
}

export async function updateTaskTemplate(formData: FormData) {
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
}

export async function setTaskTemplateActive(formData: FormData) {
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
}

export async function deleteTaskTemplate(formData: FormData) {
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
}
