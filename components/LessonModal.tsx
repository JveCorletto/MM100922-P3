"use client"
import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"

export type LessonForm = {
  title: string
  video_url: string
  body_md: string
  file: File | null
}

export default function LessonModal({
  open,
  mode,
  initial,
  onCancel,
  onSave,
  saving = false,
}: {
  open: boolean
  mode: "create" | "edit"
  initial?: Partial<LessonForm>
  saving?: boolean
  onCancel: () => void
  onSave: (values: LessonForm) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [video, setVideo] = useState(initial?.video_url ?? "")
  const [body, setBody] = useState(initial?.body_md ?? "")
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "")
      setVideo(initial?.video_url ?? "")
      setBody(initial?.body_md ?? "")
      setFile(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#121826] rounded-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto p-4 md:p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h3 className="text-lg md:text-xl font-semibold">{mode === "create" ? "Nueva lección" : "Editar lección"}</h3>
          <button className="btn text-sm md:text-base w-full md:w-auto" onClick={onCancel}>
            Cerrar
          </button>
        </div>

        <label className="text-sm opacity-80">Título</label>
        <input
          className="input text-sm md:text-base"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
        />

        <label className="text-sm opacity-80">Video (iframe o https://www.youtube.com/embed/...)</label>
        <input
          className="input text-sm md:text-base"
          value={video}
          onChange={(e) => setVideo(e.target.value)}
          placeholder="https://www.youtube.com/embed/..."
        />

        <div>
          <div className="text-sm opacity-80">Material (PDF opcional)</div>
          <input
            type="file"
            accept="application/pdf"
            className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {mode === "edit" && !file && (
            <div className="text-xs opacity-70 mt-1">Si no eliges un PDF, se mantendrá el actual.</div>
          )}
        </div>

        <label className="text-sm opacity-80">Contenido (Markdown)</label>
        <textarea
          className="input h-24 md:h-40 text-sm md:text-base"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe el contenido en Markdown..."
        />

        <div>
          <div className="text-sm opacity-80 mb-1">Vista previa</div>
          <div className="card prose prose-invert max-w-none text-sm md:text-base overflow-x-auto">
            <ReactMarkdown>{body || "*(sin contenido)*"}</ReactMarkdown>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 justify-end pt-2">
          <button className="btn text-sm md:text-base w-full md:w-auto" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="btn text-sm md:text-base w-full md:w-auto"
            disabled={saving || !title.trim()}
            onClick={() => onSave({ title, video_url: video, body_md: body, file })}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}