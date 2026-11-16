# percha · clóset digital

Web app mobile-first para digitalizar tu ropa y armar outfits. Entrega 1: **clóset** (carga con IA, grilla, búsqueda y filtros).

- **Frontend:** Vite + React + TypeScript + Tailwind v4, español / inglés, modo claro / oscuro.
- **Datos:** Supabase (Postgres + Storage privado). Sin credenciales corre en **modo demo**, con los datos en el navegador (IndexedDB).
- **IA, 100 % en el navegador y gratis** (Transformers.js en un Web Worker):
  - Quitar fondo: `briaai/RMBG-1.4` (licencia de uso no comercial, OK para uso personal).
  - Tipo, estilo, color y marca sugerida: CLIP (`Xenova/clip-vit-base-patch32`), zero-shot. En el navegador solo corre el encoder de **visión q8** (89 MB); los embeddings de texto vienen precalculados en fp32 (`src/lib/ai/clip-text-embeddings.json`).
  - Colores: k-means en CIELAB sobre los píxeles de la prenda recortada, corregido por CLIP cuando la luz engaña (un jean con luz cálida da gris).
  - Los modelos se descargan la primera vez (~180 MB en total) y quedan cacheados. Si algo falla, la prenda se guarda igual con la foto original y etiquetas manuales.
  - Si cambiás prompts o la taxonomía (`src/lib/taxonomy.ts`, `src/lib/ai/prompts.ts`), regenerá los embeddings: `npm run clip:embed`.

## Puesta en marcha (unos 15 minutos)

### 1. Supabase (gratis)
1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor →** pegá todo `supabase/schema.sql` **→ Run**. Crea la tabla `garments`, el bucket privado `garments` y las reglas de seguridad.
3. **Authentication → Sign In / Providers → Email:** dejá prendido *Enable Email provider* (si se apaga, la app dice "Email logins are disabled") y apagá solo *Confirm email*. **Save.** El cambio tarda unos segundos en aplicarse.
4. **Project Settings → Data API:** copiá la *Project URL*. **API Keys:** copiá la *publishable key* (`sb_publishable_…`).
5. Chequeo rápido: en **Table Editor** tiene que aparecer `garments` y en **Storage** el bucket `garments`. Fijate que estés en el proyecto correcto (el id está en la URL del dashboard).

### 2. Código en GitHub
Subí esta carpeta a un repo (puede ser privado).

### 3. Vercel (gratis)
1. *Add New → Project →* importá el repo (Vercel detecta Vite solo).
2. *Environment Variables:*
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon / publishable key
3. *Deploy.*

### 4. Primer uso
1. Abrí la URL de Vercel y creá tu cuenta (email + contraseña).
2. Como es una app de un solo usuario: en Supabase → **Authentication → Sign In / Providers**, desactivá **Allow new users to sign up**.
3. En el iPhone: Compartir → *Agregar a pantalla de inicio* para usarla como app a pantalla completa.
4. Recomendado: en **Perfil → Modelos de IA → Precargar ahora**, con wifi.

## Desarrollo local
```bash
npm install            # si falla onnxruntime-node por la red: npm install --ignore-scripts
cp .env.example .env   # completá las dos variables (o dejalo vacío para modo demo)
npm run dev
```

## Estructura
```
src/
  config/brand.ts        nombre y color de acento (cambiar acá la identidad)
  lib/taxonomy.ts        categorías, colores, estilos, marcas (base del etiquetado y del futuro generador)
  lib/ai/                worker de IA, cliente y pipeline de procesamiento de fotos
  lib/store/             capa de datos: Supabase o local (misma interfaz)
  pages/                 Clóset, Agregar prendas, Perfil, placeholders
  components/            UI (botones, chips, sheet), formulario de prenda, tarjeta
supabase/schema.sql      tabla, bucket y políticas RLS
```

## Próximas entregas
2. Generador de outfits por ocasión (reglas + clima con Open-Meteo + like/dislike).
3. Calendario mensual.
4. Avatar y prueba virtual (Space gratuito de Hugging Face, con resultado cacheado).
5. Wishlist, estadísticas, modo valija.
