"use client";
import { useState } from "react";

export default function ConfirmPasswordModal({
    open, onClose, onConfirm, loading,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: (password: string) => Promise<void>;
    loading?: boolean;
}) {
    const [password, setPassword] = useState("");

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-4">
                <h2 className="text-lg font-semibold text-black">Confirmar contraseña</h2>
                <p className="text-sm text-gray-600">
                    Ingresa tu contraseña para guardar los cambios del perfil.
                </p>
                <input type="password" className="input input-bordered w-full" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="flex justify-end gap-2">
                    <button className="btn btn-primary" onClick={() => onConfirm(password)} disabled={loading || password.length < 6} >
                        {loading ? "Guardando..." : "Confirmar"}
                    </button>
                    <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}