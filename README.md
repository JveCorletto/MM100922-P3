# EduTrack AI — Plataforma Educativa Inteligente (Next.js + Supabase)

> Monorepo simple (Next.js 14 App Router) con autenticación, roles, cursos, progreso, chat por curso, IA para resúmenes y emisión de diplomas en PDF. Lista para desplegar con Supabase.

## 🧰 Stack
- **Next.js 14 (App Router)** + **React 18** + **TypeScript**
- **Supabase** (Auth, Postgres, RLS, Realtime)
- **Tailwind CSS** (+ `@tailwindcss/typography`), `react-hot-toast`
- **pdf-lib** (+ `@pdf-lib/fontkit`) para diplomas PDF
- **@google/generative-ai** (opcional) para IA (resúmenes/assistant)
- `next-themes`, `react-hook-form`, `react-markdown`, `zod`

## ✨ Funcionalidades
### Autenticación y seguridad
- Registro/Login con Supabase y perfil en `public.profiles`
- **Roles**: `student`, `tutor`, `admin` (UI y permisos por rol)
- **2FA TOTP** desde **Settings → Security**  
  - UI: `components/TotpModal.tsx` y `app/settings/security/page.tsx`
  - Flujo: listar factor, activar (enrolar), verificar código, desactivar
  - Persistencia de sesión vía `middleware.ts` con cookies de Supabase

### Cursos, lecciones y materiales
- Listado de cursos (`/courses`) con búsqueda
- Detalle de curso: `/course/[id]`
- Lecciones anidadas: `/course/[id]/lesson/[lessonId]`
- Materiales (links/archivos) y **apertura controlada** (`OpenMaterialButton`)
- **Progreso por lección** y **estado de curso completado**
- **Inscripción** de estudiantes (`components/EnrollButton.tsx`, `app/api/enroll/route.ts`)
- **Gestión para tutores**:
  - Crear/editar curso y lecciones (`CourseActions`, `LessonModal`, `EditCourseButton`)
  - **Publicar/ocultar** cursos (flag `is_published`)
  - **Perfil de tutor** (`TutorProfileManagerModal`)

### Chat por curso
- Canal por curso con historial (`components/ChatBox.tsx`, `components/CourseChat.tsx`)
- Endpoint: `app/api/chat/course-assistant/route.ts` (assistant IA opcional)

### IA (resúmenes)
- Endpoint `POST /api/ia/summary`  
  - Si defines `GEMINI_API_KEY` u `OPENAI_API_KEY`, usa IA real
  - Si no, retorna *mock* útil para desarrollo

### Diplomas en PDF
- UI: `components/DiplomaGenerator.tsx`
- API: `POST /api/generate-certificate` genera y devuelve un PDF (in‑memory) con bordes decorativos y texto (curso, alumno, fecha)
- Registra emisión en `course_diplomas`

## 🗃️ Esquema de base de datos (Supabase/Postgres)
Tablas principales detectadas en `supabase/schema.sql`:
- `public.profiles` — usuario, `role`, `full_name`, `avatar_url`
- `public.courses` — curso, `tutor_id`, metadata y `is_published`
- `public.lessons` — lecciones por curso, orden, contenido/recursos
- `public.enrollments` — relación estudiante↔curso
- `public.messages` — chat por curso (autor, contenido, timestamps)
- `public.orders` — base para compras (buyer_id, course_id, estado) *(opcional en MVP)*

> **RLS y Policies**: 14 políticas activas. Lectura/escritura acotada por `auth.uid()` y rol; tutores solo ven/gestionan sus recursos; estudiantes, los suyos. *Admins* con amplitud de lectura. (Ver `supabase/schema.sql`).

## 🔌 API Endpoints
- `POST /api/enroll` — inscribir estudiante en un curso (requiere `role=student` y sesión)
- `GET /api/courses` — listado/búsqueda de cursos (paginable/filtrable)
- `POST /api/generate-certificate` — genera diploma PDF (requiere sesión)
- `POST /api/chat/course-assistant` — assistant del curso (IA opcional)
- `POST /api/ia/summary` — resumen de texto (IA real o *mock*)

## 🧭 Rutas de la App (App Router)
- `/` — Home
- `/login`, `/register`, `/profile`
- `/settings/security` — 2FA TOTP
- `/courses` — catálogo
- `/course/[id]` — detalle del curso
- `/course/[id]/lesson/[lessonId]` — lección
- `/chat/[courseId]` — chat del curso
- `/dashboard` — selector por rol
  - `/dashboard/student`
  - `/dashboard/tutor`, `/dashboard/tutor/course/[id]`
  - `/dashboard/admin`

## 🔐 Variables de entorno
Crea `.env.local` con:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # para scripts/seed o tareas admin (no en cliente)
# IA (opcional, define al menos una)
GOOGLE_API_KEY=
```
> Usa el **anon key** en cliente y **service role** solo en backend/CLI.

## 🚀 Puesta en marcha (local)
```bash
# 1) Dependencias
npm install

# 2) Variables de entorno
cp .env.local.example .env.local
# completa SUPABASE_URL / ANON_KEY desde tu proyecto

# 3) Base de datos
# Opción A: Supabase proyecto en la nube → copiar `supabase/schema.sql`
# Opción B: Supabase local → ejecutar el SQL en el dashboard SQL editor

# 4) Desarrollo
npm run dev
```

## 🧱 Componentes clave
- `RoleGate.tsx`, `Protected.tsx` — guardias por rol y sesión
- `CourseActions.tsx` — gestión de curso (publicar, progreso, etc.)
- `LessonModal.tsx` — CRUD de lecciones
- `EnrollButton.tsx` — flujo de inscripción
- `CourseChat.tsx`, `ChatBox.tsx` — chat por curso
- `TotpModal.tsx` — activación/verificación/desactivación TOTP
- `DiplomaGenerator.tsx` — trigger para PDFs
- `UserMenu.tsx` — menú responsivo con estado de sesión

## 🧪 Notas de prueba
- Flujos sensibles (inscripción, edición, TOTP) requieren sesión válida
- Para probar IA sin clave, el endpoint de *summary* responde un *mock* útil
- Asegura `is_published=true` para ver cursos en el catálogo público

## 🗺️ Roadmap sugerido
- Suscripciones/pagos reales (usar `orders`), webhooks
- Storage con **signed URLs** para materiales privados
- Métricas de aprendizaje, rubricas por lección y feedback del tutor
- Notificaciones Realtime para chat/progreso

---

### Créditos
EduTrack AI — MVP académico orientado a **“Analizando las necesidades de Hardware y Software”** con enfoque en arquitectura mínima viable, seguridad con RLS y trazabilidad de aprendizaje.

---

### Créditos tecnológicos
Next.js 14 · Supabase · TypeScript · TailwindCSS · react-hot-toast · @google/generative-ai · pdf-lib

---

## 📄 Licencia
© 2025 — Uso académico/formativo (UFG) por André Martínez