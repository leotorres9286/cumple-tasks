export type UserRole = "admin" | "supervisor" | "responsable";

export type TaskKind = "accion" | "puntuacion";

export type TaskStatus =
  | "creada"
  | "iniciada"
  | "en_proceso"
  | "finalizada"
  | "incorrecta"
  | "verificada";

export type RecurrenceKind = "diaria" | "semanal" | "mensual";

export type NoteKind =
  | "nota_interna"
  | "comentario_responsable"
  | "feedback_supervisor";

export type Weekday =
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado"
  | "domingo";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  initials: string;
  role: UserRole;
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurrenceRule {
  kind: RecurrenceKind;
  weekdays?: Weekday[];
  monthDay?: number;
}

export interface TimeWindow {
  startTime: string;
  endTime: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  kind: TaskKind;
  timeWindow: TimeWindow;
  recurrence: RecurrenceRule;
  validFrom: string;
  validUntil: string | null;
  rewardPoints: number;
  supervisorId: string;
  createdBy: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignment {
  id: string;
  taskTemplateId: string;
  responsibleId: string;
  createdAt: string;
}

export interface TaskOccurrence {
  id: string;
  taskTemplateId: string;
  scheduledFor: string;
  status: TaskStatus;
  completedBy: string | null;
  completedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  scoreValue: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskNote {
  id: string;
  taskTemplateId: string | null;
  taskOccurrenceId: string | null;
  authorId: string;
  kind: NoteKind;
  body: string;
  createdAt: string;
}

export interface TaskWithRelations {
  template: TaskTemplate;
  occurrence: TaskOccurrence;
  supervisor: Profile;
  responsibles: Profile[];
  notes: TaskNote[];
}

export interface RewardTotal {
  profileId: string;
  profileName: string;
  initials: string;
  daily: number;
  weekly: number;
  monthly: number;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface NotificationEvent {
  id: string;
  taskOccurrenceId: string;
  recipientId: string;
  actorId: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export const statusLabels: Record<TaskStatus, string> = {
  creada: "Pendiente",
  iniciada: "Iniciada",
  en_proceso: "En proceso",
  finalizada: "Para revisar",
  incorrecta: "Incorrecta",
  verificada: "Verificada"
};

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  responsable: "Responsable"
};

export const taskKindLabels: Record<TaskKind, string> = {
  accion: "Accion",
  puntuacion: "Puntuacion"
};
