-- ============================================================================
-- Impede telefones duplicados entre contas (profiles.phone).
-- O nome (full_name) continua sem restrição, como já era.
-- ============================================================================

-- 1) Antes de travar a unicidade, resolve duplicatas que já existam:
--    mantém o telefone na conta mais antiga e limpa (NULL) nas contas mais
--    novas que estejam duplicadas, para não travar a migração.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM (
      SELECT id, phone,
             ROW_NUMBER() OVER (
               PARTITION BY regexp_replace(phone, '\D', '', 'g')
               ORDER BY created_at ASC
             ) AS rn
      FROM profiles
      WHERE phone IS NOT NULL AND regexp_replace(phone, '\D', '', 'g') <> ''
    ) dups
    WHERE rn > 1
  LOOP
    UPDATE profiles SET phone = NULL WHERE id = r.id;
  END LOOP;
END $$;

-- 2) Índice único pelo telefone "normalizado" (só dígitos), permitindo
--    vários NULLs (quem não informou telefone) sem conflito.
DROP INDEX IF EXISTS profiles_phone_unique_idx;
CREATE UNIQUE INDEX profiles_phone_unique_idx
  ON profiles (regexp_replace(phone, '\D', '', 'g'))
  WHERE phone IS NOT NULL AND regexp_replace(phone, '\D', '', 'g') <> '';
