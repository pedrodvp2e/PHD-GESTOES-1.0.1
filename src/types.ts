export type UserRole = 'engenheiro' | 'mestre_obra' | 'encarregado' | 'funcionario' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  member_code: string;
}

export interface Project {
  id: string;
  name: string;
  client_name: string | null;
  address: string | null;
  description: string | null;
  status: 'planejamento' | 'em_andamento' | 'pausado' | 'concluido';
  start_date: string | null;
  deadline: string | null;
  progress: number;
  built_area_m2?: number | null;
  cover_image?: string | null;
  project_pdf?: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  project_role: UserRole;
  created_at: string;
  profiles?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'pausado';
  progress: number;
  start_date: string | null;
  deadline: string | null;
  assigned_to: string | null; // Profile ID
  created_by: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  duration_seconds: number;
  started_at: string;
  stopped_at: string | null;
  created_at: string;
}

export interface Material {
  id: string;
  project_id: string;
  name: string;
  unit: string;
  needed_quantity: number;
  acquired_quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface LocalNotification {
  id: string;
  type: 'material_low' | 'task_deadline' | 'task_overdue' | 'system';
  title: string;
  message: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  read: boolean;
}

export interface DiaryEntry {
  id: string;
  project_id: string;
  entry_date: string; // YYYY-MM-DD
  weather: 'sol' | 'nublado' | 'chuva' | 'tempestade' | null;
  workers_count: number | null;
  description: string;
  occurrences: string | null; // ocorrências/problemas do dia
  photo?: string | null; // base64
  created_by: string | null;
  created_at: string;
}

export const DEFAULT_SAFETY_ITEMS = [
  'Capacete de segurança',
  'Óculos de proteção',
  'Luvas de proteção',
  'Botina de segurança',
  'Protetor auricular',
  'Cinto de segurança (trabalho em altura)',
  'Máscara respiratória',
  'Sinalização do canteiro',
  'Extintor de incêndio disponível',
  'Kit de primeiros socorros',
];

export interface SafetyChecklistItem {
  id: string;
  project_id: string;
  label: string;
  completed: boolean;
  checked_by: string | null;
  checked_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface IncidentReport {
  id: string;
  project_id: string;
  occurred_at: string; // YYYY-MM-DD
  type: 'acidente' | 'quase_acidente' | 'ocorrencia';
  severity: 'leve' | 'moderada' | 'grave';
  description: string;
  injured_person: string | null;
  action_taken: string | null;
  photo?: string | null; // base64
  created_by: string | null;
  created_at: string;
}

// ==========================================
// FINANCEIRO: ORÇAMENTO E FLUXO DE CAIXA
// ==========================================

export interface BudgetItem {
  id: string;
  project_id: string;
  category: string; // ex: Mão de obra, Materiais, Equipamentos, Terceirizados
  planned_value: number; // valor previsto/orçado
  actual_value: number; // valor realizado/gasto até agora
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CashFlowEntry {
  id: string;
  project_id: string;
  entry_date: string; // YYYY-MM-DD
  type: 'entrada' | 'saida';
  description: string;
  amount: number;
  category: string | null;
  created_by: string | null;
  created_at: string;
}

// ==========================================
// ORDEM DE SERVIÇO (OS)
// ==========================================

export interface ServiceOrderMaterialItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface ServiceOrder {
  id: string;
  project_id: string;
  os_number: string; // ex: OS-2026-0042

  // Datas
  issued_at: string; // data/hora de emissão (ISO)
  start_date: string | null; // data prevista de início
  deadline: string | null; // prazo de conclusão

  // Dados da empresa prestadora
  company_name: string;
  company_cnpj: string;
  company_contact: string;
  company_responsible: string; // responsável técnico

  // Dados do cliente
  client_name: string;
  client_document: string; // CPF/CNPJ
  client_phone: string;
  client_email: string;
  client_address: string; // endereço exato de execução

  // Escopo
  problem_description: string;
  execution_description: string;

  // Insumos e mão de obra
  materials: ServiceOrderMaterialItem[];
  team_names: string; // nomes dos profissionais/equipe envolvidos, separados por vírgula

  // Comercial/financeiro
  labor_value: number;
  payment_method: string;

  // Encerramento
  status: 'aberta' | 'em_execucao' | 'concluida' | 'cancelada';
  acceptance_notes: string;
  client_signature_name: string;
  client_signed_at: string | null;
  technician_signature_name: string;
  technician_signed_at: string | null;

  created_by: string | null;
  created_at: string;
}

export interface ProgressSnapshot {
  id: string;
  project_id: string;
  snapshot_date: string; // YYYY-MM-DD — um registro por dia (o mais recente do dia substitui)
  physical_progress: number; // % de progresso físico da obra naquela data
  financial_progress: number; // % do orçamento total já gasto naquela data
  created_by: string | null;
  created_at: string;
}

// ==========================================
// COTAÇÃO DE FORNECEDORES
// ==========================================

export interface SupplierQuote {
  id: string;
  material_id: string;
  project_id: string;
  supplier_name: string;
  unit_price: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ==========================================
// PAGAMENTOS A FORNECEDORES E FUNCIONÁRIOS
// ==========================================

export interface Payment {
  id: string;
  project_id: string;
  payee_name: string;
  payee_type: 'fornecedor' | 'funcionario';
  amount: number;
  due_date: string | null; // YYYY-MM-DD
  paid_date: string | null; // YYYY-MM-DD, null = ainda não pago
  status: 'pendente' | 'pago' | 'atrasado';
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ==========================================
// NOTAS FISCAIS / COMPROVANTES DE MATERIAIS
// ==========================================

export interface MaterialReceipt {
  id: string;
  material_id: string;
  project_id: string;
  amount: number;
  purchased_at: string; // YYYY-MM-DD
  photo: string; // base64 (foto da nota fiscal/comprovante)
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
