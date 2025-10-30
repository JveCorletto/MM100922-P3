# EduTrack AI — Plataforma educativa con IA (Next.js + Supabase)

Monorepo simple con **Next.js 14 (App Router)** y **Supabase** para construir una plataforma educativa con: autenticación y **roles** (`student`, `tutor`, `admin`), **2FA (TOTP)**, gestión de **cursos y lecciones**, **inscripciones**, **chat** por curso en tiempo real, **asistente IA** por curso (con *mock* de respaldo) y **emisión de diplomas en PDF**. Preparado para desplegar en **Vercel**.

## MVP en Vercel

**Puedes ver su MVP acá:** [**➡️ Demo en Vercel**](https://edutrackia-mm100922.vercel.app/)

---

## 🧰 Stack
- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Supabase**: Auth (email/contraseña, magic link), Postgres, **RLS**, Realtime
- **Tailwind CSS** (+ `@tailwindcss/typography`), `react-hot-toast`
- **pdf-lib** (+ `@pdf-lib/fontkit`) para diplomas
- **@google/generative-ai** (opcional) para resumen/assistant por curso
- `next-themes`, `react-hook-form`, `react-markdown`, `zod`

> Código principal en `app/`, componentes en `components/`, utilidades Supabase en `lib/`, esquema SQL en `supabase/schema.sql` y `SQL/schema.sql`. Diagrama en `InfrastructureDiagram/`.

---

## ✨ Funcionalidades

### 1) Autenticación y seguridad
- Registro nombre+email+contraseña con supabase (varificación de cuenta por correo)
- Login con Supabase (email+password y/o magic link).
- **Roles** en `public.profiles.role`: `student`, `tutor`, `admin` (UI y permisos contextuales).
- **2FA TOTP** desde **Settings → Security**:
  - UI: `components/TotpModal.tsx` y `app/settings/security/page.tsx`.
  - Flujo completo: enrolar, verificar código, desactivar.
  - **Cookies** de sesión vía `middleware.ts` usando `@supabase/ssr`.
- **RLS** (Row Level Security) habilitado con **políticas por tabla** (ver `supabase/schema.sql`).

### 2) Cursos, lecciones y materiales
- Catálogo de cursos `/courses` con **búsqueda** (`components/SearchBar.tsx`).
- Detalle `/course/[id]` con portada, descripción y video.
- **Lecciones** por curso `/course/[id]/lesson/[lessonId]` con cuerpo en **Markdown** y material adjunto.
- **CRUD de lecciones** para tutores (modal `LessonModal.tsx`) y **gestión del curso** (`CourseActions.tsx`, `EditCourseButton.tsx`, `TutorProfileManagerModal.tsx`).
- **Inscripción** a cursos vía `components/EnrollButton.tsx` y API `app/api/enroll/route.ts`.

### 3) Chat dedicado a cada Lección (Realtime)
- Componente `CourseChat.tsx` y `ChatBox.tsx` para **chat en tiempo real** por curso.
- Persistencia en tabla `public.messages` y **suscripciones** con Supabase Realtime.

### 4) Asistente de curso con IA (opcional)
- Endpoint `app/api/chat/course-assistant/route.ts` + `app/api/ia/summary/route.ts`.
- Usa **@google/generative-ai** si `GOOGLE_API_KEY` está configurada; si no, **modo mock** (mensajes de IA de ejemplo).

### 5) Diplomas en PDF
- Endpoint `app/api/generate-certificate/route.ts` y componente `DiplomaGenerator.tsx`.
- Genera **PDF** personalizado (nombre del alumno, curso, fecha) con `pdf-lib` y `@pdf-lib/fontkit`.

### 6) Paneles por rol
- `/dashboard`: enruta a panel por rol.
  - **Admin**: `/dashboard/admin`
  - **Tutor**: `/dashboard/tutor` (gestión de cursos/lecciones)
  - **Student**: `/dashboard/student` (cursos inscritos, progreso)
- **RoleGate** y **Protected** para proteger vistas según rol/sesión.

### 7) Perfil de usuario
- `/profile`: ver/editar perfil, **cambiar contraseña** (modal `ConfirmPasswordModal.tsx`) y gestionar **TOTP**.
- Avatar, nombre y email; persistencia en `public.profiles`.

---

## 🗂️ Estructura principal

```
app/
  api/
    chat/course-assistant/route.ts
    courses/route.ts
    enroll/route.ts
    generate-certificate/route.ts
    ia/summary/route.ts
  chat/[courseId]/page.tsx
  course/[id]/page.tsx
  course/[id]/lesson/[lessonId]/page.tsx
  courses/page.tsx
  dashboard/{admin,student,tutor}/page.tsx
  login/page.tsx
  profile/page.tsx
  register/page.tsx
  settings/security/page.tsx
components/
  CourseCard.tsx, CourseActions.tsx, EditCourseButton.tsx
  EnrollButton.tsx, OpenMaterialButton.tsx, LessonModal.tsx
  CourseChat.tsx, ChatBox.tsx
  DiplomaGenerator.tsx
  Protected.tsx, RoleGate.tsx, UserMenu.tsx
  TotpModal.tsx, TutorProfileManagerModal.tsx
lib/
  supabaseClient.ts, supabaseServer.ts
supabase/
  schema.sql   ← tablas y RLS
SQL/
  schema.sql   ← dump completo (PostgreSQL)
```

Tablas clave (ver `supabase/schema.sql`):
- `public.profiles` (id, full_name, role, avatar_url)
- `public.courses` (tutor_id, title, description, cover_url, video_url, ...)
- `public.lessons` (course_id, title, body_md, material_url, sort_order, ...)
- `public.enrollments` (course_id, student_id, ...)
- `public.messages` (course_id, role, content, ...)
- `public.orders` (buyer_id, ... — opcional, preparado para pagos futuros)

Incluye políticas **RLS** para lectura/escritura por rol/propiedad (self‑service en `profiles`, ownership en `courses/lessons`, etc.).

---

## ⚙️ Variables de entorno

Archivo `.env.local` (usar `.env.local.example` como plantilla):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # requerido para algunas tareas administrativas/cron si se agregan
GOOGLE_API_KEY=              # opcional (activar IA real)
```

> En producción (Vercel): define estas variables en el **Project → Settings → Environment Variables**.  
> `SUPABASE_SERVICE_ROLE_KEY` **no** debe exponerse al cliente (no la uses en el browser).

---

## 🛢️ Base de datos (Supabase)

1. Crea un proyecto en Supabase y **habilita RLS** (por defecto en Supabase).
2. Ejecuta `supabase/schema.sql` en la DB para crear tablas, índices y **políticas RLS**.
3. (Opcional) Importa `SQL/schema.sql` si deseas el dump completo.

**Auth**: se almacenan perfiles en `public.profiles` (1:1 con `auth.users`).  
**Roles**: el campo `role` controla la UI/permiso de rutas y políticas RLS.

---

## ▶️ Desarrollo local

```bash
npm install   # o pnpm i
npm run dev   # o pnpm dev
```

- Servirá en `http://localhost:3000/`.
- Requiere `.env.local` con las variables de Supabase configuradas.
- Si usas IA real, define `GOOGLE_API_KEY`.

---

## 🚀 Despliegue en Vercel

1. Importa el repo en **Vercel**.
2. Define variables de entorno (ver sección arriba).
3. Build & deploy. La **Middleware** ya gestiona cookies de Supabase SSR.
4. **CDN/Edge**: está listo para servir estáticos desde Vercel; ver `InfrastructureDiagram/` para la topología.

---

## 🧪 Endpoints API (App Router)

- `POST /api/courses` — crear cursos (tutor/admin)
- `POST /api/enroll` — inscribir estudiante a curso
- `POST /api/generate-certificate` — generar PDF de diploma
- `POST /api/chat/course-assistant` — chat IA por curso
- `POST /api/ia/summary` — resumen IA de texto dado

> Los endpoints usan el cliente **server** de Supabase cuando es necesario y validan el `role`/propiedad mediante RLS y comprobaciones en código.

---

## 🔐 Rutas protegidas

- **Protected** y **RoleGate** envuelven vistas que requieren sesión/rol.
- `middleware.ts` refresca/sincroniza cookies de Supabase para SSR.

---

## 🧭 Navegación clave

- `/` — landing / inicio
- `/login`, `/register`
- `/profile` — perfil + cambio de contraseña + TOTP
- `/courses` — catálogo + búsqueda
- `/course/[id]` y `/course/[id]/lesson/[lessonId]`
- `/chat/[courseId]` — chat por curso
- `/dashboard`, `/dashboard/{student,tutor,admin}`

---

## 📝 Notas de diseño

- **UI responsive** y *mobile‑friendly* (`use-mobile` para comportamientos).
- **Markdown** soportado en lecciones.
- **Toasts** para feedback instantáneo.
- **Temas** con `next-themes` (modo claro/oscuro).

---

## 📦 Scripts

```json
{
  "dev": "npm run dev",
  "build": "npm build",
  "start": "npm start",
  "lint": "npm lint"
}
```

---


### Créditos y assets
EduTrack AI — MVP académico orientado a **“Analizando las necesidades de Hardware y Software”** con enfoque en arquitectura mínima viable, seguridad con RLS y trazabilidad de aprendizaje.

- Logos en `public/images/` (EduTrack).
- Diagrama de infraestructura en `InfrastructureDiagram/` (Mermaid + PNG).
- Documentación Solicitada en `Documentacion/` (Documento Word con items Solicitados)

---

### Créditos tecnológicos
Next.js 14 · Supabase · TypeScript · TailwindCSS · react-hot-toast · @google/generative-ai · pdf-lib

---

## 📄 Licencia
© 2025 — Uso académico/formativo (UFG) por André Martínez