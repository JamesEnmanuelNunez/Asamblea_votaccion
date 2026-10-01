import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_EMAIL, isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  DUPLICATE_NAME_MESSAGE,
  fetchMyMember,
  isNameTaken,
  registerMember,
  uploadPhoto,
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/Avatar';
import SetupBanner from '@/components/SetupBanner';
import { Gear, PhotoCamera } from '@/components/icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, isAdmin } = useAuth();

  const [name, setName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Redirección si ya hay sesión.
  useEffect(() => {
    if (authLoading || !session) return;
    if (isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }
    let active = true;
    fetchMyMember(session.user.id)
      .then((member) => {
        if (active && member) navigate('/sala', { replace: true });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authLoading, session, isAdmin, navigate]);

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured) return;
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Escribe tu nombre para continuar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Comprueba el nombre ANTES de crear la sesión anónima (evita usuarios huérfanos).
      if (await isNameTaken(cleanName)) throw new Error(DUPLICATE_NAME_MESSAGE);

      let userId = session?.user.id;
      if (!userId) {
        const { data, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        userId = data.user?.id;
      }
      if (!userId) throw new Error('No se pudo iniciar la sesión anónima.');

      let photoUrl: string | null = null;
      if (photoFile) photoUrl = await uploadPhoto(userId, photoFile);

      await registerMember(userId, cleanName, photoUrl);
      navigate('/sala', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo acceder.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminLogin(event: FormEvent) {
    event.preventDefault();
    setAdminSubmitting(true);
    setAdminError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: adminPassword,
      });
      if (authError) throw authError;
      navigate('/admin', { replace: true });
    } catch (cause) {
      setAdminError(cause instanceof Error ? cause.message : 'Contraseña incorrecta.');
    } finally {
      setAdminSubmitting(false);
    }
  }

  return (
    <main className="min-h-full flex items-center justify-center p-6">
      {/* Acceso admin: oculto en móvil, visible en escritorio */}
      <button
        type="button"
        onClick={() => setShowAdmin(true)}
        className="hidden md:flex fixed top-6 right-6 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:border-outline transition"
        aria-label="Configuración de administrador"
      >
        <Gear className="h-4 w-4" />
        Config
      </button>

      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex animate-rise-in flex-col gap-8 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-8">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Iniciar sesión
            </h1>
            <p className="text-sm text-on-surface-variant">
              Ingresa tus datos para continuar
            </p>
          </div>

          <form className="flex flex-col gap-6" onSubmit={handleJoin}>
            <div className="flex flex-col items-center gap-3">
              <label
                htmlFor="profile-photo"
                className="group cursor-pointer flex items-center justify-center"
              >
                {photoPreview ? (
                  <Avatar
                    name={name || 'Foto'}
                    src={photoPreview}
                    className="w-20 h-20 ring-1 ring-outline-variant"
                  />
                ) : (
                  <span className="w-20 h-20 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface-variant group-hover:border-outline group-hover:bg-surface-container transition">
                    <PhotoCamera className="h-7 w-7" />
                  </span>
                )}
              </label>
              <input
                id="profile-photo"
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
              />
              <span className="text-xs text-on-surface-variant">Foto de perfil</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-medium text-on-surface-variant">
                Nombre
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && <p className="text-xs text-error">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !isSupabaseConfigured}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-on-primary transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? 'Accediendo…' : 'Unirse'}
            </button>
          </form>
        </div>

        {!isSupabaseConfigured && <SetupBanner />}
      </div>

      {showAdmin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6">
          <form
            onSubmit={handleAdminLogin}
            className="w-full max-w-xs animate-scale-in bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Acceso administrador
              </h2>
              <p className="text-xs text-on-surface-variant">Introduce la contraseña.</p>
            </div>
            <input
              type="password"
              autoFocus
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {adminError && <p className="text-xs text-error">{adminError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdmin(false);
                  setAdminError(null);
                  setAdminPassword('');
                }}
                className="flex-1 rounded-lg border border-outline-variant py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adminSubmitting}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-50"
              >
                {adminSubmitting ? '…' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
