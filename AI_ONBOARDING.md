# Punto de entrada para cualquier agente nuevo

## 1. ¿Qué es este proyecto?
LinkVentas es una plataforma SaaS de e-commerce Serverless de alto rendimiento construida para comerciantes (B2B/B2C). Permite a los negocios crear tiendas de alta conversión con características como tickets térmicos, motor de urgencia (FOMO) y checkouts rápidos.

## 2. Lectura obligatoria antes de tocar código
Debes leer y comprender este archivo en su totalidad. Luego, inmediatamente después, lee:
→ ver `AGENT_RULES.md`

## 3. Stack
→ ver `ARCHITECTURE.md#arquitectura-general`

## 4. Arquitectura
```text
[Cliente React/Next.js] --- (Zustand Local)
      |
[Next.js App Router (SSR/API)] <--> [Webhooks (Culqi)]
      |
[Supabase (Auth, RLS, Storage, DB)]
```
→ ver detalle en `ARCHITECTURE.md`

## 5. Tablas principales
→ ver `DATABASE_SCHEMA.md#tablas-principales`

## 6. Reglas críticas
1. Seguir flujo de modificación de código (Regla de Onboarding).
2. Proteger sistemas críticos (`seguridad_supabase.sql`, `lib/encryption.ts`).
3. Usar Supabase Server Client solo donde es absolutamente necesario, respetando RLS en cliente.
4. Aplicar regla anti-alucinación (Documentar origen, Inferido, o DESCONOCIDO).
5. Ejecutar y mostrar checklist de cierre al terminar cada tarea (archivos modificados, docs actualizadas, docs omitidas con razón).
→ ver detalle en `AGENT_RULES.md`

## 7. Estado actual
→ ver `PROJECT_STATE.md#resumen-ejecutivo`

## 8. Prioridades hoy
→ ver `PROJECT_STATE.md#prioridades-sugeridas`

## 9. Regla anti-alucinación
OBLIGATORIA. Si no hay evidencia directa en código, se infiere con anotación `(inferido)` o se marca como `DESCONOCIDO`. Siempre agregar sección de verificación manual al final.

## 10. Regla de cierre
Al finalizar, debes imprimir un checklist de archivos modificados, docs actualizadas o no actualizadas (con razón).

---
## Campos que requieren verificación manual
- DESCONOCIDO: Ninguno aplicable en este archivo índice. Revisar los documentos enlazados.
