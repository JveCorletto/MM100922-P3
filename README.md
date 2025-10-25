# **EduTrack AI — MVP (Next.js + Supabase + TOTP)**

Plataforma web educativa con autenticación segura, gestión de cursos, roles diferenciados (Administrador, Tutor y Estudiante), lecciones con materiales descargables y control de progreso.
Incluye autenticación multifactor (TOTP), chat en tiempo real por curso y dashboard independiente por rol.

Desarrollada con **Next.js 14**, **Supabase**, **TypeScript**, **TailwindCSS** y **React Hot Toast**.

---

## 🚀 **1. Objetivo general**

EduTrack AI permite que tutores publiquen cursos y gestionen sus lecciones (con videos, materiales y markdown), mientras los estudiantes se inscriben, visualizan su progreso y acceden al contenido de forma controlada.
El sistema incorpora seguridad reforzada mediante autenticación multifactor (TOTP).

---

## 🧱 **2. Tecnologías principales**

| Tecnología                             | Uso                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- |
| **Next.js 14 (App Router)**            | Frontend React + SSR/SSG                                                   |
| **TypeScript**                         | Tipado estático para consistencia y autocompletado                         |
| **Supabase**                           | Backend completo: autenticación, base de datos (PostgreSQL), storage y RLS |
| **TailwindCSS**                        | Estilos utilitarios y diseño responsivo                                    |
| **React Hot Toast**                    | Notificaciones visuales de acciones del usuario                            |
| **React Markdown**                     | Renderizado del contenido de lecciones                                     |
| **Vercel**                             | Deploy automatizado del frontend                                           |
| **Supabase Realtime / Edge Functions** | Chat en tiempo real y funciones RPC para lógica compleja                   |

---

## ⚙️ **3. Estructura del sistema**

### **Roles**

* **Administrador:**

  * Gestiona publicación/ocultamiento de cursos.
  * Visualiza todos los usuarios.
  * Accede a todos los dashboards.

* **Tutor:**

  * Crea, edita y elimina cursos.
  * Administra lecciones (videos, materiales PDF, contenido en markdown).
  * Reordena o publica cursos.
  * No puede inscribirse como estudiante.

* **Estudiante:**

  * Se inscribe en cursos publicados.
  * Avanza en las lecciones en orden (bloqueo secuencial).
  * Puede marcar lecciones como completadas.
  * Visualiza su progreso en porcentaje.

---

## 🔐 **4. Autenticación y seguridad**

### **Flujo de login**

* Inicio de sesión con **correo + contraseña**.
* Opción de login sin contraseña mediante **Magic Link** (correo).
* Si el usuario activa la autenticación TOTP, deberá ingresar un **código de 6 dígitos** generado por su app autenticadora.

### **TOTP (Two-Factor Authentication)**

* Configurable desde `/settings/security`.
* Usa `supabase.auth.mfa` para enrolar, verificar y desactivar.
* Durante la inscripción a un curso, si el estudiante no tiene TOTP activo, **no puede inscribirse** hasta habilitarlo.
* Compatible con Google Authenticator, Authy, Microsoft Authenticator.

---

## 🧩 **5. Módulos principales**

### **1. Autenticación**

* Rutas `/login` y `/register`.
* Verificación de rol y sesión activa.
* Middleware redirige si el usuario ya está autenticado.

### **2. Cursos**

* `/courses`: lista de cursos públicos.
* `/course/[id]`: detalle del curso con:

  * Video principal (iframe o URL embed).
  * Lista de lecciones.
  * Acciones condicionales por rol:

    * **Tutor (propietario):** botón *Editar curso*.
    * **Tutor (no propietario):** no puede inscribirse.
    * **Estudiante inscrito:** botón *Ver progreso / Continuar*.
    * **Administrador:** puede *ocultar o publicar* curso.

### **3. Lecciones**

* Contenido en **Markdown**.
* Video adicional por lección (iframe embed).
* Material adjunto (PDF almacenado en Supabase Storage).
* Control de progreso: el estudiante no puede ver la siguiente lección sin completar la anterior.

### **4. Dashboard**

* `/dashboard/student`: muestra cursos inscritos y progreso (% lecciones completadas).
* `/dashboard/tutor`: administración de cursos y lecciones (en modales).
* `/dashboard/admin`: vista global de usuarios y control de publicación.

### **5. Chat**

* Comunicación en tiempo real entre inscritos de un curso.
* Basado en **Supabase Realtime** y asociado a cada `courseId`.

### **6. Seguridad**

* `/settings/security`: configuración de autenticación multifactor (TOTP).
* Escaneo de QR, verificación y desactivación con feedback visual.

---

## 🧠 **6. Flujo IA mínima**

Endpoint experimental `POST /api/ia/summary`:

* Si no hay clave (`OPENAI_API_KEY` o `GEMINI_API_KEY`): responde con resumen simulado.
* Si se incluye clave: se conecta al proveedor real.
  Usado como ejemplo de integración IA sin costos en el MVP.

---

## 📂 **7. Estructura del proyecto**

```
/app
 ├── (auth)
 │    ├── login/
 │    └── register/
 ├── courses/
 │    ├── [id]/
 │    │    └── page.tsx
 ├── dashboard/
 │    ├── student/
 │    └── tutor/
 ├── settings/
 │    └── security/
 ├── api/
 │    ├── ia/
 │    ├── enroll/
 │    └── ...
/components
 ├── CourseActions.tsx
 ├── EnrollButton.tsx
 ├── ConfirmModal.tsx
 ├── LessonModal.tsx
 ├── RoleGate.tsx
 ├── ChatBox.tsx
 └── ...
/lib
 └── supabaseClient.ts
/supabase
 ├── schema.sql
 ├── policies.sql
 └── functions/
.env.local.example
README.md
```

---

## 🧾 **8. Configuración de entorno**

Variables necesarias en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<service-role-key> # para funciones RPC opcionales
```

---

## 🧑‍💻 **9. Instalación y ejecución**

```bash
# Instalar dependencias
npm install

# Ejecutar entorno local
npm run dev

# Compilar para producción
npm run build
npm start
```

---

## ☁️ **10. Deploy recomendado (Vercel + Supabase)**

1. Subir el repositorio a GitHub.
2. Crear proyecto en **Vercel**, conectar el repo.
3. Agregar variables de entorno desde Supabase.
4. Crear bucket `materials` en Supabase Storage (privado).
5. Ejecutar `schema.sql` en el editor SQL de Supabase.

---

## 📚 **11. Características destacadas**

* ✅ Autenticación por correo y magic link
* 🔐 Verificación 2FA (TOTP) con QR
* 🧑‍🏫 Roles dinámicos y paneles separados
* 📚 Gestión completa de cursos y lecciones
* 📦 Almacenamiento seguro de materiales PDF
* 📈 Progreso de estudiante por curso
* 💬 Chat en tiempo real
* 🎥 Videos integrados por iframe
* 🌙 Modo oscuro por defecto
* ⚡ Interfaz rápida y responsiva (Tailwind + React 18)

---

## 🧩 **12. Funciones RPC personalizadas**

* `create_lesson` → inserta una nueva lección asociada a curso y tutor.
* `update_lesson` → actualiza título, contenido, video o material.
* `delete_lesson` → elimina registro y material asociado.
* `move_lesson` → cambia el orden de las lecciones.
* `course_progress_for_student` → devuelve porcentaje completado y próxima lección.

---

## 🛡️ **13. Políticas de seguridad (RLS)**

* Solo el **tutor propietario** puede modificar sus cursos y lecciones.
* Solo el **estudiante autenticado** puede ver sus inscripciones y progreso.
* Los materiales (bucket `materials`) requieren **signed URLs** para acceso temporal.

---

## 🧾 **14. Licencia**

MIT © 2025 — Proyecto académico con fines educativos.