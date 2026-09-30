export default function SetupBanner() {
  return (
    <div className="w-full rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold uppercase tracking-wider text-xs mb-2">
        Supabase sin configurar
      </p>
      <p className="mb-3">
        Copia <code className="rounded bg-amber-100 px-1">.env.example</code> a{' '}
        <code className="rounded bg-amber-100 px-1">apps/web/.env</code> y rellena la URL y la
        anon key de tu proyecto. Luego reinicia el servidor de desarrollo.
      </p>
      <ol className="list-decimal ml-5 space-y-1">
        <li>Crea un proyecto en supabase.com.</li>
        <li>Ejecuta <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code> en el SQL Editor.</li>
        <li>Habilita Anonymous sign-ins en Authentication → Providers.</li>
        <li>Crea el usuario admin y ejecuta <code className="rounded bg-amber-100 px-1">supabase/make_admin.sql</code>.</li>
      </ol>
    </div>
  );
}
