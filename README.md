# **EduTrack AI — Plataforma Educativa Inteligente (Next.js + Supabase)**

**EduTrack AI** es una aplicación web educativa con autenticación multifactor (TOTP), gestión de cursos, progreso de estudiantes, dashboards personalizados y un entorno de aprendizaje moderno con chat en tiempo real.
Desarrollada con **Next.js 14**, **Supabase**, **TypeScript**, **TailwindCSS** y **React Hot Toast**.

---

## 🧭 **1. Objetivo del proyecto**

Facilitar el aprendizaje en línea mediante una plataforma segura, dinámica y colaborativa que permita:

* A los **tutores**, crear y gestionar cursos completos con lecciones y materiales.
* A los **estudiantes**, inscribirse, avanzar y llevar registro de su progreso.
* A los **administradores**, mantener control sobre la visibilidad y seguridad del sistema.

---

## ⚙️ **2. Tecnologías y herramientas**

| Tecnología                  | Uso principal                                          |
| --------------------------- | ------------------------------------------------------ |
| **Next.js 14 (App Router)** | Frontend React con SSR/SSG                             |
| **Supabase**                | Backend (PostgreSQL, Auth, Storage, Realtime, RPCs)    |
| **TypeScript**              | Tipado estático y robustez en el código                |
| **TailwindCSS**             | Interfaz responsiva y en dark mode                     |
| **React Hot Toast**         | Notificaciones visuales                                |
| **React Markdown**          | Renderizado de contenido educativo en formato markdown |
| **Vercel**                  | Deploy automatizado del frontend                       |
| **Supabase MFA (TOTP)**     | Autenticación en dos pasos                             |
| **Supabase Storage**        | Almacenamiento seguro de materiales (PDFs)             |

---

## 🔐 **3. Autenticación y seguridad**

* Inicio de sesión con **correo y contraseña**.
* Opción de inicio mediante **Magic Link (correo)**.
* **Verificación en dos pasos (TOTP)** con Google Authenticator o Authy.
* Si un estudiante intenta inscribirse a un curso sin tener TOTP activado, el sistema le obliga a activarlo antes.
* Todas las tablas cuentan con **Row-Level Security (RLS)** y funciones helper (`is_admin()`, `is_tutor()`, `is_enrolled()`).

---

## 👤 **4. Roles y permisos**

| Rol               | Permisos principales                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------- |
| **Administrador** | Publicar/ocultar cursos, acceder a todos los dashboards, supervisar seguridad.              |
| **Tutor**         | Crear, editar y eliminar cursos y lecciones, subir materiales, reordenar contenido.         |
| **Estudiante**    | Inscribirse, completar lecciones en orden, visualizar progreso y acceder al chat del curso. |

---

## 🧩 **5. Funcionalidades principales**

### 🎓 **Cursos**

* Vista pública `/courses` con todos los cursos publicados.
* Cada curso tiene:

  * Descripción, video principal (iframe), y lista de lecciones.
  * Validación según rol:

    * Tutor (dueño): botón *Editar curso*.
    * Tutor (externo): sin acceso a inscripción.
    * Estudiante inscrito: *Continuar curso / Ver progreso*.
    * Admin: *Publicar / Ocultar curso*.

### 📘 **Lecciones**

* Cada lección incluye:

  * Título, video, contenido markdown y material PDF.
  * Secuencia controlada: el estudiante no puede avanzar sin completar la anterior.
* CRUD completo desde dashboard de tutor mediante modales.
* Los materiales se almacenan en el bucket `materials` de Supabase Storage.

### 📊 **Dashboard**

* **Tutor:** administración de cursos, lecciones, materiales y reordenamiento.
* **Estudiante:** lista de cursos inscritos con porcentaje de progreso y acceso directo.
* **Admin:** control total del catálogo y usuarios.

### 💬 **Chat por curso**

* Implementado con Supabase Realtime.
* Solo accesible por inscritos, tutores o administradores.

### 🧠 **Módulo IA (demo)**

* Endpoint `/api/ia/summary` que devuelve un resumen simulado.
* Puede conectarse a Gemini o OpenAI mediante `OPENAI_API_KEY` o `GEMINI_API_KEY`.

---

## 🧱 **6. Estructura del proyecto**

```
/app
 ├── (auth)/login/         → Login con password o Magic Link
 ├── (auth)/register/      → Registro de usuario
 ├── courses/              → Catálogo general
 │    ├── [id]/page.tsx    → Detalle del curso
 │    └── lesson/[id]/     → Lección individual
 ├── dashboard/
 │    ├── student/         → Mis cursos y progreso
 │    └── tutor/           → Administración de cursos y lecciones
 ├── settings/security/    → Configuración MFA (TOTP)
 └── api/
      ├── enroll/          → RPC para inscripciones
      └── ia/summary/      → Endpoint IA

/components
 ├── CourseActions.tsx     → Botones dinámicos según rol
 ├── EnrollButton.tsx      → Manejo de inscripción y TOTP
 ├── LessonModal.tsx       → Modal de creación/edición de lecciones
 ├── ConfirmModal.tsx      → Confirmaciones de borrado
 ├── ChatBox.tsx           → Chat en tiempo real
 ├── RoleGate.tsx          → Control de acceso por rol
 └── OpenMaterialButton.tsx→ Visualización de PDF

/lib
 └── supabaseClient.ts     → Configuración central de Supabase

/supabase
 ├── schema.sql            → Tablas, políticas RLS y funciones RPC
 └── policies.sql          → RLS avanzadas
```

---

## 🧾 **7. Instalación y ejecución**

```bash
npm install
npm run dev
```

Variables en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave_anonima>
SUPABASE_SERVICE_KEY=<clave_service_role>
```

---

## 📜 **8. Funciones RPC personalizadas**

| Función                         | Descripción                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| `create_lesson()`               | Inserta una lección nueva con orden y validación de propietario. |
| `update_lesson()`               | Modifica título, contenido, video o material PDF.                |
| `delete_lesson()`               | Elimina lección y material asociado.                             |
| `move_lesson()`                 | Reordena las lecciones del curso (↑ / ↓).                        |
| `course_progress_for_student()` | Calcula progreso (% y siguiente lección).                        |

---

## 🧠 **9. Seguridad avanzada (RLS)**

Cada tabla usa **Row Level Security**.
Ejemplos:

* Los estudiantes solo pueden ver sus propias inscripciones.
* Los tutores solo pueden editar sus cursos y lecciones.
* Los administradores pueden leer y modificar todo.
* Los materiales (PDF) se acceden únicamente mediante **signed URLs** temporales.

---

## 🧾 **10. Licencia**

© 2025 — Proyecto académico y formativo — **Universidad Francisco Gavidia (UFG)**.