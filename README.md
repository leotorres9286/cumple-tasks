# Cumple Tasks

PWA mobile-first para gestionar tareas del hogar y habitos con roles, Kanban, puntuacion, area administrativa y estructura preparada para Supabase.

## Stack

- Next.js App Router
- React, TypeScript, Tailwind CSS
- Framer Motion
- Supabase Auth, PostgreSQL y RLS
- PWA con manifest y service worker basico
- Docker y Vercel-ready

## Roles

- `admin`: crea tareas, asigna responsables/supervisor y gestiona usuarios.
- `supervisor`: revisa tareas finalizadas, las marca como `incorrecta` o `verificada` y puede dejar feedback.
- `responsable`: avanza sus tareas asignadas hasta `finalizada`.

## Gestion Admin

La pestana `Admin` permite crear, editar, pausar/reactivar y borrar plantillas de tarea en Supabase. Cada plantilla define tipo, ventana horaria, recurrencia, puntos, supervisor y responsables asignados.

Tambien permite crear usuarios, editar su nombre, iniciales, color y rol, y borrar usuarios. Crear o borrar usuarios usa Supabase Auth Admin, por lo que requiere `SUPABASE_SERVICE_ROLE_KEY` configurada en el servidor.

El seed local crea:

- Email: `admin@cumple.tasks`
- Password: `pqlamz12..`

## Modelo

El dominio separa `task_templates` y `task_occurrences`.

- `task_templates`: definicion recurrente de la tarea.
- `task_occurrences`: instancia de una tarea para un dia concreto.
- `task_assignments`: uno o mas responsables por plantilla.
- `task_notes`: historial de notas internas, comentarios de responsables y feedback de supervisor.
- `notification_events`: eventos para simular notificaciones realtime.

## Desarrollo Local

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env`:

```bash
cp .env.example .env
```

3. Arranca Next.js:

```bash
npm run dev
```

La app protege `/` con Supabase Auth. Usa:

- `/login` para email/password o Google OAuth.
- `/registro` para crear una cuenta nueva.
- `/auth/callback` como callback OAuth/email.

Las altas desde `/registro` crean perfiles con rol `responsable`. El rol `admin` debe asignarse desde seed, SQL o panel de Supabase.
Puedes desactivar el registro publico con `PUBLIC_SIGNUP_ENABLED=false`. Esto bloquea `/registro` y su Server Action, pero no afecta a la creacion de usuarios desde la pestana `Admin`, que usa `SUPABASE_SERVICE_ROLE_KEY`.

La pantalla principal todavia usa datos mock para poder validar UX mientras se conectan las queries de tareas.

## Supabase Local

1. Instala Supabase CLI.
2. Inicializa o enlaza el proyecto si hace falta:

```bash
supabase init
```

3. Arranca Supabase local:

```bash
supabase start
```

4. Aplica migraciones y seed:

```bash
supabase db reset
```

5. Copia `API URL` y `anon key` al `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Google OAuth

En Supabase:

1. Ve a Authentication > Providers.
2. Activa Google.
3. Configura Client ID y Client Secret desde Google Cloud.
4. Anade estas URLs de redireccion:

```text
http://localhost:3000/auth/callback
https://TU_DOMINIO.vercel.app/auth/callback
```

## Despliegue Supabase Hosted

1. Crea un proyecto nuevo en Supabase.
2. Ejecuta la migracion `supabase/migrations/20260708000000_initial_schema.sql` desde el SQL Editor o con CLI enlazada:

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

3. Para crear el admin inicial en hosted, usa una de estas rutas:

- Crear el usuario desde Authentication > Users y luego actualizar `public.profiles.role = 'admin'`.
- Ejecutar `supabase/seed.sql` solo si tu entorno permite escribir en el schema `auth`.

## Despliegue Vercel

1. Importa el repo en Vercel.
2. Define variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://TU_APP.vercel.app
PUBLIC_SIGNUP_ENABLED=true
```

3. Build command:

```bash
npm run build
```

4. Output: Next.js default.

## Docker

```bash
docker compose up --build
```

La imagen espera que exista `.env`.

## Siguiente Paso Tecnico

La UI actual usa datos mock tipados. Para conectar Supabase, sustituye las lecturas de `lib/mock-data.ts` por queries en Server Components o Server Actions y usa la tabla `notification_events` con Supabase Realtime para los toasts del supervisor.
