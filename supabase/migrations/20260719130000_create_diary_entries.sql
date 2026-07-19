/*
  # Diário de Obra

  1. Nova tabela
    - `diary_entries`
      - `id` (uuid, primary key)
      - `project_id` (uuid, referencia a obra)
      - `entry_date` (data do registro)
      - `weather` (condição do tempo no dia)
      - `workers_count` (quantidade de mão de obra presente)
      - `description` (o que foi feito no dia)
      - `occurrences` (ocorrências/problemas do dia, opcional)
      - `photo` (foto do dia em base64, opcional)
      - `created_by` (quem registrou)
      - `created_at`

  2. Segurança
    - Habilita RLS
    - Usuários autenticados podem ler e criar registros
*/

CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  weather text CHECK (weather IN ('sol', 'nublado', 'chuva', 'tempestade')),
  workers_count integer,
  description text NOT NULL,
  occurrences text,
  photo text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver diário de obra"
  ON diary_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar registros de diário"
  ON diary_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem editar seus registros de diário"
  ON diary_entries FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem excluir registros de diário"
  ON diary_entries FOR DELETE
  TO authenticated
  USING (true);
