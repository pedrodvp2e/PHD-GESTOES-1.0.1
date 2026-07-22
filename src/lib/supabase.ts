import { createClient } from '@supabase/supabase-js';
import { Profile, Project, ProjectMember, Task, Material, Message, LocalNotification, UserRole, DiaryEntry, SafetyChecklistItem, IncidentReport, BudgetItem, CashFlowEntry, SupplierQuote, Payment, MaterialReceipt } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isRealSupabaseConfigured = supabaseUrl && supabaseAnonKey;
export { isRealSupabaseConfigured };

export const realSupabase = isRealSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true, // mantém o login salvo no aparelho entre aberturas do app
        storage: window.localStorage,
        storageKey: 'phd-gestoes-auth',
        autoRefreshToken: true, // renova o login sozinho antes de expirar
        detectSessionInUrl: false, // evita conflito de sessão dentro do app nativo (sem navegador)
      },
    })
  : null;

// ==========================================
// MOCK DATABASE & CLIENT SIMULATOR
// ==========================================

// Gera o próximo código sequencial no formato PHD-0000 com base nos códigos já existentes
export function generateMemberCode(existingProfiles: Profile[]): string {
  let maxNumber = 0;
  existingProfiles.forEach((p) => {
    const match = p.member_code?.match(/^PHD-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNumber) maxNumber = n;
    }
  });
  const next = maxNumber + 1;
  return `PHD-${String(next).padStart(4, '0')}`;
}

const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-joao',
    full_name: 'João Silva',
    role: 'engenheiro',
    phone: '(11) 98765-4321',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    created_at: new Date().toISOString(),
    member_code: 'PHD-0001',
  },
  {
    id: 'user-pedro',
    full_name: 'Pedro Danelon',
    role: 'mestre_obra',
    phone: '(11) 91234-5678',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    created_at: new Date().toISOString(),
    member_code: 'PHD-0002',
  },
  {
    id: 'user-carlos',
    full_name: 'Carlos Santos',
    role: 'encarregado',
    phone: '(11) 97777-8888',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    created_at: new Date().toISOString(),
    member_code: 'PHD-0003',
  },
  {
    id: 'user-lucas',
    full_name: 'Lucas Souza',
    role: 'funcionario',
    phone: '(11) 96666-5555',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    created_at: new Date().toISOString(),
    member_code: 'PHD-0004',
  },
  {
    id: 'user-marcos',
    full_name: 'Marcos Lima',
    role: 'funcionario',
    phone: '(11) 95555-4444',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    created_at: new Date().toISOString(),
    member_code: 'PHD-0005',
  }
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Residencial Bella Vista',
    client_name: 'Construtora Alfa',
    address: 'Av. Paulista, 1000 - São Paulo, SP',
    description: 'Construção de edifício residencial de 12 andares com área de lazer completa e acabamento de alto padrão.',
    status: 'em_andamento',
    start_date: '2026-01-10',
    deadline: '2026-12-15',
    progress: 65,
    created_by: 'user-joao',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'proj-2',
    name: 'Reforma Comercial Centro',
    client_name: 'Shopping Plaza',
    address: 'Rua Direita, 250 - São Paulo, SP',
    description: 'Reforma completa do segundo piso do shopping comercial, incluindo novas instalações elétricas e acabamentos.',
    status: 'em_andamento',
    start_date: '2026-06-01',
    deadline: '2026-10-30',
    progress: 25,
    created_by: 'user-joao',
    created_at: '2026-05-15T10:30:00Z',
  },
  {
    id: 'proj-3',
    name: 'Duplicação Galpão Industrial',
    client_name: 'Metalúrgica Oeste',
    address: 'Rodovia Castelo Branco, Km 42 - Barueri, SP',
    description: 'Ampliação da área útil de estocagem de bobinas de aço com cobertura metálica reforçada de 1.500m².',
    status: 'concluido',
    start_date: '2026-02-15',
    deadline: '2026-07-01',
    progress: 100,
    created_by: 'user-joao',
    created_at: '2026-02-10T09:00:00Z',
  }
];

const INITIAL_MEMBERS: ProjectMember[] = [
  { id: 'm-1', project_id: 'proj-1', user_id: 'user-joao', project_role: 'engenheiro', created_at: new Date().toISOString() },
  { id: 'm-2', project_id: 'proj-1', user_id: 'user-pedro', project_role: 'mestre_obra', created_at: new Date().toISOString() },
  { id: 'm-3', project_id: 'proj-1', user_id: 'user-carlos', project_role: 'encarregado', created_at: new Date().toISOString() },
  { id: 'm-4', project_id: 'proj-1', user_id: 'user-lucas', project_role: 'funcionario', created_at: new Date().toISOString() },
  { id: 'm-5', project_id: 'proj-2', user_id: 'user-joao', project_role: 'engenheiro', created_at: new Date().toISOString() },
  { id: 'm-6', project_id: 'proj-2', user_id: 'user-pedro', project_role: 'mestre_obra', created_at: new Date().toISOString() },
  { id: 'm-7', project_id: 'proj-2', user_id: 'user-marcos', project_role: 'funcionario', created_at: new Date().toISOString() },
];

const INITIAL_TASKS: Task[] = [
  // Residencial Bella Vista tasks
  {
    id: 'task-101',
    project_id: 'proj-1',
    title: 'Fundação e Estacas de Concreto',
    description: 'Perfuração e concretagem de estacas hélice contínua conforme projeto estrutural.',
    category: 'Fundação',
    status: 'concluido',
    progress: 100,
    start_date: '2026-01-12',
    deadline: '2026-02-28',
    assigned_to: 'user-carlos',
    created_by: 'user-joao',
    created_at: '2026-01-10T12:00:00Z',
  },
  {
    id: 'task-102',
    project_id: 'proj-1',
    title: 'Estrutura do 3º ao 6º Andar',
    description: 'Armação, forma e concretagem de lajes e pilares dos andares intermediários.',
    category: 'Estrutura',
    status: 'em_andamento',
    progress: 60,
    start_date: '2026-05-01',
    deadline: '2026-08-30',
    assigned_to: 'user-pedro',
    created_by: 'user-joao',
    created_at: '2026-04-20T10:00:00Z',
  },
  {
    id: 'task-103',
    project_id: 'proj-1',
    title: 'Alvenaria de Vedação (Tijolos)',
    description: 'Levantamento de paredes externas e divisórias internas de tijolos cerâmicos.',
    category: 'Alvenaria',
    status: 'em_andamento',
    progress: 35,
    start_date: '2026-06-15',
    deadline: '2026-09-15',
    assigned_to: 'user-lucas',
    created_by: 'user-joao',
    created_at: '2026-06-10T14:00:00Z',
  },
  {
    id: 'task-104',
    project_id: 'proj-1',
    title: 'Instalações Hidráulicas Subsolo',
    description: 'Passagem de tubulações de esgoto, águas pluviais e alimentação predial de água fria.',
    category: 'Instalações',
    status: 'pendente',
    progress: 0,
    start_date: '2026-08-01',
    deadline: '2026-09-30',
    assigned_to: 'user-marcos',
    created_by: 'user-joao',
    created_at: '2026-07-01T15:00:00Z',
  },
  // Reforma Comercial Centro tasks
  {
    id: 'task-201',
    project_id: 'proj-2',
    title: 'Demolição de Divisórias Existentes',
    description: 'Retirada de drywall, gesso e divisórias antigas de madeira e vidro.',
    category: 'Demolição',
    status: 'concluido',
    progress: 100,
    start_date: '2026-06-02',
    deadline: '2026-06-12',
    assigned_to: 'user-lucas',
    created_by: 'user-joao',
    created_at: '2026-05-28T09:00:00Z',
  },
  {
    id: 'task-202',
    project_id: 'proj-2',
    title: 'Instalações Elétricas de Potência',
    description: 'Passagem de cabos flexíveis, montagem de disjuntores e distribuição de tomadas trifásicas.',
    category: 'Elétrica',
    status: 'em_andamento',
    progress: 15,
    start_date: '2026-06-15',
    deadline: '2026-08-10',
    assigned_to: 'user-marcos',
    created_by: 'user-joao',
    created_at: '2026-06-10T11:00:00Z',
  }
];

const INITIAL_MATERIALS: Material[] = [
  // Residencial Bella Vista materials
  {
    id: 'mat-1',
    project_id: 'proj-1',
    name: 'Cimento Portland CP II',
    unit: 'Sacos',
    needed_quantity: 800,
    acquired_quantity: 620,
    notes: 'Cimento ensacado de 50kg. Armazenar em local seco sobre paletes.',
    created_by: 'user-joao',
    created_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 'mat-2',
    project_id: 'proj-1',
    name: 'Aço CA-50 10mm (3/8")',
    unit: 'kg',
    needed_quantity: 2500,
    acquired_quantity: 2400,
    notes: 'Barras de 12 metros para ferragem armada de vigas e pilares.',
    created_by: 'user-joao',
    created_at: '2026-01-10T09:10:00Z',
  },
  {
    id: 'mat-3',
    project_id: 'proj-1',
    name: 'Areia Fina Lavada',
    unit: 'm³',
    needed_quantity: 150,
    acquired_quantity: 42,
    notes: 'Uso imediato em reboco interno. Nível de estoque em alerta!',
    created_by: 'user-joao',
    created_at: '2026-01-10T09:20:00Z',
  },
  {
    id: 'mat-4',
    project_id: 'proj-1',
    name: 'Tijolo Cerâmico 8 Furos',
    unit: 'Milheiro',
    needed_quantity: 22,
    acquired_quantity: 20,
    notes: 'Entregue diretamente na frente de trabalho.',
    created_by: 'user-joao',
    created_at: '2026-01-10T09:30:00Z',
  },
  // Reforma Comercial Centro materials
  {
    id: 'mat-5',
    project_id: 'proj-2',
    name: 'Placas Drywall Standard 120x240cm',
    unit: 'Placas',
    needed_quantity: 120,
    acquired_quantity: 120,
    notes: 'Placas de drywall para fechamento de escritórios.',
    created_by: 'user-joao',
    created_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'mat-6',
    project_id: 'proj-2',
    name: 'Disjuntor Termomagnético 20A Bipolar',
    unit: 'Unid',
    needed_quantity: 35,
    acquired_quantity: 8,
    notes: 'Disjuntores padrão DIN para montagem dos quadros elétricos.',
    created_by: 'user-joao',
    created_at: '2026-06-02T10:10:00Z',
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    project_id: 'proj-1',
    user_id: 'user-joao',
    content: 'Olá equipe! Vamos iniciar hoje a concretagem das lajes do 4º andar. Carlos, verifique se a bomba de concreto e as fôrmas estão prontas.',
    created_at: '2026-07-15T08:30:00Z'
  },
  {
    id: 'msg-2',
    project_id: 'proj-1',
    user_id: 'user-pedro',
    content: 'Tudo pronto por aqui, engenheiro João. Caminhão betoneira programado para chegar às 10h. Equipe de armadores já está posicionada.',
    created_at: '2026-07-15T08:45:00Z'
  },
  {
    id: 'msg-3',
    project_id: 'proj-1',
    user_id: 'user-carlos',
    content: 'Verifiquei o escoramento das fôrmas, está 100% seguro. Liberado para o lançamento do concreto.',
    created_at: '2026-07-15T09:12:00Z'
  },
  {
    id: 'msg-4',
    project_id: 'proj-2',
    user_id: 'user-joao',
    content: 'Marcos, o eletricista já passou os conduítes do forro?',
    created_at: '2026-07-15T14:20:00Z'
  },
  {
    id: 'msg-5',
    project_id: 'proj-2',
    user_id: 'user-marcos',
    content: 'Sim, João! Finalizei no fim da manhã. Agora vamos iniciar a fiação das salas principais.',
    created_at: '2026-07-15T15:05:00Z'
  }
];

const INITIAL_NOTIFICATIONS: LocalNotification[] = [
  {
    id: 'notif-1',
    type: 'material_low',
    title: 'Estoque Baixo: Areia Fina',
    message: 'O estoque de Areia Fina Lavada na obra Residencial Bella Vista está abaixo de 30% do total planejado. Solicitar nova remessa.',
    projectId: 'proj-1',
    projectName: 'Residencial Bella Vista',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2h atrás
    read: false,
  },
  {
    id: 'notif-2',
    type: 'task_deadline',
    title: 'Prazo Próximo: Instalações Elétricas',
    message: 'A tarefa "Instalações Elétricas de Potência" na obra Reforma Comercial Centro vence em menos de 10 dias.',
    projectId: 'proj-2',
    projectName: 'Reforma Comercial Centro',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12h atrás
    read: false,
  },
  {
    id: 'notif-3',
    type: 'system',
    title: 'Boas-vindas ao Gestão de Obras',
    message: 'O sistema de controle e planejamento está ativo. Comece a gerenciar os suprimentos, serviços e equipe das suas obras.',
    projectId: '',
    projectName: '',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), // 48h atrás
    read: true,
  }
];

class MockStorage {
  private get<T>(key: string, defaults: T): T {
    const data = localStorage.getItem(key);
    if (!data) {
      this.set(key, defaults);
      return defaults;
    }
    return JSON.parse(data) as T;
  }

  private set<T>(key: string, data: T) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  getProfiles(): Profile[] { return this.get('mock_profiles', INITIAL_PROFILES); }
  // Busca um único perfil pelo código PHD-0000 (exato, sem diferenciar maiúsculas) ou pelo telefone
  findProfileByCodeOrPhone(search: string): Profile | undefined {
    const term = search.trim();
    if (!term) return undefined;
    const normalizedCode = term.toUpperCase();
    const digitsOnly = term.replace(/\D/g, '');
    return this.getProfiles().find((p) => {
      if (p.member_code && p.member_code.toUpperCase() === normalizedCode) return true;
      if (digitsOnly.length >= 8 && p.phone) {
        const phoneDigits = p.phone.replace(/\D/g, '');
        if (phoneDigits === digitsOnly) return true;
      }
      return false;
    });
  }
  setProfiles(data: Profile[]) { this.set('mock_profiles', data); }

  getProjects(): Project[] { return this.get('mock_projects', INITIAL_PROJECTS); }
  setProjects(data: Project[]) { this.set('mock_projects', data); }

  getMembers(): ProjectMember[] { return this.get('mock_members', INITIAL_MEMBERS); }
  setMembers(data: ProjectMember[]) { this.set('mock_members', data); }

  getTasks(): Task[] { return this.get('mock_tasks', INITIAL_TASKS); }
  setTasks(data: Task[]) { this.set('mock_tasks', data); }

  getMaterials(): Material[] { return this.get('mock_materials', INITIAL_MATERIALS); }
  setMaterials(data: Material[]) { this.set('mock_materials', data); }

  getMessages(): Message[] { return this.get('mock_messages', INITIAL_MESSAGES); }
  setMessages(data: Message[]) { this.set('mock_messages', data); }

  getNotifications(): LocalNotification[] { return this.get('mock_notifications', INITIAL_NOTIFICATIONS); }
  setNotifications(data: LocalNotification[]) { this.set('mock_notifications', data); }

  getDiaryEntries(): DiaryEntry[] { return this.get('mock_diary_entries', []); }
  setDiaryEntries(data: DiaryEntry[]) { this.set('mock_diary_entries', data); }

  getSafetyItems(): SafetyChecklistItem[] { return this.get('mock_safety_items', []); }
  setSafetyItems(data: SafetyChecklistItem[]) { this.set('mock_safety_items', data); }

  getIncidents(): IncidentReport[] { return this.get('mock_incidents', []); }
  setIncidents(data: IncidentReport[]) { this.set('mock_incidents', data); }

  getBudgetItems(): BudgetItem[] { return this.get('mock_budget_items', []); }
  setBudgetItems(data: BudgetItem[]) { this.set('mock_budget_items', data); }

  getCashFlow(): CashFlowEntry[] { return this.get('mock_cash_flow', []); }
  setCashFlow(data: CashFlowEntry[]) { this.set('mock_cash_flow', data); }

  getSupplierQuotes(): SupplierQuote[] { return this.get('mock_supplier_quotes', []); }
  setSupplierQuotes(data: SupplierQuote[]) { this.set('mock_supplier_quotes', data); }

  getPayments(): Payment[] { return this.get('mock_payments', []); }
  setPayments(data: Payment[]) { this.set('mock_payments', data); }

  getMaterialReceipts(): MaterialReceipt[] { return this.get('mock_material_receipts', []); }
  setMaterialReceipts(data: MaterialReceipt[]) { this.set('mock_material_receipts', data); }
}

export const mockDb = new MockStorage();

// ==========================================
// SIMULATED CLIENT OPERATIONS
// ==========================================

const authListeners = new Set<(event: string, session: any) => void>();

const notifyAuthListeners = () => {
  const activeUser = localStorage.getItem('mock_active_user');
  if (activeUser) {
    const profile = JSON.parse(activeUser) as Profile;
    authListeners.forEach(callback => {
      try {
        callback('SIGNED_IN', { user: { id: profile.id, email: `${profile.id}@obras.com` } });
      } catch (e) {
        console.error(e);
      }
    });
  } else {
    authListeners.forEach(callback => {
      try {
        callback('SIGNED_OUT', null);
      } catch (e) {
        console.error(e);
      }
    });
  }
};

export const supabaseMock = {
  auth: {
    getSession: async () => {
      const activeUser = localStorage.getItem('mock_active_user');
      if (activeUser) {
        const profile = JSON.parse(activeUser) as Profile;
        return { data: { session: { user: { id: profile.id, email: `${profile.id}@obras.com` } } } };
      }
      return { data: { session: null } };
    },
    signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
      const profiles = mockDb.getProfiles();
      const cleanEmail = email.toLowerCase().trim();
      // Look for a profile matching before the @ or full email
      const userPart = cleanEmail.split('@')[0];
      let found = profiles.find(p => p.id === userPart || `${p.id}@obras.com` === cleanEmail || p.full_name.toLowerCase().includes(userPart));
      
      if (!found) {
        // Create an on-the-fly engineer or use default João Silva
        found = profiles.find(p => p.role === 'engenheiro') || profiles[0];
      }

      localStorage.setItem('mock_active_user', JSON.stringify(found));
      notifyAuthListeners();
      return { data: { session: { user: { id: found.id, email: `${found.id}@obras.com` } } }, error: null };
    },
    signUp: async ({ email, options }: { email: string; options: { data: any } }) => {
      const profiles = mockDb.getProfiles();
      const phoneDigits = (options.data.phone || '').replace(/\D/g, '');
      if (phoneDigits) {
        const phoneTaken = profiles.some(p => p.phone && p.phone.replace(/\D/g, '') === phoneDigits);
        if (phoneTaken) {
          return { data: { session: null, user: null }, error: { message: 'Esse telefone já está cadastrado em outra conta (duplicate phone).' } };
        }
      }
      const userPart = email.split('@')[0];
      const newProfile: Profile = {
        id: `user-${userPart}`,
        full_name: options.data.full_name || 'Novo Usuário',
        role: options.data.role || 'funcionario',
        phone: options.data.phone || null,
        avatar_url: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=150`,
        created_at: new Date().toISOString(),
        member_code: generateMemberCode(profiles),
      };
      profiles.push(newProfile);
      mockDb.setProfiles(profiles);
      localStorage.setItem('mock_active_user', JSON.stringify(newProfile));
      notifyAuthListeners();
      const user = { id: newProfile.id, email };
      return { data: { session: { user }, user }, error: null };
    },
    resetPasswordForEmail: async (_email: string, _options?: any) => {
      // Modo demo: não há e-mail real para enviar, então apenas simula sucesso.
      return { data: {}, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('mock_active_user');
      notifyAuthListeners();
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      authListeners.add(callback);
      const handleStorageChange = () => {
        const activeUser = localStorage.getItem('mock_active_user');
        if (activeUser) {
          const profile = JSON.parse(activeUser) as Profile;
          callback('SIGNED_IN', { user: { id: profile.id, email: `${profile.id}@obras.com` } });
        } else {
          callback('SIGNED_OUT', null);
        }
      };
      window.addEventListener('storage', handleStorageChange);
      // Call once initially
      const activeUser = localStorage.getItem('mock_active_user');
      if (activeUser) {
        const profile = JSON.parse(activeUser) as Profile;
        callback('SIGNED_IN', { user: { id: profile.id, email: `${profile.id}@obras.com` } });
      } else {
        callback('SIGNED_OUT', null);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
              window.removeEventListener('storage', handleStorageChange);
            }
          }
        }
      };
    }
  },

  from: (table: string) => {
    return {
      select: (fields?: string) => {
        return {
          eq: (field: string, value: any) => {
            return {
              order: (orderField: string, options?: { ascending: boolean }) => {
                return {
                  maybeSingle: async () => {
                    const data = getTableData(table);
                    const item = data.find((x: any) => x[field] === value);
                    return { data: item || null, error: null };
                  },
                  single: async () => {
                    const data = getTableData(table);
                    const item = data.find((x: any) => x[field] === value);
                    return { data: item || null, error: null };
                  },
                  then: async (resolve: any) => {
                    const data = getTableData(table);
                    let filtered = data.filter((x: any) => x[field] === value);
                    if (orderField) {
                      filtered = sortData(filtered, orderField, options?.ascending);
                    }
                    resolve({ data: attachAssociations(table, filtered), error: null });
                  }
                };
              },
              maybeSingle: async () => {
                const data = getTableData(table);
                const item = data.find((x: any) => x[field] === value);
                return { data: item || null, error: null };
              },
              single: async () => {
                const data = getTableData(table);
                const item = data.find((x: any) => x[field] === value);
                return { data: item || null, error: null };
              },
              then: async (resolve: any) => {
                const data = getTableData(table);
                const filtered = data.filter((x: any) => x[field] === value);
                resolve({ data: attachAssociations(table, filtered), error: null });
              }
            };
          },
          order: (orderField: string, options?: { ascending: boolean }) => {
            return {
              then: async (resolve: any) => {
                const data = getTableData(table);
                const sorted = sortData(data, orderField, options?.ascending);
                resolve({ data: attachAssociations(table, sorted), error: null });
              }
            };
          },
          then: async (resolve: any) => {
            const data = getTableData(table);
            resolve({ data: attachAssociations(table, data), error: null });
          }
        };
      },

      insert: (itemOrItems: any) => {
        return {
          select: () => {
            return {
              single: async () => {
                const data = getTableData(table);
                const newItem = {
                  id: itemOrItems.id || `${table.substring(0, 3)}-${Date.now()}`,
                  created_at: new Date().toISOString(),
                  ...itemOrItems
                };
                data.push(newItem);
                setTableData(table, data);
                return { data: newItem, error: null };
              },
              then: async (resolve: any) => {
                const data = getTableData(table);
                const multiple = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
                const newItems = multiple.map((x, idx) => ({
                  id: x.id || `${table.substring(0, 3)}-${Date.now()}-${idx}`,
                  created_at: new Date().toISOString(),
                  ...x
                }));
                data.push(...newItems);
                setTableData(table, data);
                resolve({ data: newItems, error: null });
              }
            };
          }
        };
      },

      update: (updates: any) => {
        return {
          eq: (field: string, value: any) => {
            return {
              select: () => {
                return {
                  single: async () => {
                    const data = getTableData(table);
                    const idx = data.findIndex((x: any) => x[field] === value);
                    if (idx !== -1) {
                      data[idx] = { ...data[idx], ...updates };
                      setTableData(table, data);
                      return { data: data[idx], error: null };
                    }
                    return { data: null, error: { message: 'Item not found' } };
                  }
                };
              },
              then: async (resolve: any) => {
                const data = getTableData(table);
                let updatedItems: any[] = [];
                const updated = data.map((x: any) => {
                  if (x[field] === value) {
                    const u = { ...x, ...updates };
                    updatedItems.push(u);
                    return u;
                  }
                  return x;
                });
                setTableData(table, updated);
                resolve({ data: updatedItems, error: null });
              }
            };
          }
        };
      },

      delete: () => {
        return {
          eq: (field: string, value: any) => {
            return {
              then: async (resolve: any) => {
                const data = getTableData(table);
                const filtered = data.filter((x: any) => x[field] !== value);
                setTableData(table, filtered);
                resolve({ error: null });
              }
            };
          }
        };
      }
    };
  }
};

function getTableData(table: string): any[] {
  switch (table) {
    case 'profiles': return mockDb.getProfiles();
    case 'projects': return mockDb.getProjects();
    case 'project_members': return mockDb.getMembers();
    case 'tasks': return mockDb.getTasks();
    case 'materials': return mockDb.getMaterials();
    case 'messages': return mockDb.getMessages();
    default: return [];
  }
}

function setTableData(table: string, data: any[]) {
  switch (table) {
    case 'profiles': mockDb.setProfiles(data); break;
    case 'projects': mockDb.setProjects(data); break;
    case 'project_members': mockDb.setMembers(data); break;
    case 'tasks': mockDb.setTasks(data); break;
    case 'materials': mockDb.setMaterials(data); break;
    case 'messages': mockDb.setMessages(data); break;
  }
}

function sortData(data: any[], field: string, ascending = true): any[] {
  return [...data].sort((a, b) => {
    const valA = a[field] ?? '';
    const valB = b[field] ?? '';
    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;
  });
}

function attachAssociations(table: string, items: any[]): any[] {
  if (table === 'messages' || table === 'project_members') {
    const profiles = mockDb.getProfiles();
    return items.map(item => {
      const prof = profiles.find(p => p.id === item.user_id);
      return {
        ...item,
        profiles: prof || null
      };
    });
  }
  return items;
}

// Export active client: Mock is preferred so the application works seamlessly
export const supabase = isRealSupabaseConfigured && realSupabase ? realSupabase : (supabaseMock as any);

// ==========================================
// AVATAR UPLOAD (foto de perfil)
// ==========================================
// Faz upload da foto de perfil do usuário. Usa o Supabase Storage (bucket
// "avatars") quando o projeto está com Supabase real configurado; caso
// contrário, converte a imagem em base64 e guarda localmente (mock).
export async function uploadAvatar(userId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  // Validações básicas
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'Selecione um arquivo de imagem válido.' };
  }
  const MAX_SIZE_MB = 5;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { url: null, error: `A imagem deve ter no máximo ${MAX_SIZE_MB}MB.` };
  }

  if (isRealSupabaseConfigured && realSupabase) {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await realSupabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) {
        return { url: null, error: uploadError.message };
      }

      const { data: publicUrlData } = realSupabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await realSupabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        return { url: null, error: updateError.message };
      }

      return { url: publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err?.message || 'Falha ao enviar a imagem.' };
    }
  }

  // Modo mock/sandbox: converte para base64 e salva no localStorage
  try {
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const profiles = mockDb.getProfiles();
    const idx = profiles.findIndex((p) => p.id === userId);
    if (idx !== -1) {
      profiles[idx] = { ...profiles[idx], avatar_url: base64 };
      mockDb.setProfiles(profiles);
      const activeUser = localStorage.getItem('mock_active_user');
      if (activeUser) {
        const parsed = JSON.parse(activeUser);
        if (parsed.id === userId) {
          localStorage.setItem('mock_active_user', JSON.stringify({ ...parsed, avatar_url: base64 }));
        }
      }
    }

    return { url: base64, error: null };
  } catch (err: any) {
    return { url: null, error: err?.message || 'Falha ao processar a imagem.' };
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  engenheiro: 'Engenheiro',
  mestre_obra: 'Mestre de Obras',
  encarregado: 'Encarregado',
  funcionario: 'Funcionário',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#ef4444',
  engenheiro: '#0066ff',
  mestre_obra: '#00c896',
  encarregado: '#f59e0b',
  funcionario: '#475569',
};

export const STATUS_LABELS: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  pendente: 'Pendente',
};

export const STATUS_COLORS: Record<string, string> = {
  planejamento: '#94a3b8',
  em_andamento: '#0066ff',
  pausado: '#f59e0b',
  concluido: '#00c896',
  pendente: '#94a3b8',
};
