# Instrucciones para agentes — LinkVentas

Este es el archivo canónico de instrucciones para agentes. Debe mantenerse
sincronizado con `.agents/AGENTS.md`, que existe únicamente por compatibilidad
con herramientas que todavía consultan esa ruta.

## Alcance y seguridad

- Lee `AI_ONBOARDING.md` y el módulo afectado en `PROJECT_MAP.md` antes de
  modificar código. Distingue siempre los hechos verificados de inferencias y
  de elementos `DESCONOCIDO`.
- No modifiques sin autorización explícita `supabase/migrations`,
  `lib/encryption.ts` ni `app/api/webhooks/mercadopago/route.ts`.
- Las llaves privadas (incluidas `ADMIN_USER_ID`) sólo se usan en servidor. No
  se exponen con `NEXT_PUBLIC_`, no se imprimen y no se versionan.
- Los flujos sensibles de pagos, billing y webhooks viven en `app/api`.

## Convenciones de código

- Usa Tailwind antes que estilos inline y coloca los hooks reutilizables en
  `hooks/`.
- En cliente usa `@supabase/ssr` o `lib/supabase.ts`. El cliente
  `getSupabaseServiceClient` queda reservado para procesos de servidor que
  justificadamente necesitan omitir RLS, como webhooks y tareas de fondo.
- Todo cambio estructural se crea mediante una migración de Supabase. Nunca
  ejecutes scripts ad hoc que escriban directamente en producción.

## Clasificación obligatoria de archivos

Antes de cerrar una tarea, clasifica cada archivo creado o modificado:

1. **Entregable de runtime/producción**: código, recursos de `public/`,
   migraciones autorizadas, configuración de build/runtime y documentación que
   la app realmente sirve. Debe estar rastreado por Git y llegar al despliegue
   correspondiente.
2. **Documentación del repositorio**: debe estar rastreada, confirmada y
   subida a `origin`; no forma parte de la interfaz de producción salvo que se
   implemente una ruta que la sirva explícitamente.
3. **Local/temporal/secreto**: `.env*`, `.vercel/`, `node_modules/`, `.next/`,
   cobertura, reportes, capturas y scratchpads. No se publican ni se añaden a
   Git sin una autorización expresa y una revisión de secretos.

Un archivo ignorado o no rastreado no puede declararse “subido a producción”.
Si un usuario espera verlo en la web, no basta con crearlo en el repositorio:
hay que integrarlo al runtime, publicarlo y verificar su URL.

## Puerta de publicación y cierre

Cuando la solicitud incluya publicar, desplegar o llevar cambios a producción:

1. Revisa `git status --short`, `.gitignore` y el diff. Explica cualquier
   archivo que quede local; no lo omitas silenciosamente.
2. Comprueba que cada entregable de runtime está rastreado con `git ls-files`.
   Ejecuta pruebas y `git diff --check` proporcionales al cambio.
3. Confirma el commit y súbelo a la rama autorizada. Verifica que no queden
   commits locales pendientes frente a `origin/<rama>`.
4. Antes de desplegar manualmente, valida `.vercel/project.json`: el proyecto
   oficial es `link-ventas-app`. Nunca ejecutes `vercel --prod --yes` si el
   enlace no está confirmado.
5. Comprueba que el despliegue de producción corresponde al commit publicado
   y verifica la ruta o recurso afectado. Para previews protegidos usa
   `vercel curl`; no desactives la protección.
6. Reporta por separado: archivos publicados, archivos sólo versionados,
   archivos locales intencionales y cualquier verificación pendiente. No
   declares éxito de producción sin evidencia de los pasos 3–5.

Si la petición sólo autoriza cambios locales o un commit, no despliegues por
inferencia: deja explícito que falta la autorización de producción.

## Mantenimiento y validación

- Actualiza `CHANGELOG.md` y la documentación afectada antes de marcar una
  tarea como completa.
- Ejecuta `npm run test:unit` y, si aplica, el E2E de checkout disponible. El
  E2E de pagos sólo se ejecuta en sandbox y con destino y credenciales de
  prueba explícitos.
