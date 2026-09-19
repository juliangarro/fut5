#!/bin/sh
# Levanta next dev apuntando SIEMPRE a Supabase local, sin importar lo que
# diga .env.local (que apunta a producción). Requiere `npx supabase start`
# corriendo. Uso: ./dev-local.sh
#
# Las claves se leen de `supabase status` en runtime en vez de estar
# hardcodeadas acá: son valores de la instancia LOCAL (no un secreto real,
# igual que los que playwright.config.ts hardcodea con el mismo comentario),
# pero GitHub push protection las bloquea igual por el formato
# sb_secret_/sb_publishable_ — más simple leerlas en runtime que pelear
# con el scanner.
set -e
STATUS="$(npx supabase status -o env)"
export NEXT_PUBLIC_SUPABASE_URL="$(echo "$STATUS" | grep '^API_URL=' | cut -d= -f2-)"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(echo "$STATUS" | grep '^ANON_KEY=' | cut -d= -f2-)"
export SUPABASE_SERVICE_ROLE_KEY="$(echo "$STATUS" | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2-)"
npm run dev
