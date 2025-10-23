
# EduTrack AI — MVP (Next.js + Supabase)

MVP funcional con roles Tutor/Estudiante, cursos, inscripciones, chat en tiempo real y “IA mínima” (mock). Deploy recomendado: **Vercel + Supabase** (planes free).

## 1) Requisitos
- Node 20+
- Cuenta Supabase (URL y ANON KEY)
- Vercel (opcional para deploy)

## 2) Configuración
1. Crea un proyecto en Supabase y copia `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. En el SQL Editor de Supabase, pega `supabase/schema.sql` (crea tablas + RLS + policies).
3. En Supabase Storage crea el bucket `materials` (privado) si vas a subir PDFs.
4. Copia `.env.local.example` a `.env.local` y llena las variables.

## 3) Desarrollo
```bash
npm install
npm run dev
```

## 4) Deploy (Vercel)
- Conecta el repo en Vercel y agrega las env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Build & Deploy.

## 5) Rutas principales
- `/` Home
- `/login` Autenticación
- `/courses` Catálogo de cursos publicados
- `/course/[id]` Detalle de curso + Inscripción (MVP)
- `/chat/[courseId]` Chat por curso
- `/dashboard` Panel
  - `/dashboard/tutor` Crear/publicar cursos
  - `/dashboard/student` Mis cursos

## 6) IA mínima
Endpoint `POST /api/ia/summary`:
- Si no hay API key: devuelve un resumen simulado (mock).
- Si agregas `OPENAI_API_KEY` o `GEMINI_API_KEY`: placeholder para IA real.

## 7) Notas
- Asegúrate de activar **RLS** en todas las tablas.
- Este MVP usa video embebido (YouTube no listado) para evitar costos de streaming.
- Inscripción es gratuita (sin pagos) para velocidad del MVP.
