-- Percha · migración 004 (entrega 4: avatar y prueba virtual)
-- Idempotente: se puede correr más de una vez. Pegala en Supabase → SQL Editor → Run.

-- Foto del avatar (ruta en el bucket privado "garments", carpeta del usuario).
-- El render de la prueba virtual ya tiene su columna: outfits.tryon_path (migración 002).
alter table public.preferences add column if not exists avatar_path text;

-- Las imágenes nuevas (avatar-<fecha>.webp y tryon/<outfit>-<fecha>.webp) van a la misma
-- carpeta <uid>/ del bucket, así que alcanzan las políticas de Storage de schema.sql.
