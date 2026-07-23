-- ============================================================================
-- ORDEM DE SERVIÇO (OS) — documento formal de execução de serviço, com
-- cabeçalho, escopo, materiais, valores, condições de pagamento e
-- encerramento/assinaturas. Sincronizado entre os membros da obra.
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  os_number text NOT NULL,

  issued_at timestamptz NOT NULL DEFAULT now(),
  start_date date,
  deadline date,

  company_name text NOT NULL DEFAULT '',
  company_cnpj text NOT NULL DEFAULT '',
  company_contact text NOT NULL DEFAULT '',
  company_responsible text NOT NULL DEFAULT '',

  client_name text NOT NULL DEFAULT '',
  client_document text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  client_address text NOT NULL DEFAULT '',

  problem_description text NOT NULL DEFAULT '',
  execution_description text NOT NULL DEFAULT '',

  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  team_names text NOT NULL DEFAULT '',

  labor_value numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_execucao', 'concluida', 'cancelada')),
  acceptance_notes text NOT NULL DEFAULT '',
  client_signature_name text NOT NULL DEFAULT '',
  client_signed_at timestamptz,
  technician_signature_name text NOT NULL DEFAULT '',
  technician_signed_at timestamptz,

  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),

  UNIQUE (project_id, os_number)
);
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_member_service_orders" ON service_orders;
CREATE POLICY "select_member_service_orders" ON service_orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = service_orders.project_id AND project_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_member_service_orders" ON service_orders;
CREATE POLICY "insert_member_service_orders" ON service_orders FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = service_orders.project_id AND project_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_member_service_orders" ON service_orders;
CREATE POLICY "update_member_service_orders" ON service_orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = service_orders.project_id AND project_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = service_orders.project_id AND project_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_member_service_orders" ON service_orders;
CREATE POLICY "delete_member_service_orders" ON service_orders FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = service_orders.project_id AND project_members.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_service_orders_project ON service_orders(project_id);
