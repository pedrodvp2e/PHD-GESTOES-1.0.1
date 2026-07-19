/*
  # Segurança do Trabalho: Checklist de EPI e Registro de Ocorrências

  1. Novas tabelas
    - `safety_checklist_items` — itens de EPI/segurança marcados como
      conferidos ou não, por obra.
    - `incidents` — registro de acidentes, quase-acidentes e ocorrências
      de segurança por obra.

  2. Segurança
    - Habilita RLS
    - Usuários autenticados podem ler, criar, editar e excluir
*/

CREATE TABLE IF NOT EXISTS safety_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  checked_by uuid REFERENCES profiles(id),
  checked_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver checklist de segurança"
  ON safety_checklist_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem criar itens de checklist"
  ON safety_checklist_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar itens de checklist"
  ON safety_checklist_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem excluir itens de checklist"
  ON safety_checklist_items FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  occurred_at date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('acidente', 'quase_acidente', 'ocorrencia')),
  severity text NOT NULL CHECK (severity IN ('leve', 'moderada', 'grave')),
  description text NOT NULL,
  injured_person text,
  action_taken text,
  photo text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver ocorrências"
  ON incidents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem registrar ocorrências"
  ON incidents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem editar ocorrências"
  ON incidents FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem excluir ocorrências"
  ON incidents FOR DELETE TO authenticated USING (true);
