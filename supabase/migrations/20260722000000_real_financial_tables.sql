-- ============================================================================
-- Move o "Financeiro" (orçamento, fluxo de caixa, cotações, pagamentos e
-- notas de materiais) do armazenamento local do aparelho (localStorage) pro
-- banco de dados real, com sincronização entre todos os membros da obra —
-- igual já acontece com tarefas, materiais e mensagens.
-- ============================================================================

-- BUDGET ITEMS (orçamento previsto x realizado) -------------------------------
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category text NOT NULL,
  planned_value numeric(14,2) NOT NULL DEFAULT 0,
  actual_value numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- CASH FLOW (entradas e saídas de caixa) --------------------------------------
CREATE TABLE IF NOT EXISTS cash_flow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('entrada', 'saida')),
  description text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  category text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;

-- SUPPLIER QUOTES (cotações de fornecedores por material) ---------------------
CREATE TABLE IF NOT EXISTS supplier_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;

-- PAYMENTS (pagamentos a fornecedores e funcionários) -------------------------
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payee_name text NOT NULL,
  payee_type text NOT NULL CHECK (payee_type IN ('fornecedor', 'funcionario')),
  amount numeric(14,2) NOT NULL DEFAULT 0,
  due_date date,
  paid_date date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- MATERIAL RECEIPTS (notas fiscais/comprovantes de compra de material) -------
-- Observação: a coluna "photo" guarda só a URL do arquivo no Storage
-- (bucket "project-photos"), não mais a imagem em base64.
CREATE TABLE IF NOT EXISTS material_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  purchased_at date NOT NULL,
  photo text NOT NULL,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE material_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS: mesmo padrão usado em "materials" — só membros da obra podem
-- ler/inserir/editar/apagar os registros financeiros daquela obra.
-- ============================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['budget_items', 'cash_flow', 'supplier_quotes', 'payments', 'material_receipts']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "select_member_%1$s" ON %1$s', t);
    EXECUTE format($f$
      CREATE POLICY "select_member_%1$s" ON %1$s FOR SELECT
        TO authenticated USING (
          EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = %1$s.project_id AND project_members.user_id = auth.uid())
        )
    $f$, t);

    EXECUTE format('DROP POLICY IF EXISTS "insert_member_%1$s" ON %1$s', t);
    EXECUTE format($f$
      CREATE POLICY "insert_member_%1$s" ON %1$s FOR INSERT
        TO authenticated WITH CHECK (
          EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = %1$s.project_id AND project_members.user_id = auth.uid())
        )
    $f$, t);

    EXECUTE format('DROP POLICY IF EXISTS "update_member_%1$s" ON %1$s', t);
    EXECUTE format($f$
      CREATE POLICY "update_member_%1$s" ON %1$s FOR UPDATE
        TO authenticated USING (
          EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = %1$s.project_id AND project_members.user_id = auth.uid())
        ) WITH CHECK (
          EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = %1$s.project_id AND project_members.user_id = auth.uid())
        )
    $f$, t);

    EXECUTE format('DROP POLICY IF EXISTS "delete_member_%1$s" ON %1$s', t);
    EXECUTE format($f$
      CREATE POLICY "delete_member_%1$s" ON %1$s FOR DELETE
        TO authenticated USING (
          EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = %1$s.project_id AND project_members.user_id = auth.uid())
        )
    $f$, t);
  END LOOP;
END $$;

-- Índices básicos por obra, para as consultas mais comuns
CREATE INDEX IF NOT EXISTS idx_budget_items_project ON budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_project ON cash_flow(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_project ON supplier_quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_material_receipts_project ON material_receipts(project_id);

-- ============================================================================
-- CURVA S: histórico de progresso físico x financeiro ao longo do tempo
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  physical_progress numeric(5,2) NOT NULL DEFAULT 0,
  financial_progress numeric(5,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, snapshot_date)
);
ALTER TABLE progress_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_member_progress_snapshots" ON progress_snapshots;
CREATE POLICY "select_member_progress_snapshots" ON progress_snapshots FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = progress_snapshots.project_id AND project_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_member_progress_snapshots" ON progress_snapshots;
CREATE POLICY "insert_member_progress_snapshots" ON progress_snapshots FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = progress_snapshots.project_id AND project_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_member_progress_snapshots" ON progress_snapshots;
CREATE POLICY "update_member_progress_snapshots" ON progress_snapshots FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = progress_snapshots.project_id AND project_members.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM project_members WHERE project_members.project_id = progress_snapshots.project_id AND project_members.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_progress_snapshots_project ON progress_snapshots(project_id);
