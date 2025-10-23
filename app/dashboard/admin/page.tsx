import RoleGate from '@/components/RoleGate'

export default function AdminDash(){
  return (
    <RoleGate allow={['admin']}>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Dashboard — Admin</h1>
        <p>Resumen de plataforma: usuarios, cursos, inscripciones.</p>
        {/* Aquí puedes listar métricas globales y moderación */}
      </div>
    </RoleGate>
  )
}