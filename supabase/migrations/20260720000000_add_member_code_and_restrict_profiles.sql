-- ============================================================================
-- Adiciona um código único de membro (PHD-0000) a cada conta e restringe a
-- visibilidade da tabela profiles, que antes era 100% aberta a qualquer
-- usuário autenticado ("select_all_profiles" USING (true)).
--
-- Depois desta migração:
-- 1. Cada perfil tem um member_code único, gerado automaticamente no cadastro.
-- 2. Um usuário só consegue LER (SELECT) o próprio perfil ou perfis de pessoas
--    que já compartilham alguma obra (project_members) com ele.
-- 3. Para adicionar alguém que ainda não compartilha nenhuma obra, existe a
--    função find_profile_by_code_or_phone(), que devolve só os dados básicos
--    de UMA conta específica, buscando por código PHD exato ou telefone
--    exato — nunca a lista inteira de contas.
-- ============================================================================

-- 1) Coluna do código de membro -----------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_code text;

CREATE SEQUENCE IF NOT EXISTS profiles_member_code_seq;

CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_val bigint;
BEGIN
  next_val := nextval('profiles_member_code_seq');
  RETURN 'PHD-' || lpad(next_val::text, 4, '0');
END;
$$;

-- Preenche códigos para contas que já existem, na ordem de criação
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE member_code IS NULL ORDER BY created_at ASC LOOP
    UPDATE profiles SET member_code = public.generate_member_code() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE profiles ALTER COLUMN member_code SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_member_code_unique UNIQUE (member_code);

-- 2) Gera o código automaticamente para novas contas --------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, member_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'funcionario'),
    NEW.raw_user_meta_data->>'phone',
    public.generate_member_code()
  );
  RETURN NEW;
END;
$$;

-- 3) Restringe quem pode ler a tabela profiles ---------------------------------
DROP POLICY IF EXISTS "select_all_profiles" ON profiles;

-- Cada um sempre pode ver o próprio perfil
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- E também os perfis de quem já divide alguma obra com ele
CREATE POLICY "select_profiles_of_shared_projects" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM project_members pm_me
      JOIN project_members pm_other
        ON pm_other.project_id = pm_me.project_id
      WHERE pm_me.user_id = auth.uid()
        AND pm_other.user_id = profiles.id
    )
  );

-- 4) Função de busca segura por código PHD ou telefone -------------------------
-- SECURITY DEFINER: roda com privilégios elevados só para achar UMA conta
-- pelo código/telefone exato, sem expor a listagem completa da tabela.
CREATE OR REPLACE FUNCTION public.find_profile_by_code_or_phone(p_search text)
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  phone text,
  avatar_url text,
  member_code text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.role, p.phone, p.avatar_url, p.member_code, p.created_at
  FROM profiles p
  WHERE p.member_code = upper(trim(p_search))
     OR regexp_replace(p.phone, '\D', '', 'g') = regexp_replace(p_search, '\D', '', 'g')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_profile_by_code_or_phone(text) TO authenticated;
