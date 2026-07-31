# Manual operativo

Usa API Routes para pagos, billing y webhooks. `SUPABASE_SERVICE_ROLE_KEY` solo puede usarse en backend, webhooks o mantenimiento. No expongas secretos con `NEXT_PUBLIC_`.

El schema se modifica únicamente con migraciones en `supabase/migrations`. Los cambios de estados e inventario deben usar las funciones SQL canónicas; no se permiten escrituras directas que las evadan.

Antes de cerrar: ejecutar lint, pruebas unitarias, build y actualizar documentación/changelog.
