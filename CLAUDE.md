@AGENTS.md

# Notas para Claude

La memoria del proyecto (stack, decisiones, dónde editar, verificación) está en
`AGENTS.md`, importado arriba. Acá van sólo las pautas para trabajar en este repo.

## Quién usa qué
- Los huéspedes entran casi siempre por celular, y el dueño maneja el panel
  **sólo desde el teléfono**. Todo cambio visible se prueba a 375px en el
  navegador integrado antes de darlo por terminado: áreas táctiles de 44px o
  más, campos de 16px y nada de scroll horizontal.
- Cuando el dueño ve algo nuevo, se actualiza también su guía en Claude Docs
  (sección "Guía para el cliente" en `AGENTS.md`).

## Panel admin
- Para entrar hace falta una sesión real de Supabase con un email de
  `ADMIN_EMAILS`. Nunca escribas credenciales: pedile al usuario que inicie
  sesión él mismo en el navegador integrado y seguí desde ahí.
- `.env.local` apunta al proyecto real de Supabase: no crees, canceles ni
  borres reservas de prueba ahí. Para probar flujos, usá tests (Vitest + RTL)
  o la "Unidad de prueba" sólo si el usuario lo pide.

## Archivos y git
- El repo mezcla finales de línea CRLF y LF. Un reemplazo hecho con scripts
  (node/sed) tiene que normalizar `\r\n` antes de buscar texto, o no encuentra
  nada. Para cambios puntuales es más seguro usar Edit.
- El usuario commitea y pushea directo a `main` cuando lo pide. `.codex/`,
  `package-lock.json` (el proyecto usa pnpm) y `supabase/.temp/` no se suben.
- Tests primero en la lógica nueva (`lib/…` + `tests/…`), y antes de cerrar:
  `pnpm test` y `pnpm exec tsc --noEmit`.
