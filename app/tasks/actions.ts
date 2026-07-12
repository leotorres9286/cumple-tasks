"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, TaskStatus } from "@/lib/types";

const validStatuses: TaskStatus[] = [
  "creada",
  "iniciada",
  "en_proceso",
  "finalizada",
  "incorrecta",
  "verificada"
];

// Estados en los que el responsable tiene una tarea "en curso": ya la comenzo
// pero aun no la finaliza.
const inProgressStatuses: TaskStatus[] = ["iniciada", "en_proceso"];

// Persiste un cambio de estado de una ocurrencia. La autorizacion la resuelve
// la RLS de task_occurrences (responsable avanza, supervisor verifica, admin
// todo); aqui solo preparamos el payload para satisfacer los WITH CHECK.
export async function updateOccurrenceStatus(
  occurrenceId: string,
  nextStatus: TaskStatus
): Promise<ActionResult> {
  try {
    if (!occurrenceId) {
      throw new Error("Falta el identificador de la ocurrencia.");
    }

    if (!validStatuses.includes(nextStatus)) {
      throw new Error("Estado de tarea invalido.");
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Sesion requerida.");
    }

    // Necesitamos el estado actual para saber si esta transicion "comienza" la
    // tarea.
    const { data: current, error: currentError } = await supabase
      .from("task_occurrences")
      .select("status")
      .eq("id", occurrenceId)
      .maybeSingle<{ status: TaskStatus }>();

    if (currentError) {
      throw new Error(currentError.message);
    }

    if (!current) {
      throw new Error("No se encontro la tarea o no tienes acceso.");
    }

    const isStarting =
      inProgressStatuses.includes(nextStatus) &&
      !inProgressStatuses.includes(current.status);

    // Un responsable no puede comenzar otra tarea si tiene una en curso: debe
    // finalizar la que esta en proceso antes de arrancar la siguiente.
    if (isStarting) {
      const { data: active, error: activeError } = await supabase
        .from("task_occurrences")
        .select("id")
        .eq("started_by", user.id)
        .in("status", inProgressStatuses)
        .neq("id", occurrenceId)
        .limit(1);

      if (activeError) {
        throw new Error(activeError.message);
      }

      if (active && active.length > 0) {
        throw new Error(
          "Debes finalizar la tarea que tienes en proceso antes de comenzar otra."
        );
      }
    }

    const nowIso = new Date().toISOString();
    const payload: Record<string, unknown> = { status: nextStatus };

    if (nextStatus === "finalizada") {
      payload.completed_by = user.id;
      payload.completed_at = nowIso;
    } else if (nextStatus === "verificada" || nextStatus === "incorrecta") {
      payload.verified_by = user.id;
      payload.verified_at = nowIso;
    } else {
      // Volver a un estado de trabajo limpia la finalizacion previa para que el
      // retrabajo pase la RLS aunque lo retome un responsable distinto.
      payload.completed_by = null;
      payload.completed_at = null;
    }

    // Al comenzar (o retomar tras un rechazo) se marca quien y cuando arranca
    // este intento. Re-sellar en cada inicio permite que un responsable distinto
    // retome el retrabajo sin chocar con el WITH CHECK de la RLS.
    if (isStarting) {
      payload.started_by = user.id;
      payload.started_at = nowIso;
    }

    const { data, error } = await supabase
      .from("task_occurrences")
      .update(payload)
      .eq("id", occurrenceId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error(
        "No tienes permiso para cambiar esta tarea o la transicion no es valida."
      );
    }

    revalidatePath("/");
    return { ok: true, message: "Estado actualizado." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Ocurrio un error inesperado."
    };
  }
}
