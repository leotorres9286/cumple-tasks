"use client";

import { AnimatePresence, Reorder, motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  LogOut,
  MessageSquareText,
  PanelTop,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createManagedUser,
  createTaskTemplate,
  deleteManagedUser,
  deleteTaskTemplate,
  setTaskTemplateActive,
  updateManagedUser,
  updateTaskTemplate
} from "@/app/admin/actions";
import { signOut } from "@/app/auth/actions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { useToast } from "@/components/toast";
import type {
  NotificationEvent,
  Profile,
  RecurrenceKind,
  RewardTotal,
  TaskAssignment,
  TaskStatus,
  TaskTemplate,
  TaskWithRelations,
  UserRole
} from "@/lib/types";
import { roleLabels, statusLabels, taskKindLabels } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CumpleTasksAppProps {
  initialTasks: TaskWithRelations[];
  initialProfiles: Profile[];
  initialTemplates: TaskTemplate[];
  initialAssignments: TaskAssignment[];
  initialTotals: RewardTotal[];
  initialNotifications: NotificationEvent[];
  viewerProfile: Profile;
}

type Tab = "tablero" | "totales" | "admin";

const kanbanColumns: Array<{ status: TaskStatus; title: string }> = [
  { status: "creada", title: "Pendientes" },
  { status: "en_proceso", title: "En proceso" },
  { status: "finalizada", title: "Revision" },
  { status: "verificada", title: "Verificadas" },
  { status: "incorrecta", title: "Incorrectas" }
];

const statusFlow: TaskStatus[] = [
  "creada",
  "iniciada",
  "en_proceso",
  "finalizada",
  "verificada"
];

const weekdayOptions = [
  { value: "lunes", label: "L" },
  { value: "martes", label: "M" },
  { value: "miercoles", label: "X" },
  { value: "jueves", label: "J" },
  { value: "viernes", label: "V" },
  { value: "sabado", label: "S" },
  { value: "domingo", label: "D" }
] as const;

export function CumpleTasksApp({
  initialTasks,
  initialProfiles,
  initialTemplates,
  initialAssignments,
  initialTotals,
  initialNotifications,
  viewerProfile
}: CumpleTasksAppProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tablero");
  const [tasks, setTasks] = useState(initialTasks);
  const { toast } = useToast();

  const viewer = useMemo(() => viewerProfile, [viewerProfile]);

  const visibleNotifications = initialNotifications.filter(
    (notification) => notification.recipientId === viewer.id
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  function changeStatus(taskId: string, nextStatus: TaskStatus) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.occurrence.id !== taskId) {
          return task;
        }

        const isCompleting = nextStatus === "finalizada";
        const isVerifying = nextStatus === "verificada" || nextStatus === "incorrecta";

        return {
          ...task,
          occurrence: {
            ...task.occurrence,
            status: nextStatus,
            completedBy: isCompleting ? viewer.id : task.occurrence.completedBy,
            completedAt: isCompleting ? new Date().toISOString() : task.occurrence.completedAt,
            verifiedBy: isVerifying ? viewer.id : task.occurrence.verifiedBy,
            verifiedAt: isVerifying ? new Date().toISOString() : task.occurrence.verifiedAt,
            updatedAt: new Date().toISOString()
          }
        };
      })
    );

    const taskName = tasks.find((task) => task.occurrence.id === taskId)?.template.name;
    toast(
      `${taskName ?? "Tarea"} cambio a ${statusLabels[nextStatus].toLowerCase()}. Supervisor notificado.`,
      "info"
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 pb-24 pt-4 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-20 -mx-3 border-b border-ink/10 bg-paper/90 px-3 pb-3 pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-moss">
              Cumple Tasks
            </p>
            <h1 className="truncate text-xl font-semibold text-ink sm:text-2xl">
              Tareas de hoy
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-ink/10 bg-white px-2 py-1.5 shadow-sm sm:flex">
              <span
                className="grid size-7 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: viewer.avatarColor }}
              >
                {viewer.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{viewer.fullName}</p>
                <p className="text-[11px] font-medium text-moss">{roleLabels[viewer.role]}</p>
              </div>
            </div>
            <button
              className="relative grid size-10 place-items-center rounded-full border border-ink/10 bg-white text-ink shadow-sm"
              title="Notificaciones"
              type="button"
            >
              <Bell size={18} />
              {visibleNotifications.length > 0 ? (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-coral" />
              ) : null}
            </button>
            <form action={signOut}>
              <SubmitButton
                className="grid size-10 place-items-center rounded-full border border-ink/10 bg-white text-ink shadow-sm"
                icon={<LogOut size={18} />}
                spinnerSize={18}
                title="Cerrar sesion"
              />
            </form>
          </div>
        </div>

        <nav className="mt-3 grid grid-cols-3 gap-2">
          <TabButton
            active={activeTab === "tablero"}
            icon={<PanelTop size={16} />}
            label="Tablero"
            onClick={() => setActiveTab("tablero")}
          />
          <TabButton
            active={activeTab === "totales"}
            icon={<Sparkles size={16} />}
            label="Totales"
            onClick={() => setActiveTab("totales")}
          />
          <TabButton
            active={activeTab === "admin"}
            disabled={viewer.role !== "admin"}
            icon={<UserCog size={16} />}
            label="Admin"
            onClick={() => setActiveTab("admin")}
          />
        </nav>
      </header>

      <section className="mt-4">
        <AnimatePresence mode="wait">
          {activeTab === "tablero" ? (
            <motion.div
              key="tablero"
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <TodaySummary tasks={tasks} />
              <KanbanBoard
                tasks={tasks}
                viewerRole={viewer.role}
                onStatusChange={changeStatus}
              />
            </motion.div>
          ) : null}

          {activeTab === "totales" ? (
            <motion.div
              key="totales"
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <TotalsDashboard totals={initialTotals} />
            </motion.div>
          ) : null}

          {activeTab === "admin" ? (
            <motion.div
              key="admin"
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <AdminArea
                assignments={initialAssignments}
                profiles={initialProfiles}
                templates={initialTemplates}
                viewerProfile={viewer}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </main>
  );
}

function TabButton({
  active,
  disabled,
  icon,
  label,
  onClick
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition",
        active
          ? "border-ink bg-ink text-white"
          : "border-ink/10 bg-white text-ink shadow-sm",
        disabled && "cursor-not-allowed opacity-45"
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TodaySummary({ tasks }: { tasks: TaskWithRelations[] }) {
  const verifiedPoints = tasks
    .filter((task) => task.occurrence.status === "verificada")
    .reduce((total, task) => total + task.template.rewardPoints * task.responsibles.length, 0);
  const readyForReview = tasks.filter((task) => task.occurrence.status === "finalizada").length;

  return (
    <div className="grid grid-cols-3 gap-2">
      <MetricTile icon={<ClipboardList size={17} />} label="Hoy" value={tasks.length.toString()} />
      <MetricTile icon={<ShieldCheck size={17} />} label="Revision" value={readyForReview.toString()} />
      <MetricTile icon={<Sparkles size={17} />} label="Puntos" value={verifiedPoints.toString()} />
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between text-moss">
        {icon}
        <span className="text-[11px] font-semibold uppercase">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function KanbanBoard({
  tasks,
  viewerRole,
  onStatusChange
}: {
  tasks: TaskWithRelations[];
  viewerRole: UserRole;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <div className="mt-4 flex gap-3 overflow-x-auto pb-4">
      {kanbanColumns.map((column) => {
        const columnTasks = tasks.filter((task) => {
          if (column.status === "en_proceso") {
            return task.occurrence.status === "en_proceso" || task.occurrence.status === "iniciada";
          }

          return task.occurrence.status === column.status;
        });

        return (
          <section
            className="min-w-[82vw] max-w-[82vw] rounded-lg border border-ink/10 bg-white/80 p-3 shadow-sm sm:min-w-[320px] sm:max-w-[320px]"
            key={column.status}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">{column.title}</h2>
              <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-semibold text-moss">
                {columnTasks.length}
              </span>
            </div>

            <Reorder.Group
              axis="y"
              className="space-y-3"
              values={columnTasks}
              onReorder={() => undefined}
            >
              <AnimatePresence initial={false}>
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.occurrence.id}
                    task={task}
                    viewerRole={viewerRole}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </AnimatePresence>

              {columnTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-ink/15 bg-paper/70 p-4 text-center text-sm text-ink/50">
                  Sin tareas
                </div>
              ) : null}
            </Reorder.Group>
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  viewerRole,
  onStatusChange
}: {
  task: TaskWithRelations;
  viewerRole: UserRole;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const currentIndex = statusFlow.indexOf(task.occurrence.status);
  const nextStatus = statusFlow[Math.min(currentIndex + 1, statusFlow.length - 1)] ?? "en_proceso";
  const canResponsibleMove =
    viewerRole === "responsable" &&
    ["creada", "iniciada", "en_proceso", "incorrecta"].includes(task.occurrence.status);
  const canSupervisorReview =
    viewerRole === "supervisor" && task.occurrence.status === "finalizada";
  const canAdminMove = viewerRole === "admin";

  return (
    <Reorder.Item
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-ink/10 bg-white p-3 shadow-sm"
      exit={{ opacity: 0, y: 10 }}
      initial={{ opacity: 0, y: 10 }}
      value={task}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">{task.template.name}</p>
          <p className="mt-1 line-clamp-2 text-sm text-ink/65">{task.template.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-honey/20 px-2 py-1 text-xs font-semibold text-ink">
          +{task.template.rewardPoints}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink/70">
        <span className="rounded-md bg-paper px-2 py-1">
          {task.template.timeWindow.startTime}-{task.template.timeWindow.endTime}
        </span>
        <span className="rounded-md bg-paper px-2 py-1">
          {taskKindLabels[task.template.kind]}
          {task.occurrence.scoreValue ? ` ${task.occurrence.scoreValue}` : ""}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex -space-x-2">
          {task.responsibles.map((profile) => (
            <span
              className="grid size-8 place-items-center rounded-full border-2 border-white text-xs font-bold text-white"
              key={profile.id}
              style={{ backgroundColor: profile.avatarColor }}
              title={profile.fullName}
            >
              {profile.initials}
            </span>
          ))}
        </div>
        <span className="text-xs font-medium text-moss">
          {statusLabels[task.occurrence.status]}
        </span>
      </div>

      {task.notes.length > 0 ? (
        <div className="mt-3 rounded-lg bg-mist/70 p-2 text-xs text-ink/70">
          <div className="mb-1 flex items-center gap-1 font-semibold text-ink">
            <MessageSquareText size={13} />
            {task.notes.length} nota{task.notes.length > 1 ? "s" : ""}
          </div>
          <p className="line-clamp-2">{task.notes[task.notes.length - 1]?.body}</p>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        {canResponsibleMove || canAdminMove ? (
          <button
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-white"
            onClick={() => onStatusChange(task.occurrence.id, nextStatus)}
            type="button"
          >
            <ChevronRight size={16} />
            Avanzar
          </button>
        ) : null}

        {canSupervisorReview ? (
          <>
            <button
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-coral px-3 text-sm font-semibold text-white"
              onClick={() => onStatusChange(task.occurrence.id, "incorrecta")}
              type="button"
            >
              Incorrecta
            </button>
            <button
              className="grid size-10 place-items-center rounded-lg bg-moss text-white"
              onClick={() => onStatusChange(task.occurrence.id, "verificada")}
              title="Verificar"
              type="button"
            >
              <Check size={18} />
            </button>
          </>
        ) : null}
      </div>
    </Reorder.Item>
  );
}

function TotalsDashboard({ totals }: { totals: RewardTotal[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Totales</h2>
          <p className="text-sm text-ink/60">Puntos por usuario y periodo.</p>
        </div>
        <CalendarDays className="text-moss" size={22} />
      </div>

      {totals.map((total) => (
        <article
          className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm"
          key={total.profileId}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-white">
              {total.initials}
            </span>
            <div>
              <h3 className="font-semibold text-ink">{total.profileName}</h3>
              <p className="text-xs text-ink/55">Acumulado verificado</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <PointCell label="Dia" value={total.daily} />
            <PointCell label="Semana" value={total.weekly} />
            <PointCell label="Mes" value={total.monthly} />
          </div>
        </article>
      ))}
    </div>
  );
}

function PointCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-paper p-3 text-center">
      <p className="text-[11px] font-semibold uppercase text-moss">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function AdminArea({
  assignments,
  profiles,
  templates,
  viewerProfile
}: {
  assignments: TaskAssignment[];
  profiles: Profile[];
  templates: TaskTemplate[];
  viewerProfile: Profile;
}) {
  const [showCreateForm, setShowCreateForm] = useState(templates.length === 0);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const supervisors = profiles.filter(
    (profile) => profile.role === "supervisor" || profile.role === "admin"
  );
  const responsibles = profiles.filter((profile) => profile.role === "responsable");
  const assignmentsByTemplate = useMemo(() => {
    return assignments.reduce<Map<string, string[]>>((map, assignment) => {
      const current = map.get(assignment.taskTemplateId) ?? [];
      current.push(assignment.responsibleId);
      map.set(assignment.taskTemplateId, current);
      return map;
    }, new Map());
  }, [assignments]);
  const canManageTasks = supervisors.length > 0 && responsibles.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Administracion</h2>
          <p className="text-sm text-ink/60">Gestion de tareas, usuarios y roles.</p>
        </div>
        <button
          className="grid size-10 place-items-center rounded-lg bg-ink text-white"
          onClick={() => setShowCreateForm((current) => !current)}
          title={showCreateForm ? "Cerrar formulario" : "Crear tarea"}
          type="button"
        >
          <Plus size={18} />
        </button>
      </div>

      {!canManageTasks ? (
        <div className="rounded-lg border border-honey/35 bg-honey/15 p-4 text-sm text-ink">
          Crea al menos un responsable y un supervisor/admin antes de asignar tareas.
        </div>
      ) : null}

      {showCreateForm ? (
        <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Plus size={18} className="text-moss" />
            <h3 className="font-semibold text-ink">Nueva tarea</h3>
          </div>
          <ActionForm
            action={createTaskTemplate}
            className="space-y-4"
            onSuccess={() => setShowCreateForm(false)}
          >
            <TaskTemplateFormFields responsibles={responsibles} supervisors={supervisors} />
            <SubmitButton
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45"
              disabled={!canManageTasks}
              icon={<Save size={16} />}
              pendingLabel="Creando..."
            >
              Crear tarea
            </SubmitButton>
          </ActionForm>
        </section>
      ) : null}

      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList size={18} className="text-moss" />
          <h3 className="font-semibold text-ink">Plantillas</h3>
        </div>
        <div className="space-y-3">
          {templates.map((template) => (
            <article
              className="rounded-lg border border-ink/10 bg-paper p-3"
              key={template.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{template.name}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        template.active ? "bg-moss/10 text-moss" : "bg-ink/10 text-ink/55"
                      )}
                    >
                      {template.active ? "Activa" : "Pausada"}
                    </span>
                  </div>
                  <p className="text-xs text-ink/60">
                    {template.recurrence.kind} · {template.timeWindow.startTime}-
                    {template.timeWindow.endTime}
                  </p>
                </div>
                <span className="rounded-full bg-moss/10 px-2 py-1 text-xs font-semibold text-moss">
                  +{template.rewardPoints}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionForm action={setTaskTemplateActive}>
                  <input name="templateId" type="hidden" value={template.id} />
                  <input
                    name="active"
                    type="hidden"
                    value={template.active ? "false" : "true"}
                  />
                  <SubmitButton
                    className="flex h-9 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm"
                    icon={template.active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                    spinnerSize={15}
                  >
                    {template.active ? "Pausar" : "Activar"}
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={deleteTaskTemplate}>
                  <input name="templateId" type="hidden" value={template.id} />
                  <SubmitButton
                    className="flex h-9 items-center gap-2 rounded-lg border border-coral/25 bg-white px-3 text-xs font-semibold text-coral shadow-sm"
                    icon={<Trash2 size={15} />}
                    pendingLabel="Borrando..."
                    spinnerSize={15}
                  >
                    Borrar
                  </SubmitButton>
                </ActionForm>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-moss">
                  Editar tarea
                </summary>
                <ActionForm action={updateTaskTemplate} className="mt-3 space-y-4">
                  <input name="templateId" type="hidden" value={template.id} />
                  <TaskTemplateFormFields
                    assignedResponsibleIds={assignmentsByTemplate.get(template.id) ?? []}
                    responsibles={responsibles}
                    supervisors={supervisors}
                    template={template}
                  />
                  <SubmitButton
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-45"
                    disabled={!canManageTasks}
                    icon={<Save size={16} />}
                    pendingLabel="Guardando..."
                  >
                    Guardar cambios
                  </SubmitButton>
                </ActionForm>
              </details>
            </article>
          ))}
          {templates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink/15 bg-paper/70 p-4 text-center text-sm text-ink/50">
              Sin tareas creadas
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-moss" />
            <h3 className="font-semibold text-ink">Usuarios</h3>
          </div>
          <button
            className="grid size-9 place-items-center rounded-lg border border-ink/10 bg-white text-ink shadow-sm"
            onClick={() => setShowCreateUserForm((current) => !current)}
            title={showCreateUserForm ? "Cerrar formulario" : "Crear usuario"}
            type="button"
          >
            <UserPlus size={17} />
          </button>
        </div>

        {showCreateUserForm ? (
          <ActionForm
            action={createManagedUser}
            className="mb-4 rounded-lg border border-ink/10 bg-paper p-3"
            onSuccess={() => setShowCreateUserForm(false)}
          >
            <div className="mb-3 flex items-center gap-2">
              <UserPlus size={17} className="text-moss" />
              <h4 className="text-sm font-semibold text-ink">Nuevo usuario</h4>
            </div>
            <UserFormFields requirePassword />
            <SubmitButton
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white"
              icon={<Save size={16} />}
              pendingLabel="Creando..."
            >
              Crear usuario
            </SubmitButton>
          </ActionForm>
        ) : null}

        <div className="space-y-3">
          {profiles.map((profile) => (
            <article
              className="rounded-lg border border-ink/10 bg-paper p-3"
              key={profile.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid size-9 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: profile.avatarColor }}
                  >
                    {profile.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{profile.fullName}</p>
                    <p className="truncate text-xs text-ink/55">{profile.email}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-ink">
                  {roleLabels[profile.role]}
                </span>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-moss">
                  Editar usuario
                </summary>
                <ActionForm action={updateManagedUser} className="mt-3">
                  <input name="userId" type="hidden" value={profile.id} />
                  <UserFormFields profile={profile} />
                  <SubmitButton
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white"
                    icon={<Save size={16} />}
                    pendingLabel="Guardando..."
                  >
                    Guardar usuario
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={deleteManagedUser} className="mt-2">
                  <input name="userId" type="hidden" value={profile.id} />
                  <SubmitButton
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-coral/25 bg-white px-4 text-sm font-semibold text-coral shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={profile.id === viewerProfile.id}
                    icon={<Trash2 size={16} />}
                    pendingLabel="Borrando..."
                  >
                    {profile.id === viewerProfile.id ? "No puedes borrarte" : "Borrar usuario"}
                  </SubmitButton>
                </ActionForm>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <AdminStat label="Supervisores" value={supervisors.length} />
        <AdminStat label="Responsables" value={responsibles.length} />
      </section>
    </div>
  );
}

function UserFormFields({
  profile,
  requirePassword
}: {
  profile?: Profile;
  requirePassword?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-sm font-semibold text-ink">Nombre</span>
        <input
          className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
          defaultValue={profile?.fullName}
          name="fullName"
          required
          type="text"
        />
      </label>

      {profile ? null : (
        <>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Email</span>
            <input
              autoComplete="email"
              className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Contrasena inicial</span>
            <input
              autoComplete="new-password"
              className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
              minLength={6}
              name="password"
              required={requirePassword}
              type="password"
            />
          </label>
        </>
      )}

      <label className="block">
        <span className="text-sm font-semibold text-ink">Iniciales</span>
        <input
          className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm uppercase text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
          defaultValue={profile?.initials}
          maxLength={3}
          name="initials"
          type="text"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Color</span>
        <input
          className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-2 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
          defaultValue={profile?.avatarColor ?? "#3e6b4f"}
          name="avatarColor"
          type="color"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-semibold text-ink">Rol</span>
        <select
          className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
          defaultValue={profile?.role ?? "responsable"}
          name="role"
        >
          <option value="responsable">Responsable</option>
          <option value="supervisor">Supervisor</option>
          <option value="admin">Admin</option>
        </select>
      </label>
    </div>
  );
}

function TaskTemplateFormFields({
  assignedResponsibleIds = [],
  responsibles,
  supervisors,
  template
}: {
  assignedResponsibleIds?: string[];
  responsibles: Profile[];
  supervisors: Profile[];
  template?: TaskTemplate;
}) {
  const selectedWeekdays = template?.recurrence.weekdays ?? [];
  const validFrom = template?.validFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const validUntil = template?.validUntil?.slice(0, 10) ?? "";
  const [recurrenceKind, setRecurrenceKind] = useState<RecurrenceKind>(
    template?.recurrence.kind ?? "diaria"
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-ink">Nombre</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={template?.name}
            name="name"
            required
            type="text"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-ink">Descripcion</span>
          <textarea
            className="mt-1 min-h-20 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={template?.description}
            name="description"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Tipo</span>
          <select
            className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={template?.kind ?? "accion"}
            name="kind"
          >
            <option value="accion">Accion</option>
            <option value="puntuacion">Puntuacion</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Puntos</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={template?.rewardPoints ?? 10}
            min={0}
            name="rewardPoints"
            required
            type="number"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Inicio</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={template?.timeWindow.startTime ?? "17:00"}
            name="timeStart"
            required
            type="time"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Fin</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={template?.timeWindow.endTime ?? "18:00"}
            name="timeEnd"
            required
            type="time"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">Desde</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={validFrom}
            name="validFrom"
            required
            type="date"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-ink">
            Hasta <span className="font-normal text-ink/45">(opcional)</span>
          </span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={validUntil}
            name="validUntil"
            type="date"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-ink">Recurrencia</span>
        <select
          className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
          name="recurrenceKind"
          onChange={(event) => setRecurrenceKind(event.target.value as RecurrenceKind)}
          value={recurrenceKind}
        >
          <option value="diaria">Diaria</option>
          <option value="semanal">Semanal</option>
          <option value="mensual">Mensual</option>
        </select>
      </label>

      {recurrenceKind === "mensual" ? (
        <label className="block">
          <span className="text-sm font-semibold text-ink">Dia mensual (1-31)</span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
            defaultValue={template?.recurrence.monthDay ?? 1}
            max={31}
            min={1}
            name="monthDay"
            required
            type="number"
          />
        </label>
      ) : null}

      {recurrenceKind === "semanal" ? (
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Dias semanales</legend>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {weekdayOptions.map((day) => (
              <label
                className="flex h-9 items-center justify-center gap-1 rounded-lg border border-ink/10 bg-white text-xs font-semibold text-ink"
                key={day.value}
              >
                <input
                  defaultChecked={selectedWeekdays.includes(day.value)}
                  name="weekdays"
                  type="checkbox"
                  value={day.value}
                />
                {day.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="block">
        <span className="text-sm font-semibold text-ink">Supervisor</span>
        <select
          className="mt-1 h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
          defaultValue={template?.supervisorId ?? supervisors[0]?.id}
          name="supervisorId"
          required
        >
          {supervisors.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.fullName} · {roleLabels[profile.role]}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Responsables</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {responsibles.map((profile) => (
            <label
              className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink"
              key={profile.id}
            >
              <input
                defaultChecked={assignedResponsibleIds.includes(profile.id)}
                name="responsibleIds"
                type="checkbox"
                value={profile.id}
              />
              <span
                className="grid size-7 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: profile.avatarColor }}
              >
                {profile.initials}
              </span>
              <span className="min-w-0 truncate">{profile.fullName}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input defaultChecked={template?.active ?? true} name="active" type="checkbox" />
        Activa
      </label>
    </>
  );
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-moss">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
