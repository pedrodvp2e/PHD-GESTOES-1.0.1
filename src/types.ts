export type UserRole = 'engenheiro' | 'mestre_obra' | 'encarregado' | 'funcionario' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
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
