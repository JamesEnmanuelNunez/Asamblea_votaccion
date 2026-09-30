# 🗳️ Votación de Moción — App Web de Asamblea

Aplicación web en **TypeScript** para realizar votaciones de mociones en tiempo real,
inspirada en el procedimiento de la **Cámara de Diputados de la República Dominicana**
(quórum de mitad + 1 de la matrícula, mayoría simple de votos emitidos — Art. 93, Constitución RD).

---

## 1. Visión general

| Rol | Dispositivo | Acceso | Qué hace |
|---|---|---|---|
| **Participante** | Móvil o PC | Nombre + foto | Espera, vota A Favor / En Contra, ve resultado |
| **Admin** | Solo PC | Contraseña (botón ⚙️ oculto en móvil) | Configura matrícula, inicia/detiene votaciones, ve grid en vivo |

### Flujo de la sesión

```
LOBBY ──(quórum alcanzado → admin inicia)──▶ VOTING ──(timeout / admin detiene)──▶ CONCLUDED
  ▲                                                                              │
  └────────────────────(admin: "Nueva moción")◀──────────────────────────────────┘
```

### Reglas de negocio

- **Matrícula**: número configurable por el admin (ej. 25 miembros).
- **Quórum**: `⌊matrícula / 2⌋ + 1` participantes conectados. Sin quórum, "Iniciar Votación" permanece **bloqueado**.
- **Voto**: 1 por participante por moción; **editable** mientras el tiempo corre (upsert). Solo 2 opciones: A Favor / En Contra. No votar = ausente.
- **Resultado**: Aprobada si `aFavor > enContra` (mayoría simple de emitidos); de lo contrario, Rechazada.
- **Temporizador**: calculado desde `ends_at` (timestamp absoluto en servidor) → todos los clientes ven el mismo reloj sin importar desfases de hora.
- **Historial**: la UI es solo sesión en vivo, pero el schema ya persiste mociones y votos → agregar historial futuro = solo una vista nueva, sin migraciones.

---

## 2. Stack técnico

| Capa | Tecnología | Por qué |
|---|---|---|
| Lenguaje | TypeScript (todo) | Requerimiento del proyecto |
| Frontend | React + Vite + Tailwind CSS | Rápido, móvil-first, HMR |
| Backend / Realtime | **Supabase** (Postgres + Realtime + Storage + Auth) | Sin servidor propio; tiempo real por suscripción a Postgres |
| Monorepo | npm workspaces | `apps/web` + `packages/shared` |

---

## 3. Estructura del monorepo

```
votacion-mocion/
├── package.json                  # workspaces
├── PROYECTO.md                   # este documento
├── apps/
│   └── web/                      # React + Vite + Tailwind
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx           # rutas: /login, /sala, /admin
│       │   ├── lib/supabase.ts   # cliente supabase-js
│       │   ├── hooks/            # useSession, useMembers, useVotes, useCountdown
│       │   ├── pages/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── MemberPage.tsx     # 3 estados: espera / votar / resultado
│       │   │   └── AdminPage.tsx      # dashboard
│       │   └── components/       # MemberCard, VoteButtons, Timer, QuorumBadge...
│       └── ...
└── packages/
    └── shared/                   # tipos y constantes compartidas
        └── src/
            ├── types.ts          # Member, Motion, Vote, SessionStatus
            └── constants.ts      # estados, nombres de tablas/canales
```

---

## 4. Base de datos (Supabase)

### 4.1 Schema SQL

```sql
-- Configuración de la asamblea (fila única)
create table assembly_config (
  id smallint primary key default 1 check (id = 1),
  roster_size int not null default 0,      -- matrícula total
  updated_at timestamptz default now()
);

-- Participantes (id = auth.uid del sign-in anónimo)
create table members (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  photo_url text,
  created_at timestamptz default now()
);

-- Mociones
create type motion_status as enum ('idle', 'voting', 'concluded');
create type motion_result as enum ('approved', 'rejected');

create table motions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status motion_status not null default 'idle',
  time_limit_seconds int not null default 60,
  ends_at timestamptz,                      -- fin absoluto (fuente de verdad del timer)
  result motion_result,
  created_at timestamptz default now()
);

-- Votos (upsert = cambiar voto; un voto por miembro por moción)
create type vote_choice as enum ('aye', 'nay');

create table votes (
  motion_id uuid references motions on delete cascade,
  member_id uuid references members on delete cascade,
  choice vote_choice not null,
  updated_at timestamptz default now(),
  primary key (motion_id, member_id)
);
```

### 4.2 Seguridad (RLS)

- `members`: cualquiera lee; cada usuario inserta/actualiza **solo su fila** (`auth.uid() = id`).
- `votes`: cualquiera lee; cada usuario hace upsert **solo de su voto** (`auth.uid() = member_id`).
- `motions` y `assembly_config`: lectura pública; **escritura solo admin**.
- **Admin**: usuario creado en Supabase Auth (email fijo tipo `admin@asamblea.local` + contraseña). Se identifica con una tabla `admins(user_id)` o claim en el JWT.
- Participantes: `supabase.auth.signInAnonymously()` → cada uno obtiene un `auth.uid` real → RLS funciona sin credenciales visibles.

### 4.3 Storage

- Bucket público `photos` → avatares subidos en el login. URL pública guardada en `members.photo_url`.

### 4.4 Realtime

- Activar replicación en: `members`, `motions`, `votes`, `assembly_config`.
- Los clientes se suscriben con `supabase.channel(...).on('postgres_changes', ...)`.

---

## 5. Paso a paso de implementación

### Tarea 0 — Prerequisitos (manual)

1. Crear proyecto gratis en [supabase.com](https://supabase.com).
2. Copiar **Project URL** y **anon key** (Settings → API) → `.env` de `apps/web`:

   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

3. En Supabase Dashboard → Authentication → Providers: habilitar **Anonymous sign-ins**.
4. Crear usuario admin en Authentication → Users (email + contraseña).
5. Ejecutar el SQL del schema (sección 4) en SQL Editor; crear bucket `photos` público.

### Tarea 1 — Scaffold

```bash
mkdir votacion-mocion && cd votacion-mocion
npm init -y   # configurar "workspaces": ["apps/*", "packages/*"]
npm create vite@latest apps/web -- --template react-ts
cd apps/web && npm install @supabase/supabase-js && npm install -D tailwindcss
```

Configurar Tailwind con la paleta del diseño (sección 6).

### Tarea 2 — `packages/shared`

Tipos: `Member`, `Motion`, `Vote`, `MotionStatus`, `VoteChoice`; constantes de tablas.
Helper puro: `quorumRequired(roster) = Math.floor(roster / 2) + 1`.

### Tarea 3 — Auth y Login (`/login`)

- Formulario: foto (input file con preview circular) + nombre + botón "Unirse".
- Al enviar: `signInAnonymously()` → subir foto al bucket `photos` → insert en `members` → navegar a `/sala`.
- Botón ⚙️ con clase `hidden md:flex` (invisible en móvil) → modal de contraseña →
  `signInWithPassword()` → si es admin → `/admin`.

### Tarea 4 — Vista miembro (`/sala`, móvil-first)

Máquina de 3 estados según la moción activa:

- **`idle`** → pantalla "Esperando el inicio de la votación..." (indicador pulsante).
- **`voting`** → botones grandes **A Favor** (verde) / **En Contra** (rojo) + countdown
  (`ends_at - ahora`). Al votar: upsert en `votes` + tarjeta de confirmación con "Cambiar voto".
- **`concluded`** → resultado de la moción (aprobada/rechazada) y tu voto.

### Tarea 5 — Dashboard admin (`/admin`, desktop)

1. **Config matrícula**: input numérico → actualiza `assembly_config.roster_size`.
2. **Badge de quórum**: `presentes / matrícula` — verde cuando `presentes >= quorumRequired`.
3. **Control de votación**: título de moción + duración (seg) + botón Iniciar/Detener
   (deshabilitado sin quórum). Al iniciar: insert `motions` con `status='voting'`, `ends_at = now() + N`.
4. **Grid de miembros**: avatar + nombre; gris (sin votar) → verde/rojo con ring e ícono ✓/✗,
   actualizado por Realtime.
5. **Contadores grandes**: total A Favor / En Contra.
6. **Cierre**: countdown llega a 0 (o admin detiene) → update `status='concluded'` + `result`
   calculado (`aye > nay ? approved : rejected`) → banner de resultado.
7. **Nueva moción**: vuelve al lobby; la moción anterior queda archivada en la tabla.

### Tarea 6 — Tiempo real y countdown

- Hook `useCountdown(endsAt)`: intervalo de 250ms calculando contra `Date.now()`,
  con corrección de desfase usando la hora del servidor al suscribirse.
- Suscripciones Realtime centralizadas en hooks (`useMembers`, `useActiveMotion`, `useVotes`).

### Tarea 7 — Pruebas

- Abrir `/login` en varios navegadores/móviles (modo incógnito para simular varios usuarios).
- Verificar: quórum bloquea/desbloquea, votos pintan el grid al instante, cambio de voto,
  cierre automático por timeout, reconexión.

---

## 6. Diseño (basado en mockups Stitch — sistema "Assembly Precision")

| Token | Valor |
|---|---|
| Fuentes | **Geist** (headings, números) + **Inter** (cuerpo) |
| Fondo | `#f9f9ff` (surface) / cards `#ffffff` con borde 1px |
| A Favor | verde `#006c49` (fill claro `#6cf8bb`) |
| En Contra | rojo `#ba1a1a` (fill claro `#ffdad6`) |
| Sin votar | escala de grises, `grayscale` + opacidad 60% |
| Números | `font-variant-numeric: tabular-nums` (contadores sin jitter) |
| Esquinas | 4px–16px, bordes finos, sin sombras pesadas |

Pantallas de referencia en `stitch_minimalist_assembly_voting_app/` (zip original):
login, dashboard admin, móvil votar, móvil en espera, vista miembro PC.

---

## 7. Decisiones tomadas

| Decisión | Elección |
|---|---|
| Backend | Supabase (cloud) |
| Matrícula | Número configurable por admin |
| Historial | No en UI por ahora; schema ya preparado |
| Abstención | No — solo A Favor / En Contra |
| Acceso admin | Contraseña, botón visible solo en PC |
| Cambio de voto | Permitido mientras la votación esté activa |

---

## 8. Estado actual (ya configurado)

- **Proyecto Supabase**: `iaxbfaqydvotmtzweksb` (región `us-east-1`).
- **Schema aplicado** (`supabase/schema.sql`): tablas `assembly_config`, `members`,
  `motions`, `votes`, `admins`; RLS activo; grants para `anon`/`authenticated`;
  bucket `photos` público; Realtime en las 4 tablas.
- **Anonymous sign-ins**: habilitado (participantes entran sin contraseña).
- **Admin**: `admin@asamblea.com` (registrado en la tabla `admins`).
- **Variables reales** en `apps/web/.env` (ignorado por git). `.env.example` es solo plantilla.
- Prueba de extremo a extremo superada (registro, crear moción, votar, cambiar voto,
  concluir, y bloqueos de RLS).

### Cómo ejecutar

```bash
npm install
npm run dev
```

- Participantes: `http://<IP-de-la-PC>:5173` (nombre + foto).
- Admin (solo escritorio): botón **⚙ Config** arriba a la derecha → contraseña.

### Aplicar el schema en un proyecto nuevo (opcional)

```bash
# Opción A: pegar supabase/schema.sql en el SQL Editor de Supabase.
# Opción B: con psql usando el Session pooler IPv4:
psql "postgresql://postgres.<ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres" \
     -f supabase/schema.sql
# luego de crear el usuario admin en Authentication:
psql "..." -f supabase/make_admin.sql
```

---

## 9. Solución de problemas (aprendizajes)

- **El host directo `db.<ref>.supabase.co` es solo IPv6**. Si tu red no tiene IPv6,
  usa el **Session pooler** IPv4: `aws-0-<region>.pooler.supabase.com:5432`.
- **La contraseña de la BD no lleva corchetes**. El dashboard muestra el placeholder
  `[YOUR-PASSWORD]`; hay que sustituir TODO el bloque por la contraseña, sin `[ ]`.
- **Al crear tablas por conexión directa** (psql) hay que otorgar GRANTs explícitos a
  `anon`/`authenticated`/`service_role`; si no, la API devuelve `42501 permission denied`.
  Ya vienen incluidos en `supabase/schema.sql`.
- **Supabase concede por defecto** `TRUNCATE`/`TRIGGER`/`REFERENCES` a `anon`; el schema
  los revoca por seguridad.

---

## 10. Despliegue

La app es 100% estática (Vite) + Supabase en la nube → **no necesita servidor propio**.
Cualquier hosting de sitios estáticos sirve. Ya están incluidos los archivos de
configuración para el enrutado SPA: `apps/web/vercel.json` y `apps/web/public/_redirects`.

### Variables de entorno (en el panel del hosting)
```
VITE_SUPABASE_URL=https://iaxbfaqydvotmtzweksb.supabase.co
VITE_SUPABASE_ANON_KEY=<tu anon/publishable key>
VITE_ADMIN_EMAIL=admin@asamblea.com
```

### Opción A — Vercel (recomendado)
1. Sube el proyecto a GitHub.
2. En vercel.com → **Add New Project** → importa el repo.
3. **Root Directory**: `apps/web` (Framework: Vite, se autodetecta).
4. Añade las 3 variables de entorno de arriba → **Deploy**.
5. `vercel.json` ya hace el rewrite a `index.html` (las rutas /sala y /admin no dan 404).

### Opción B — Netlify
1. netlify.com → **Add new site → Import an existing project**.
2. **Base directory**: `apps/web` · **Build command**: `npm run build` · **Publish**: `dist`.
3. Variables de entorno → Deploy. (`public/_redirects` ya cubre el SPA.)

### Opción C — Cloudflare Pages
1. **Build command**: `npm run build` · **Build output**: `apps/web/dist` · raíz del repo.
2. Variables de entorno → Deploy.

### Notas
- El botón **⚙ Config** es visible solo en pantallas de escritorio (por diseño), así que
  el administrador debe entrar desde una PC.
- Tras el primer despliegue, puedes usar la URL pública en los móviles de los participantes
  (ya no dependes de la red local).
- Iconos con **lucide-react**; tipografías Geist + Inter vía Google Fonts.


