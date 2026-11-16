# CLAUDE.md · percha (Clóset Digital y Planificador de Outfits con IA)

Contexto completo para continuar este proyecto. Leelo entero antes de tocar código.

## 1. Quién y qué
- Usuario: Francisco (Argentina). Hablale en **español rioplatense** (voseo). Es ingeniero y sabe programar (React, Git, Linux), así que podés ser técnico.
- App web **mobile-first**, inspirada en la app *Alta*: clóset digital → generador de outfits → calendario → avatar con prueba virtual.
- Referencias visuales en `docs/reference/` (capturas de TikTok de Alta): grilla del clóset, collage de outfit "Football Practice / Athleisure" con botón "Create Avatar", y calendario mensual con avatar de cuerpo completo en cada día.

## 2. Decisiones ya tomadas (no volver a preguntar)
| Tema | Decisión |
|---|---|
| Usuarios | Solo Francisco. Sin multiusuario ni registro abierto |
| Presupuesto | **US$0.** Nada de APIs pagas |
| Plazo | Sin apuro. Calidad > velocidad |
| Plataforma | Web (no PWA formal). Meta tags para "Agregar a inicio" en iPhone ya puestos. Sin offline |
| Dispositivos | Usa **celular (iPhone) y compu**, por eso los datos van en la nube |
| Hosting | Vercel (gratis) |
| Backend | Supabase (gratis): Postgres + Storage privado + Auth email/contraseña. Sin servidor propio |
| Datos | Sin backup/export. Por prenda solo lo necesario para visualizar y combinar (sin precio, talle ni estado) |
| Quitar fondo | En el navegador, gratis (Transformers.js) |
| Auto-etiquetado | Modelo local en el navegador (CLIP zero-shot). La marca es una sugerencia que el usuario corrige |
| Carga | Solo con fotos propias (sin links ni scraping de tiendas) |
| Generador | Tiene en cuenta ocasión + clima + no repetir + armonía de colores. Feedback con like/dislike simple (pesos), sin modelo de recomendación |
| Ocasiones | Casual, salida y oficina (sin ropa de trabajo ni EPP). Se puede sumar "deporte/athleisure" |
| Google Calendar | **No** |
| Avatar | Quiere "una representación mía". Acepta subir su foto a un servicio externo. Esquema acordado: collage siempre + render de prueba virtual **a pedido** con un Space gratis de Hugging Face, guardado en caché |
| Tira semanal | **No.** Los outfits se arman por **ocasión**, no por semana |
| Calendario | Sí, mensual. En v1 de calendario, miniatura de collage por día. Si el día tiene render de avatar, se muestra ese |
| Registro de uso | No (solo planificar). Tal vez más adelante |
| Idioma UI | Bilingüe es/en (i18next) |
| Tema | Claro + oscuro + sistema |
| Collage | Layout estándar automático por categoría (sin drag & drop) |
| Compartir | No |
| Extras | Wishlist: sí, con "qué te falta para combinar". Modo valija: sí. Estadísticas: sí. Multiusuario: no |
| Identidad | **Pendiente.** Opciones propuestas: **Percha** `#C4532D` (implementada por defecto), **Fitlist** `#2F4BD8`, **Ropero** `#5E6B3A`. Se cambia en `src/config/brand.ts` (y `public/favicon.svg`, `index.html` title, `AuthGate`/wordmark usan BRAND) |

## 3. Stack y arquitectura
- Vite 8 + React 19 + TypeScript (estricto, `noUnusedLocals`) + Tailwind v4 (`@tailwindcss/vite`) + react-router (HashRouter) + i18next + Dexie + supabase-js + @huggingface/transformers v4 + fuente Inter (@fontsource).
- **Toda la IA corre en el navegador**, dentro de un Web Worker (`src/lib/ai/ai.worker.ts`):
  - Fondo: `briaai/RMBG-1.4` con `config: { model_type: 'isnet' }` (el repo no trae un model_type válido). Intenta webgpu fp32 → wasm q8 → wasm fp32. El worker devuelve solo el canal alfa y el hilo principal lo aplica (`lib/image.ts`).
  - Etiquetas: `Xenova/clip-vit-base-patch32`, zero-shot en cuatro grupos (subcategoría, estilo, marca, color). Prompts en `lib/ai/prompts.ts` (a partir de `lib/taxonomy.ts`). **Solo se baja el encoder de visión q8** (89 MB); los embeddings de texto están precalculados en fp32 en `lib/ai/clip-text-embeddings.json` (`npm run clip:embed` para regenerarlos si cambian los prompts). Motivo: el CLIP completo q8 arruinaba el texto (no reconocía ni Levi's) y el fp32 pesa 606 MB y no entraba en la Cache API.
  - Umbrales calibrados con visión q8 en `process.ts`: marca ≥ 0.5, corrección de color ≥ 0.45.
  - Colores: k-means en CIELAB sobre los píxeles opacos, mapeados a la paleta con nombre (`lib/color.ts`). Si CLIP está seguro y su color es vecino (ΔE ≤ 35) del medido, CLIP corrige el principal (`refineWithClip`).
  - Si algo falla, la prenda se guarda igual con la foto original y etiquetas manuales (warnings `bg_failed` / `tag_failed`).
- **Capa de datos** `src/lib/store/`: interfaz `DataStore` con dos implementaciones, `supabaseStore` (si hay env vars) y `localStore` (IndexedDB con Dexie, **modo demo**). La UI usa `useGarments()` (`lib/garments.tsx`). Mantené esa simetría al agregar entidades.
- Imágenes: cuadradas, recortadas al contenido con margen, WebP con alfa (o PNG en Safari). `image` 900 px y `thumb` 400 px. En Supabase van al bucket privado `garments/<uid>/<id>.<ext>` y se leen con URLs firmadas.
- Esquema SQL: `supabase/schema.sql` (tabla `garments` + RLS por `auth.uid()` + bucket privado con políticas por carpeta). Para entidades nuevas agregá **migraciones idempotentes** al mismo estilo (por ejemplo `supabase/002_outfits.sql`) y documentalas en el README.

### Mapa de archivos
```
src/config/brand.ts         identidad (nombre, acento)
src/index.css               tokens de color (CSS vars) + tema oscuro + utilidades
src/i18n/index.ts           diccionarios es/en (en tipado contra es)
src/lib/taxonomy.ts         categorías, subcategorías (con warmth/formality por defecto), colores, estilos, marcas
src/lib/ai/                 worker, protocolo, cliente (con progreso de descarga) y processPhoto()
src/lib/store/              tipos, supabaseStore, localStore, selector
src/lib/garments.tsx        contexto de prendas
src/lib/theme.ts            preferencia de tema
src/components/             ui.tsx (Button, Chip, Segmented, Sheet, Field…), Icons, Layout (nav inferior/lateral), GarmentCard, GarmentForm, GarmentSheet, AuthGate
src/pages/                  Closet, AddGarments, Profile, Placeholders (Outfits, Calendar)
```

## 4. Diseño (respetar)
- Editorial minimalista: fondo `#FFFFFF`, tarjetas `#F5F5F7`, texto `#111111`, botones negros tipo píldora, Inter con tracking negativo en títulos.
- Tokens Tailwind: `bg`, `surface`, `tile`, `ink`, `muted`, `line`, `accent`, `on-ink`, `danger` (definidos como CSS vars en `index.css`). **No hardcodear colores** en componentes.
- En oscuro las prendas se muestran igual sobre tile gris claro (`--tile`), para que una remera negra no desaparezca.
- El acento se usa con moderación: estados activos, sugerencias de IA, badges.
- Grilla del clóset: 3 columnas en móvil, de 4 a 6 en escritorio. Debajo de cada imagen va la marca en negrita y la descripción en una línea.
- Navegación: barra inferior fija en móvil y lateral en escritorio (Clóset, Outfits, Calendario, Perfil).
- Respetar safe areas de iPhone (`pt-safe`, `pb-safe`).

## 5. Estado actual
- ✅ **Entrega 1 (clóset):** base de la app, temas, i18n, auth, Supabase + modo demo, carga múltiple con IA y revisión editable, grilla, búsqueda, filtros (categoría/color/marca), detalle, edición y borrado, perfil (tema, idioma, precarga de modelos).
- ✅ **Verificado en Chrome de escritorio (2026-11-16)** con 5 fotos reales (remera, jean, zapatillas, gorra, buzo):
  1. RMBG-1.4 con `model_type: 'isnet'` recorta muy bien en WebGPU fp32 (~1–2 s por foto) y en wasm q8 (~15 s, un solo hilo). El ONNX tiene la entrada fija en 1024 px (no se puede achicar).
  2. CLIP clasifica bien tras los cambios de arriba (prompts más descriptivos para remera/chomba/camisa, texto precalculado, umbrales).
  3. Flujo completo con Supabase (proyecto `lcmesamjjujutzfxytgl`, São Paulo): alta de usuario, subida a Storage (`garments/<uid>/<id>.webp` + `_thumb`), URLs firmadas, edición (trigger `updated_at`), borrado de fila + archivos, y RLS (sin sesión: select vacío, insert rechazado 42501, Storage 400).
- ⚠️ **Pendiente:**
  4. Rendimiento y memoria en iPhone. Safari de iOS 26 trae WebGPU (usaría el camino rápido); si no, wasm de un hilo (lento). Para multihilo haría falta COOP/COEP, que complica las imágenes de Supabase.
- Probado: typecheck, build, UI en móvil y escritorio, claro y oscuro (Playwright + Chrome) y camino de respaldo sin IA.

## 6. Próximas entregas (en este orden)

### Entrega 2: generador de outfits por ocasión
- Pantalla Outfits: elegir **ocasión** (Casual, Salida, Oficina, Deporte) y fecha opcional (por defecto hoy). Se ven N propuestas en un **carrusel** de collages.
- **Clima:** Open-Meteo (gratis, sin key), con geolocalización del navegador o ciudad guardada en Perfil. Usa la temperatura máxima/mínima y la probabilidad de lluvia del día.
- **Motor de reglas** (`src/lib/outfits/engine.ts`, puro y testeable):
  - Plantilla por ocasión: top + bottom + calzado obligatorios, outerwear según temperatura, y opcionales gorra, lentes y reloj.
  - Filtrar por `formality` acorde a la ocasión y por `warmth` acorde a la temperatura (por ejemplo, short solo con más de ~22 °C).
  - Armonía de colores: neutros + como mucho 1–2 acentos, evitar dos estampados o acentos que choquen.
  - Penalizar prendas usadas en outfits del calendario en los últimos X días.
  - Pesos de like/dislike: por prenda y por par de prendas, guardados en Supabase o local.
  - Aleatoriedad controlada para variedad y dedupe de combinaciones.
- **Tarjeta de outfit:** a la izquierda la ocasión y a la derecha la etiqueta de estilo (como "Football Practice / Athleisure"). Collage con layout estándar por categoría (gorra arriba, top y abrigo al medio, bottom abajo, calzado al pie, accesorios a los costados).
- **Acciones:** like / dislike, editar (cambiar una prenda por otra de la misma categoría), guardar outfit. Botón "Probármelo" deshabilitado con "Próximamente" hasta la entrega 4.
- **Datos:** tabla `outfits` (id, user_id, occasion, style, item_ids uuid[], created_at, tryon_path null) y `outfit_feedback` (o una tabla `preferences` con jsonb de pesos). Siempre con RLS e implementación local equivalente.

### Entrega 3: calendario mensual
- Grilla de 7 columnas, navegación entre meses, número de día arriba y miniatura del outfit asignado (collage, o render del avatar si existe).
- Tocar un día abre una sheet para asignar un outfit guardado, generar uno nuevo para esa fecha (precargando el clima del día), cambiarlo o quitarlo.
- Tabla `calendar_entries` (user_id, date, outfit_id), única por (user_id, date).

### Entrega 4: avatar y prueba virtual
- En Perfil: subir una foto de cuerpo completo, quitarle el fondo con el mismo pipeline y guardarla en Storage.
- "Probármelo" llama desde el navegador a un **Space gratis de Hugging Face** con `@gradio/client` (candidatos: `Kwai-Kolors/Kolors-Virtual-Try-On`, `yisol/IDM-VTON`). Primero se prueba el top y después el bottom sobre el resultado. Verificar los nombres de endpoint del Space antes de codear.
- Guardar el resultado en `outfits.tryon_path` y mostrarlo en la tarjeta y en el calendario.
- Manejar cola, cuota diaria y Space caído con mensajes claros y volviendo al collage.
- Gorra, lentes y reloj **no** se renderizan sobre el avatar (limitación conocida).
- Diseñarlo detrás de una interfaz `TryOnProvider`, por si en el futuro se cambia a una API paga.

### Entrega 5: extras
- **Wishlist:** prendas deseadas (foto + marca + nota + link opcional) y "qué te falta" a partir de huecos del clóset (por ejemplo, no hay calzado formal o hay pocos neutros abajo).
- **Estadísticas:** prendas más y menos planificadas, distribución por categoría y color.
- **Modo valija:** N días + ocasiones → set mínimo de prendas que cubra todos los outfits.

### Fuera de alcance
Offline, backup/export, compartir, Google Calendar, multiusuario, registro de uso diario, scraping de tiendas, APIs pagas.

## 7. Comandos y entorno
```bash
npm install                # si onnxruntime-node falla en postinstall: npm install --ignore-scripts
cp .env.example .env       # VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (vacío = modo demo)
npm run dev
npx tsc -b && npm run build
```
- Verificación visual: levantar `npx vite preview` y sacar capturas con Playwright en 390×844 (móvil) y 1440×900 (escritorio), en claro y oscuro. En modo demo se pueden sembrar prendas escribiendo directo en IndexedDB `percha` → store `garments` (con `image`/`thumb` como Blob).
- Antes de cerrar cada entrega: typecheck limpio, build OK, capturas revisadas y README actualizado (pasos de SQL nuevos incluidos).

## 8. Convenciones
- Textos de UI siempre en i18n (es y en). Comentarios de código en español.
- Componentes chicos y sin librerías de UI pesadas: extender `components/ui.tsx`.
- Lógica pura (motor de outfits, armonía de color) separada de React y con tests (agregar Vitest cuando haga falta).
- Toda tabla nueva: RLS por `auth.uid()`, SQL idempotente y su par en `localStore`.
- Commits chicos por funcionalidad. No commitear `.env`.
