-- =============================================================
-- La Casa del Lago Urugua-í — setup completo de Supabase
-- Pegar en: Dashboard → SQL Editor → New query → Run
--
-- Aplicado al proyecto aqknzqtxhgsrhfaskoeo el 2026-07-21 como tres
-- migraciones: create_reservations, create_comprobantes_bucket,
-- create_rate_settings. Este archivo queda como referencia consolidada
-- (idempotente: se puede volver a correr sin romper nada).
-- =============================================================

-- Trigger function: mantiene updated_at al día en cada UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Tabla principal de reservas
create table if not exists public.reservations (
  id                          uuid primary key default gen_random_uuid(),
  code                        text not null unique,
  unit_id                     text not null,
  unit_name                   text not null,
  check_in                    date not null,
  check_out                   date not null,
  nights                      integer not null,
  guests                      integer not null,
  first_name                  text not null,
  last_name                   text not null,
  email                       text not null,
  phone                       text,
  locale                      text not null default 'es',
  confirmation_email_sent_at  timestamptz,
  total                       integer not null,
  payment_method              text not null check (payment_method in ('card', 'transfer')),
  status                      text not null check (status in ('pending', 'confirmed', 'released')),
  comprobante_path            text,
  payment_id                  text,
  calendar_event_id           text,
  created_at                  timestamptz not null default now(),
  confirmed_at                timestamptz,
  updated_at                  timestamptz not null default now(),
  expires_at                  timestamptz
);

alter table public.reservations
  add column if not exists expires_at timestamptz;
update public.reservations
set expires_at = created_at + interval '15 minutes'
where status = 'pending' and payment_method = 'card' and expires_at is null;
create index if not exists reservations_pending_expiry_idx
  on public.reservations (expires_at)
  where status = 'pending' and expires_at is not null;

-- Índice para el listado del panel admin (filtro por status + orden por fecha)
create index if not exists reservations_status_idx
  on public.reservations (status, created_at desc);

-- RLS activado sin policies: nadie accede con la anon key.
-- La app usa la service role key (server-only), que ignora RLS.
alter table public.reservations enable row level security;

-- Trigger de updated_at
drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- Bucket privado para comprobantes de transferencia
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;
update storage.buckets set public = false where id = 'comprobantes';

-- Tarifas editables desde /admin/tarifas (fila única id=1).
-- extra_guest_fee se suma por huésped adicional a partir de base_guests.
create table if not exists public.rate_settings (
  id               smallint primary key default 1 check (id = 1),
  nightly_aratiri    integer not null default 99800,
  nightly_aguaribay  integer not null default 99800,
  cleaning_fee     integer not null default 30000,
  base_guests      integer not null default 2,
  extra_guest_fee  integer not null default 20000,
  updated_at       timestamptz not null default now()
);

-- Corrección de nombres comerciales: los slugs internos no cambian para no
-- romper reservas ni URLs, pero la etiqueta guardada debe coincidir con la web.
update public.reservations
set unit_name = case unit_id
  when 'aratiri' then 'Cabaña Aguaribay'
  when 'aguaribay' then 'Cabaña Aratirí'
  else unit_name
end
where unit_id in ('aratiri', 'aguaribay');

-- Fila inicial con los mismos valores que lib/units.ts
insert into public.rate_settings (id) values (1) on conflict (id) do nothing;

-- Migración de la plantilla inicial: sólo cambia la fila si todavía conserva
-- los valores anteriores, sin pisar una tarifa que el admin ya haya editado.
update public.rate_settings
set nightly_aratiri = 99800,
    nightly_aguaribay = 99800,
    extra_guest_fee = 20000
where id = 1
  and nightly_aratiri = 130000
  and nightly_aguaribay = 95000
  and extra_guest_fee = 0;

-- Mismo criterio que reservations: RLS sin policies, solo service role.
alter table public.rate_settings enable row level security;

drop trigger if exists rate_settings_set_updated_at on public.rate_settings;
create trigger rate_settings_set_updated_at
  before update on public.rate_settings
  for each row execute function public.set_updated_at();

-- Precios por método de pago (2026-07-20): % de costo por canal, editables en
-- /admin/tarifas. El precio público = neto ÷ (1 − pct/100) (ver method-pricing.ts).
-- Para bases que ya tienen rate_settings creada, este ALTER agrega las columnas.
alter table public.rate_settings
  add column if not exists card_fee_pct     numeric(5,2) not null default 7.7,
  add column if not exists transfer_fee_pct numeric(5,2) not null default 5;

-- El desglose del checkout (priceBreakdown, method-pricing.ts) deriva el
-- precio de lista SIEMPRE del método tarjeta y muestra la transferencia como
-- descuento: si transfer_fee_pct superara a card_fee_pct, las líneas
-- mostradas dejarían de sumar el Total. parseRateSettingsInput ya lo rechaza
-- al guardar desde /admin/tarifas; este CHECK es el resguardo a nivel fila
-- para cuando se edita a mano en SQL. OJO: no protege bases ya creadas hasta
-- que se corra este ALTER contra ellas — rowToSettings (rate-settings.ts)
-- clampea en la lectura como red mientras tanto.
alter table public.rate_settings
  drop constraint if exists rate_settings_transfer_fee_le_card_fee;
alter table public.rate_settings
  add constraint rate_settings_transfer_fee_le_card_fee
    check (transfer_fee_pct <= card_fee_pct);

-- =============================================================
-- 2026-07-22 — Supabase como fuente única de disponibilidad.
-- Candado anti-doble-booking + reservas manuales. Google Calendar retirado.
-- Aplicado al proyecto aqknzqtxhgsrhfaskoeo como migración
-- supabase_fuente_disponibilidad.
-- =============================================================
create extension if not exists btree_gist;

-- Ninguna reserva activa (status != released) puede solaparse con otra de la
-- misma unidad. Rango semiabierto [check_in, check_out): el día de salida queda
-- libre. Una inserción que la viole falla con SQLSTATE 23P01.
alter table public.reservations
  drop constraint if exists reservations_no_overlap;
alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    unit_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status <> 'released');

-- Reservas cargadas a mano por el admin (clientes de Meta Ads/WhatsApp).
alter table public.reservations
  drop constraint if exists reservations_payment_method_check,
  add constraint reservations_payment_method_check
    check (payment_method in ('card', 'transfer', 'manual'));

-- Columna vestigial del viejo Google Calendar.
alter table public.reservations drop column if exists calendar_event_id;

-- =============================================================
-- Configuración operativa del sitio (2026-07-23), editable desde
-- /admin/configuracion. Fila única id=1, mismo criterio que rate_settings.
-- booking_mode='whatsapp' pausa la reserva online: los CTAs derivan a WhatsApp,
-- /reservas redirige a /tarifas y los APIs de pago responden 503.
-- =============================================================
create table if not exists public.site_settings (
  id           smallint primary key default 1 check (id = 1),
  booking_mode text not null default 'whatsapp'
               check (booking_mode in ('whatsapp', 'online')),
  updated_at   timestamptz not null default now()
);

-- Fila inicial en el modo CERRADO: abrir el cobro es siempre una acción explícita.
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- RLS sin policies: solo la service role key (server-only) entra.
alter table public.site_settings enable row level security;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- =============================================================
-- 2026-08-05 — Testimonios de la home, editables desde /admin/opiniones.
-- La sección Opiniones muestra los publicados, en el orden de `position`.
-- Sin filas publicadas la sección degrada al puntaje agregado (ver
-- components/home/Opiniones.tsx): nunca se rellena con textos inventados.
--
-- ⚠ DEPENDE del bloque de site_settings de acá arriba (2026-07-23): el ALTER
-- del final le agrega columnas. Correr sólo este bloque sobre una base donde
-- site_settings no existe falla con 42P01. Ante la duda, correr el archivo
-- entero, que es idempotente.
-- =============================================================
create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  -- El nombre como figura en Google.
  author      text not null check (length(trim(author)) > 0),
  -- El texto tal cual lo escribió el huésped, sin comillas: las pone el
  -- componente. Copiado a mano de la ficha, no se corrige la ortografía.
  body        text not null check (length(trim(body)) > 0),
  -- Idioma del texto, para el `lang` del <blockquote>. Las reseñas no se
  -- traducen: se guardan una vez en el idioma original.
  lang        text not null default 'es' check (lang in ('es', 'pt', 'en')),
  rating      smallint not null default 5 check (rating between 1 and 5),
  -- Fecha como la muestra Google: "hace 2 meses", "marzo de 2026".
  date_label  text not null default '',
  -- Orden en pantalla. Menor primero; se reordena desde el panel.
  position    integer not null default 0,
  -- Despublicar en vez de borrar: permite rotar sin perder el texto.
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Índice del listado público (published + orden) y del panel.
create index if not exists testimonials_order_idx
  on public.testimonials (published, position, created_at);

-- Mismo criterio que el resto: RLS sin policies, sólo la service role key.
alter table public.testimonials enable row level security;

drop trigger if exists testimonials_set_updated_at on public.testimonials;
create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- Agregado de la ficha de Google — el "4,7 sobre 88" de la sección.
-- ⚠ NO se puede derivar de testimonials: son las 88 reseñas que tiene la ficha,
-- no las que cargamos acá. Se copia a mano de Google cuando cambia.
alter table public.site_settings
  add column if not exists reviews_rating numeric(2,1) not null default 4.7
    check (reviews_rating >= 0 and reviews_rating <= 5),
  add column if not exists reviews_count integer not null default 88
    check (reviews_count >= 0);

-- =============================================================
-- 2026-08-11 — Unidad de prueba (ver lib/reservation/test-unit.ts).
-- Arranca en false: habilitar un cobro es siempre una acción explícita.
-- =============================================================
alter table public.site_settings
  add column if not exists test_unit_enabled boolean not null default false;

-- =============================================================
-- 2026-10-28 — Temporada alta (ver lib/reservation/seasons.ts).
-- Rangos [{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }], ambos inclusive.
-- Lista vacía = sin temporada alta: todo se cobra como baja.
-- =============================================================
alter table public.rate_settings
  add column if not exists high_nightly_aratiri integer not null default 149800
    check (high_nightly_aratiri > 0),
  add column if not exists high_nightly_aguaribay integer not null default 149800
    check (high_nightly_aguaribay > 0),
  add column if not exists high_min_nights integer not null default 4
    check (high_min_nights between 1 and 30),
  add column if not exists high_season_ranges jsonb not null default '[]'::jsonb;

-- =============================================================
-- 2026-10-28 — Reglas de estadía de temporada baja (ver lib/reservation/stay-rules.ts).
-- Los defaults reproducen las reglas que antes estaban fijas en el código.
-- =============================================================
alter table public.rate_settings
  add column if not exists low_weekday_min_nights integer not null default 2
    check (low_weekday_min_nights between 1 and 30),
  add column if not exists low_weekend_min_nights integer not null default 3
    check (low_weekend_min_nights between 1 and 30),
  add column if not exists weekend_package_enabled boolean not null default true,
  add column if not exists weekend_package_nights integer not null default 3
    check (weekend_package_nights between 1 and 30),
  add column if not exists weekend_package_billed numeric(4,1) not null default 2.5
    check (weekend_package_billed > 0 and weekend_package_billed <= weekend_package_nights);
