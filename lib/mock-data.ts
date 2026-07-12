import type {
  NotificationEvent,
  Profile,
  RewardTotal,
  TaskAssignment,
  TaskNote,
  TaskOccurrence,
  TaskTemplate,
  TaskWithRelations
} from "@/lib/types";

const now = "2026-07-08T08:00:00.000Z";

export const profiles: Profile[] = [
  {
    id: "user-admin",
    email: "admin@cumple.tasks",
    fullName: "Admin Cumple",
    initials: "AC",
    role: "admin",
    avatarColor: "#17201b",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "user-supervisor",
    email: "supervisor@cumple.tasks",
    fullName: "Sofia Lopez",
    initials: "S",
    role: "supervisor",
    avatarColor: "#3e6b4f",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "user-r",
    email: "r@cumple.tasks",
    fullName: "Rafa Torres",
    initials: "R",
    role: "responsable",
    avatarColor: "#e56b6f",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "user-i",
    email: "i@cumple.tasks",
    fullName: "Ines Torres",
    initials: "I",
    role: "responsable",
    avatarColor: "#f4b942",
    createdAt: now,
    updatedAt: now
  }
];

export const taskTemplates: TaskTemplate[] = [
  {
    id: "template-cocina",
    name: "Recoger cocina",
    description: "Dejar encimera, fregadero y mesa listos antes de cenar.",
    kind: "accion",
    timeWindow: { startTime: "17:00", endTime: "19:00" },
    recurrence: { kind: "diaria" },
    validFrom: "2026-07-01T00:00:00.000Z",
    validUntil: null,
    rewardPoints: 12,
    supervisorId: "user-supervisor",
    createdBy: "user-admin",
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "template-animo",
    name: "Registrar animo",
    description: "Puntuar el estado de animo del 1 al 10 y dejar una frase.",
    kind: "puntuacion",
    timeWindow: { startTime: "20:00", endTime: "21:30" },
    recurrence: { kind: "diaria" },
    validFrom: "2026-07-01T00:00:00.000Z",
    validUntil: null,
    rewardPoints: 4,
    supervisorId: "user-supervisor",
    createdBy: "user-admin",
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "template-ropa",
    name: "Doblar ropa",
    description: "Separar ropa por persona y dejarla preparada para guardar.",
    kind: "accion",
    timeWindow: { startTime: "18:00", endTime: "20:00" },
    recurrence: { kind: "semanal", weekdays: ["miercoles", "sabado"] },
    validFrom: "2026-07-01T00:00:00.000Z",
    validUntil: null,
    rewardPoints: 18,
    supervisorId: "user-supervisor",
    createdBy: "user-admin",
    active: true,
    createdAt: now,
    updatedAt: now
  }
];

export const taskAssignments: TaskAssignment[] = [
  {
    id: "assign-cocina-r",
    taskTemplateId: "template-cocina",
    responsibleId: "user-r",
    createdAt: now
  },
  {
    id: "assign-cocina-i",
    taskTemplateId: "template-cocina",
    responsibleId: "user-i",
    createdAt: now
  },
  {
    id: "assign-animo-r",
    taskTemplateId: "template-animo",
    responsibleId: "user-r",
    createdAt: now
  },
  {
    id: "assign-ropa-i",
    taskTemplateId: "template-ropa",
    responsibleId: "user-i",
    createdAt: now
  }
];

export const taskOccurrences: TaskOccurrence[] = [
  {
    id: "occ-cocina-today",
    taskTemplateId: "template-cocina",
    scheduledFor: "2026-07-08",
    status: "creada",
    startedBy: null,
    startedAt: null,
    completedBy: null,
    completedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    scoreValue: null,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "occ-animo-today",
    taskTemplateId: "template-animo",
    scheduledFor: "2026-07-08",
    status: "en_proceso",
    startedBy: "user-r",
    startedAt: "2026-07-08T20:05:00.000Z",
    completedBy: null,
    completedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    scoreValue: 7,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "occ-ropa-today",
    taskTemplateId: "template-ropa",
    scheduledFor: "2026-07-08",
    status: "finalizada",
    startedBy: "user-i",
    startedAt: "2026-07-08T18:10:00.000Z",
    completedBy: "user-i",
    completedAt: "2026-07-08T18:45:00.000Z",
    verifiedBy: null,
    verifiedAt: null,
    scoreValue: null,
    createdAt: now,
    updatedAt: now
  }
];

export const taskNotes: TaskNote[] = [
  {
    id: "note-cocina-admin",
    taskTemplateId: "template-cocina",
    taskOccurrenceId: null,
    authorId: "user-admin",
    kind: "nota_interna",
    body: "Revisar especialmente fregadero y reciclaje.",
    createdAt: "2026-07-08T08:10:00.000Z"
  },
  {
    id: "note-ropa-responsable",
    taskTemplateId: null,
    taskOccurrenceId: "occ-ropa-today",
    authorId: "user-i",
    kind: "comentario_responsable",
    body: "Queda una lavadora pendiente para manana.",
    createdAt: "2026-07-08T18:50:00.000Z"
  }
];

export const notifications: NotificationEvent[] = [
  {
    id: "notification-ropa",
    taskOccurrenceId: "occ-ropa-today",
    recipientId: "user-supervisor",
    actorId: "user-i",
    message: "Doblar ropa esta lista para revision.",
    readAt: null,
    createdAt: "2026-07-08T18:50:00.000Z"
  }
];

export function getTasksForToday(): TaskWithRelations[] {
  return taskOccurrences.map((occurrence) => {
    const template = taskTemplates.find((task) => task.id === occurrence.taskTemplateId);
    if (!template) {
      throw new Error(`Missing task template for ${occurrence.taskTemplateId}`);
    }

    const supervisor = profiles.find((profile) => profile.id === template.supervisorId);
    if (!supervisor) {
      throw new Error(`Missing supervisor for ${template.id}`);
    }

    const responsibles = taskAssignments
      .filter((assignment) => assignment.taskTemplateId === template.id)
      .map((assignment) => profiles.find((profile) => profile.id === assignment.responsibleId))
      .filter((profile): profile is Profile => Boolean(profile));

    const notes = taskNotes.filter(
      (note) =>
        note.taskTemplateId === template.id || note.taskOccurrenceId === occurrence.id
    );

    return { template, occurrence, supervisor, responsibles, notes };
  });
}

export const rewardTotals: RewardTotal[] = [
  {
    profileId: "user-r",
    profileName: "Rafa Torres",
    initials: "R",
    daily: 16,
    weekly: 64,
    monthly: 188
  },
  {
    profileId: "user-i",
    profileName: "Ines Torres",
    initials: "I",
    daily: 30,
    weekly: 92,
    monthly: 214
  },
  {
    profileId: "user-supervisor",
    profileName: "Sofia Lopez",
    initials: "S",
    daily: 0,
    weekly: 0,
    monthly: 0
  }
];
