# Manual de operación para cualquier agente futuro

## Stack Tecnológico
- **Framework Core**: Next.js 15+ (App Router), React 19.
- **Estilos**: Tailwind CSS v4, Lucide React (Iconos).
- **Base de Datos & Auth**: Supabase (PostgreSQL, GoTrue, @supabase/ssr v0.10.0, @supabase/supabase-js v2.101.1).
- **Estado Global**: Zustand v5 (Persistido).
- **Utilidades Especiales**: `html2canvas` (Tickets térmicos), `jose` (JWT), `pdfkit`.

## Convenciones de Código
- **Componentes React**: Estilos con Tailwind, evitar `style={{}}` inline cuando existan clases utilitarias disponibles.
- **Hooks Personalizados**: Se alojan en `/hooks`.
- **API Routes**: Todo flujo sensible (pagos, billing, webhooks) debe vivir en `/app/api`.
- **Supabase Clientes**: 
  - Usar `@supabase/ssr` o `lib/supabase.ts` para frontend.
  - Usar `lib/supabaseServer.ts` (`getSupabaseServiceClient`) SÓLO para procesos de background/webhooks que requieran saltar RLS.
- **Variables de Entorno**: `ADMIN_USER_ID` (y llaves maestras) son estrictamente variables privadas de servidor. NUNCA exponerlas usando el prefijo `NEXT_PUBLIC_`. Toda validación de administrador debe ocurrir del lado del backend.

## Sistemas Protegidos (NO TOCAR SIN AUTORIZACIÓN EXPLÍCITA)
1. `seguridad_supabase.sql`: Reglas RLS y esquema maestro.
2. `lib/encryption.ts`: Funciones de cifrado de llaves de pasarela de pago.
3. `/app/api/webhooks/culqi/route.ts`: Lógica de transacciones financieras.

## Flujo Obligatorio Antes de Modificar Código
Cualquier IA que interactúe con este proyecto DEBE seguir estos pasos:
1. Leer `AI_ONBOARDING.md` y confirmar lectura.
2. Leer el módulo afectado en `PROJECT_MAP.md`.
3. Confirmar con el usuario si afecta sistemas protegidos.
4. Aplicar regla anti-alucinación durante todo el trabajo (marcar inferencias y listar DESCONOCIDO).
5. Aplicar regla de mantenimiento al terminar (actualizar `CHANGELOG.md` y docs).
6. Ejecutar checklist de cierre antes de declarar tarea completa.

REGLA DE CHANGELOG AUTOMÁTICO:
Al finalizar cada sesión de trabajo, el agente DEBE actualizar CHANGELOG.md sin esperar instrucción del usuario. Esta actualización es parte del checklist de cierre — si el CHANGELOG no fue actualizado, la tarea NO está completa. El agente no puede marcar "TAREA COMPLETADA" si CHANGELOG.md no refleja el trabajo de la sesión actual.

## Reglas de Testing
- **DESCONOCIDO** (No se han inferido configuraciones de Jest o Playwright en el repositorio. Testeo manual recomendado).

## Cómo Manejar Migraciones de BD
- LinkVentas no usa un ORM tradicional con CLI de migraciones.
- Los cambios estructurales se reflejan actualizando manualmente `seguridad_supabase.sql`.
- Existe `scripts/doctor.ts` como herramienta de parcheo, pero no debe considerarse un gestor de migraciones absoluto.

---
## Campos que requieren verificación manual
- DESCONOCIDO: Procedimiento exacto de testeo unitario/e2e que el equipo humano utiliza, de existir alguno.
