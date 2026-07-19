import React, { useState, useEffect } from 'react';
import { 
  Building2, HardHat, Package, ClipboardList, Users, Bell, User, 
  Plus, MapPin, Calendar, ChevronRight, X, ArrowRight, Eye, EyeOff, 
  Check, Play, Square, Clock, Send, ShieldAlert, CheckCircle, 
  Search, Sliders, LogOut, CheckSquare, MessageSquare, Briefcase,
  Trash2, Volume2, VolumeX, Sparkles, Filter, Info,
  Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Navigation,
  Camera, Loader2, Phone, MessageCircle
} from 'lucide-react';
import { useAuth } from './lib/auth';
import { requestNotificationPermission, sendNativeNotification } from './lib/notifications';
import appIcon from './assets/images/icon.png';
import { supabase, mockDb, ROLE_LABELS, ROLE_COLORS, STATUS_LABELS, STATUS_COLORS, uploadAvatar, isRealSupabaseConfigured, realSupabase } from './lib/supabase';
import { Project, Task, Material, Message, LocalNotification, UserRole, Profile, ProjectMember } from './types';

export default function App() {
  const { session, profile, loading, signIn, signUp, signOut, refreshProfile } = useAuth();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Normaliza o telefone para uso em links tel: e wa.me (só dígitos,
  // assumindo DDI do Brasil quando o número não vier com código de país)
  const getPhoneLinks = (rawPhone: string | null | undefined) => {
    if (!rawPhone) return null;
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return null;
    const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;
    return {
      tel: `tel:+${withCountryCode}`,
      whatsapp: `https://wa.me/${withCountryCode}`,
    };
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile) return;

    setAvatarUploading(true);
    setAvatarError(null);
    const { error } = await uploadAvatar(profile.id, file);
    if (error) {
      setAvatarError(error);
    } else {
      await refreshProfile();
    }
    setAvatarUploading(false);
  };
  const [activeTab, setActiveTab] = useState<'projects' | 'materials' | 'tasks' | 'team' | 'notifications' | 'profile'>('projects');
  
  // Drill-down project view
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectSubTab, setProjectSubTab] = useState<'overview' | 'tasks' | 'materials' | 'team' | 'messages'>('overview');

  // Authentication mode and form states
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('engenheiro');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // App data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  // Edit Project modal state
  const [showEditProject, setShowEditProject] = useState(false);
  const [editProjId, setEditProjId] = useState<string | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjClient, setEditProjClient] = useState('');
  const [editProjAddress, setEditProjAddress] = useState('');
  const [editProjDeadline, setEditProjDeadline] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjCoverImage, setEditProjCoverImage] = useState('');

  // Manual progress editing state
  const [editingProgressProjId, setEditingProgressProjId] = useState<string | null>(null);
  const [manualProgressValue, setManualProgressValue] = useState(0);

  // Timer state for dynamic service hours
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Notification enhancements states
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('notif_sound_enabled') !== 'false';
  });
  const [stockThreshold, setStockThreshold] = useState<number>(() => {
    return Number(localStorage.getItem('notif_stock_threshold')) || 30;
  });
  const [activeToasts, setActiveToasts] = useState<{ id: string; type: LocalNotification['type']; title: string; message: string; projectName?: string }[]>([]);

  // Notifications filters and creation state
  const [notifSearch, setNotifSearch] = useState('');
  const [notifTypeFilter, setNotifTypeFilter] = useState<'all' | LocalNotification['type']>('all');
  const [notifStatusFilter, setNotifStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [notifProjectFilter, setNotifProjectFilter] = useState<string>('all');

  // Manual Trigger Form
  const [customNotifType, setCustomNotifType] = useState<LocalNotification['type']>('system');
  const [customNotifTitle, setCustomNotifTitle] = useState('');
  const [customNotifMsg, setCustomNotifMsg] = useState('');
  const [customNotifProjId, setCustomNotifProjId] = useState('');

  // Device clock, Date & Weather forecast Integration
  const [currentDeviceTime, setCurrentDeviceTime] = useState<Date>(new Date());
  const [weather, setWeather] = useState<{
    temp: number;
    condition: string;
    icon: string;
    description: string;
    city: string;
    humidity?: number;
    windspeed?: number;
    latitude?: number;
    longitude?: number;
    isReal?: boolean;
  } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');
  const [showAndroidPermissionModal, setShowAndroidPermissionModal] = useState(false);

  // Load and subscribe to DB data
  // Quando o Supabase real está configurado, cada conta enxerga somente os
  // dados das obras em que ela é membro (regra aplicada pelo próprio banco
  // via Row Level Security), então cada usuário passa a ter seu próprio
  // painel individual em vez de compartilhar os dados com todas as contas.
  const loadData = async () => {
    if (isRealSupabaseConfigured && realSupabase && profile) {
      try {
        const [
          { data: projectsData },
          { data: tasksData },
          { data: materialsData },
          { data: profilesData },
          { data: messagesData },
          { data: membersData },
        ] = await Promise.all([
          realSupabase.from('projects').select('*').order('created_at', { ascending: false }),
          realSupabase.from('tasks').select('*'),
          realSupabase.from('materials').select('*'),
          realSupabase.from('profiles').select('*'),
          realSupabase.from('messages').select('*').order('created_at', { ascending: true }),
          realSupabase.from('project_members').select('*'),
        ]);

        setProjects((projectsData as Project[]) || []);
        setTasks((tasksData as Task[]) || []);
        setMaterials((materialsData as Material[]) || []);
        setTeam((profilesData as Profile[]) || []);
        setMessages((messagesData as Message[]) || []);
        setProjectMembers((membersData as ProjectMember[]) || []);
        // Notificações permanecem locais ao dispositivo (não há tabela no banco)
        setNotifications(mockDb.getNotifications());
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
      }
      return;
    }

    // Modo sandbox/demo (sem Supabase real configurado)
    setProjects(mockDb.getProjects());
    setTasks(mockDb.getTasks());
    setMaterials(mockDb.getMaterials());
    setTeam(mockDb.getProfiles());
    setNotifications(mockDb.getNotifications());
    setMessages(mockDb.getMessages());
    setProjectMembers(mockDb.getMembers());
  };

  useEffect(() => {
    loadData();
    // Pede permissão de notificações do sistema (Android/iOS) assim que o app abre
    requestNotificationPermission();
    // Synchronize updates on storage changes (or local action)
    const interval = setInterval(() => {
      setNotifications(mockDb.getNotifications());
    }, 5000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  // Timer ticking
  useEffect(() => {
    let interval: any = null;
    if (activeTimerTaskId) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeTimerTaskId]);

  // Clock updates every second from user's device
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDeviceTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDateLong = (date: Date) => {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = date.getDate();
    const month = date.toLocaleDateString('pt-BR', { month: 'long' });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    const year = date.getFullYear();
    return `${capitalizedWeekday}, ${day} de ${capitalizedMonth} de ${year}`;
  };

  const fetchWeatherByCoords = async (lat: number, lon: number, isReal = true) => {
    try {
      setWeatherLoading(true);
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`);
      const data = await res.json();
      if (data && data.current_weather) {
        const cw = data.current_weather;
        const code = cw.weathercode;
        let condition = "Parcialmente nublado";
        let icon = "Cloud";
        
        if (code === 0) {
          condition = "Céu limpo";
          icon = "Sun";
        } else if ([1, 2, 3].includes(code)) {
          condition = "Parcialmente nublado";
          icon = "CloudSun";
        } else if ([45, 48].includes(code)) {
          condition = "Nevoeiro";
          icon = "CloudFog";
        } else if ([51, 53, 55].includes(code)) {
          condition = "Garoa leve";
          icon = "CloudDrizzle";
        } else if ([61, 63, 65, 80, 81, 82].includes(code)) {
          condition = "Chuva forte";
          icon = "CloudRain";
        } else if ([95, 96, 99].includes(code)) {
          condition = "Tempestade";
          icon = "CloudLightning";
        }

        let cityName = isReal ? "Canteiro Local" : "São Paulo, SP";
        if (isReal) {
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`, {
              headers: { 
                'Accept-Language': 'pt-BR',
                'User-Agent': 'PHDGestoesObras/1.0'
              }
            });
            const geoData = await geoRes.json();
            if (geoData && geoData.address) {
              const city = geoData.address.city || geoData.address.town || geoData.address.suburb || geoData.address.village || "Canteiro Local";
              const state = geoData.address.state ? `, ${geoData.address.state}` : "";
              cityName = `${city}${state}`;
            }
          } catch (e) {
            console.error("OSM Reverse Geocoding failed:", e);
          }
        }

        setWeather({
          temp: Math.round(cw.temperature),
          condition,
          icon,
          description: `Vento: ${Math.round(cw.windspeed)} km/h`,
          city: cityName,
          humidity: data.hourly?.relativehumidity_2m ? data.hourly.relativehumidity_2m[0] : undefined,
          windspeed: cw.windspeed,
          latitude: lat,
          longitude: lon,
          isReal
        });
        setWeatherError(null);
      } else {
        throw new Error("Formato de resposta inválido");
      }
    } catch (err: any) {
      console.error("Erro ao obter previsão do tempo:", err);
      setWeatherError("Erro de conexão com o satélite de clima.");
    } finally {
      setWeatherLoading(false);
    }
  };

  const requestAndroidLocationPermission = () => {
    setPermissionStatus('requesting');
    setShowAndroidPermissionModal(false);
    
    if (!navigator.geolocation) {
      setPermissionStatus('denied');
      setWeatherError("Geolocalização não suportada pelo navegador.");
      fetchWeatherByCoords(-23.5489, -46.6388, false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermissionStatus('granted');
        fetchWeatherByCoords(position.coords.latitude, position.coords.longitude, true);
        
        const localNotifs = mockDb.getNotifications();
        const newNotif: LocalNotification = {
          id: `notif-${Date.now()}`,
          title: "📍 GPS Sincronizado",
          message: `Localização e clima em tempo real integrados com sucesso no canteiro.`,
          type: "system",
          timestamp: new Date().toISOString(),
          read: false
        };
        mockDb.setNotifications([newNotif, ...localNotifs]);
        setNotifications([newNotif, ...localNotifs]);
      },
      (error) => {
        console.error("Erro ao obter geolocalização:", error);
        setPermissionStatus('denied');
        fetchWeatherByCoords(-23.5489, -46.6388, false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        setPermissionStatus(result.state as any);
        if (result.state === 'granted') {
          navigator.geolocation.getCurrentPosition((pos) => {
            fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, true);
          }, () => {
            fetchWeatherByCoords(-23.5489, -46.6388, false);
          });
        } else {
          fetchWeatherByCoords(-23.5489, -46.6388, false);
          if (result.state === 'prompt' && session) {
            const t = setTimeout(() => {
              setShowAndroidPermissionModal(true);
            }, 1500);
            return () => clearTimeout(t);
          }
        }

        result.onchange = () => {
          setPermissionStatus(result.state as any);
          if (result.state === 'granted') {
            navigator.geolocation.getCurrentPosition((pos) => {
              fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, true);
            });
          }
        };
      }).catch(err => {
        console.warn("Permissions API not supported:", err);
        fetchWeatherByCoords(-23.5489, -46.6388, false);
      });
    } else {
      fetchWeatherByCoords(-23.5489, -46.6388, false);
    }
  }, [session]);

  const renderWeatherIcon = (iconName: string | undefined) => {
    if (weatherLoading) return <Clock size={22} className="animate-spin text-accent" />;
    switch (iconName) {
      case 'Sun': return <Sun size={24} className="text-warning fill-warning/10" />;
      case 'Cloud': return <Cloud size={24} className="text-text-secondary" />;
      case 'CloudSun': return <CloudSun size={24} className="text-accent text-amber-500 fill-amber-500/10" />;
      case 'CloudFog': return <CloudFog size={24} className="text-text-light" />;
      case 'CloudDrizzle': return <CloudDrizzle size={24} className="text-primary-light" />;
      case 'CloudRain': return <CloudRain size={24} className="text-primary" />;
      case 'CloudLightning': return <CloudLightning size={24} className="text-error animate-pulse" />;
      default: return <Cloud size={24} className="text-text-secondary" />;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) {
      setAuthError('Preencha email e senha.');
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) setAuthError(error);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao realizar login.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password || !fullName) {
      setAuthError('Preencha os campos obrigatórios (*).');
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = await signUp(email, password, fullName, userRole, phone);
      if (error) setAuthError(error);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao criar conta.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Login (acesso rápido de teste - apenas uma opção)
  const handleQuickLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signIn('joao@obras.com', '123456');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Helper date formatter
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Helper remaining days
  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    const diff = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Reads an image file, resizes it (max 960px wide) and compresses it to
  // JPEG before storing — keeps localStorage from growing too fast with photos
  const handleCoverImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (base64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 960;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setter(canvas.toDataURL('image/jpeg', 0.75));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Create Project
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjAddress, setNewProjAddress] = useState('');
  const [newProjDeadline, setNewProjDeadline] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCover, setNewProjCover] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !profile) return;

    if (isRealSupabaseConfigured && realSupabase) {
      try {
        const { data: insertedProject, error: projectError } = await realSupabase
          .from('projects')
          .insert({
            name: newProjName.trim(),
            client_name: newProjClient.trim() || null,
            address: newProjAddress.trim() || null,
            description: newProjDesc.trim() || null,
            status: 'planejamento',
            start_date: new Date().toISOString().split('T')[0],
            deadline: newProjDeadline || null,
            progress: 0,
            created_by: profile.id,
          })
          .select()
          .single();

        if (projectError || !insertedProject) {
          console.error('Erro ao criar obra:', projectError);
          return;
        }

        // Adiciona automaticamente o criador como membro da obra, para que
        // ele (e somente ele/sua equipe) tenha acesso a esses dados
        await realSupabase.from('project_members').insert({
          project_id: insertedProject.id,
          user_id: profile.id,
          project_role: profile.role,
        });

        setNewProjName('');
        setNewProjClient('');
        setNewProjAddress('');
        setNewProjDeadline('');
        setNewProjDesc('');
        setNewProjCover('');
        setShowCreateProject(false);
        loadData();
        return;
      } catch (err) {
        console.error('Erro ao criar obra:', err);
        return;
      }
    }

    // Modo sandbox/demo (sem Supabase real configurado)
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: newProjName.trim(),
      client_name: newProjClient.trim() || null,
      address: newProjAddress.trim() || null,
      description: newProjDesc.trim() || null,
      status: 'planejamento',
      start_date: new Date().toISOString().split('T')[0],
      deadline: newProjDeadline || null,
      progress: 0,
      cover_image: newProjCover || null,
      created_by: profile?.id || 'guest',
      created_at: new Date().toISOString()
    };

    const currentProjs = mockDb.getProjects();
    currentProjs.unshift(newProject);
    mockDb.setProjects(currentProjs);

    // Auto add creator to project members
    const currentMembers = mockDb.getMembers();
    currentMembers.push({
      id: `m-${Date.now()}`,
      project_id: newProject.id,
      user_id: profile?.id || 'guest',
      project_role: profile?.role || 'engenheiro',
      created_at: new Date().toISOString()
    });
    mockDb.setMembers(currentMembers);

    setNewProjName('');
    setNewProjClient('');
    setNewProjAddress('');
    setNewProjDeadline('');
    setNewProjDesc('');
    setNewProjCover('');
    setShowCreateProject(false);
    loadData();

    // Trigger Notification
    triggerNotification('system', 'Nova Obra Registrada', `A obra "${newProject.name}" foi criada com sucesso por ${profile?.full_name}.`, newProject.id, newProject.name);
  };

  // Create Task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCat, setNewTaskCat] = useState('');
  const [newTaskAssigned, setNewTaskAssigned] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProjectId) return;

    const basePayload = {
      project_id: selectedProjectId,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || null,
      category: newTaskCat.trim() || 'Serviço',
      status: 'pendente' as const,
      progress: 0,
      start_date: new Date().toISOString().split('T')[0],
      deadline: newTaskDeadline || null,
      assigned_to: newTaskAssigned || null,
      created_by: profile?.id || 'guest',
    };

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('tasks').insert(basePayload);
      if (error) {
        console.error('Erro ao criar serviço:', error);
        alert('Não foi possível criar o serviço: ' + error.message);
        return;
      }
    } else {
      const newTask: Task = { id: `task-${Date.now()}`, created_at: new Date().toISOString(), ...basePayload };
      const currentTasks = mockDb.getTasks();
      currentTasks.push(newTask);
      mockDb.setTasks(currentTasks);
    }

    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskCat('');
    setNewTaskAssigned('');
    setNewTaskDeadline('');
    setShowCreateTask(false);
    loadData();

    // Trigger Notification
    const proj = projects.find(p => p.id === selectedProjectId);
    if (basePayload.assigned_to) {
      const assignedUser = team.find(u => u.id === basePayload.assigned_to);
      triggerNotification('task_deadline', 'Serviço Atribuído', `O serviço "${basePayload.title}" foi atribuído a ${assignedUser?.full_name || 'um colaborador'} na obra ${proj?.name}.`, selectedProjectId, proj?.name || '');
    }
  };

  // Create Material
  const [newMatName, setNewMatName] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('');
  const [newMatNeeded, setNewMatNeeded] = useState(0);
  const [newMatAcquired, setNewMatAcquired] = useState(0);
  const [newMatNotes, setNewMatNotes] = useState('');

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim() || !selectedProjectId) return;

    const basePayload = {
      project_id: selectedProjectId,
      name: newMatName.trim(),
      unit: newMatUnit || 'un',
      needed_quantity: Number(newMatNeeded) || 1,
      acquired_quantity: Number(newMatAcquired) || 0,
      notes: newMatNotes.trim() || null,
      created_by: profile?.id || 'guest',
    };

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('materials').insert(basePayload);
      if (error) {
        console.error('Erro ao criar material:', error);
        alert('Não foi possível criar o suprimento: ' + error.message);
        return;
      }
    } else {
      const newMaterial: Material = { id: `mat-${Date.now()}`, created_at: new Date().toISOString(), ...basePayload };
      const currentMats = mockDb.getMaterials();
      currentMats.push(newMaterial);
      mockDb.setMaterials(currentMats);
    }

    setNewMatName('');
    setNewMatUnit('');
    setNewMatNeeded(0);
    setNewMatAcquired(0);
    setNewMatNotes('');
    setShowCreateMaterial(false);
    loadData();

    // Trigger low stock warning if needed
    if (basePayload.acquired_quantity / basePayload.needed_quantity < stockThreshold / 100) {
      const proj = projects.find(p => p.id === selectedProjectId);
      triggerNotification('material_low', 'Suprimento Crítico', `O suprimento "${basePayload.name}" está com estoque crítico (menos de ${stockThreshold}% adquirido) na obra ${proj?.name}.`, selectedProjectId, proj?.name || '');
    }
  };

  // Update Material Acquired Quantity
  const handleUpdateMaterialQuantity = async (materialId: string, delta: number) => {
    const currentMatState = materials.find(m => m.id === materialId);
    if (!currentMatState) return;
    const nextAcquired = Math.max(0, currentMatState.acquired_quantity + delta);

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('materials').update({ acquired_quantity: nextAcquired }).eq('id', materialId);
      if (error) {
        console.error('Erro ao atualizar material:', error);
        return;
      }
    } else {
      const currentMats = mockDb.getMaterials();
      const idx = currentMats.findIndex(m => m.id === materialId);
      if (idx === -1) return;
      currentMats[idx] = { ...currentMats[idx], acquired_quantity: nextAcquired };
      mockDb.setMaterials(currentMats);
    }

    loadData();

    // Notification if falls below critical level
    if (nextAcquired / currentMatState.needed_quantity < stockThreshold / 100 && delta < 0) {
      const proj = projects.find(p => p.id === currentMatState.project_id);
      triggerNotification('material_low', 'Estoque Alerta', `O suprimento "${currentMatState.name}" atingiu nível crítico (${Math.round(nextAcquired / currentMatState.needed_quantity * 100)}% - limite configurado: ${stockThreshold}%) na obra ${proj?.name}.`, currentMatState.project_id, proj?.name || '');
    }
  };

  // Invite Team Member to Project
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteMode, setInviteMode] = useState<'existing' | 'new'>('existing');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeePhone, setNewEmployeePhone] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState<UserRole>('funcionario');
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUserId || !selectedProjectId) return;

    const alreadyMember = mockDb.getMembers().some(m => m.project_id === selectedProjectId && m.user_id === inviteUserId);
    const invitedUser = team.find(u => u.id === inviteUserId);

    if (isRealSupabaseConfigured && realSupabase) {
      const { data: existing } = await realSupabase
        .from('project_members')
        .select('id')
        .eq('project_id', selectedProjectId)
        .eq('user_id', inviteUserId)
        .maybeSingle();

      if (existing) {
        alert('Este colaborador já faz parte da equipe deste projeto!');
        return;
      }

      const { error } = await realSupabase.from('project_members').insert({
        project_id: selectedProjectId,
        user_id: inviteUserId,
        project_role: invitedUser?.role || 'funcionario',
      });

      if (error) {
        console.error('Erro ao adicionar colaborador:', error);
        alert('Não foi possível adicionar o colaborador: ' + error.message);
        return;
      }
    } else {
      if (alreadyMember) {
        alert('Este colaborador já faz parte da equipe deste projeto!');
        return;
      }
      const currentMembers = mockDb.getMembers();
      currentMembers.push({
        id: `m-${Date.now()}`,
        project_id: selectedProjectId,
        user_id: inviteUserId,
        project_role: invitedUser?.role || 'funcionario',
        created_at: new Date().toISOString()
      });
      mockDb.setMembers(currentMembers);
    }

    setInviteUserId('');
    setShowInviteMember(false);
    loadData();

    const proj = projects.find(p => p.id === selectedProjectId);
    triggerNotification('system', 'Equipe Atualizada', `${invitedUser?.full_name} foi integrado à equipe da obra ${proj?.name}.`, selectedProjectId, proj?.name || '');
  };

  // Cadastra um funcionário novo diretamente (nome, telefone, cargo) e já adiciona à obra atual
  const handleAddNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !selectedProjectId) return;

    if (isRealSupabaseConfigured && realSupabase) {
      alert('No modo com Supabase real, cada profissional precisa criar a própria conta (cadastro com e-mail e senha) antes de poder ser adicionado à equipe, pois o perfil fica vinculado ao login dele. Peça para o profissional se cadastrar e depois use a opção "Já Tem Conta" para adicioná-lo à obra.');
      return;
    }

    const newProfile: Profile = {
      id: `func-${Date.now()}`,
      full_name: newEmployeeName.trim(),
      role: newEmployeeRole,
      phone: newEmployeePhone.trim() || null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    const currentProfiles = mockDb.getProfiles();
    currentProfiles.push(newProfile);
    mockDb.setProfiles(currentProfiles);

    const currentMembers = mockDb.getMembers();
    currentMembers.push({
      id: `m-${Date.now()}`,
      project_id: selectedProjectId,
      user_id: newProfile.id,
      project_role: newEmployeeRole,
      created_at: new Date().toISOString(),
    });
    mockDb.setMembers(currentMembers);

    setNewEmployeeName('');
    setNewEmployeePhone('');
    setNewEmployeeRole('funcionario');
    setShowInviteMember(false);
    loadData();

    const proj = projects.find(p => p.id === selectedProjectId);
    triggerNotification('system', 'Equipe Atualizada', `${newProfile.full_name} foi cadastrado e integrado à equipe da obra ${proj?.name}.`, selectedProjectId, proj?.name || '');
  };

  // Send Project Chat Message
  const [chatInput, setChatInput] = useState('');
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedProjectId || !profile) return;

    const content = chatInput.trim();
    setChatInput('');

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('messages').insert({
        project_id: selectedProjectId,
        user_id: profile.id,
        content,
      });
      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        return;
      }
    } else {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        project_id: selectedProjectId,
        user_id: profile.id,
        content,
        created_at: new Date().toISOString()
      };
      const currentMsgs = mockDb.getMessages();
      currentMsgs.push(newMsg);
      mockDb.setMessages(currentMsgs);
    }

    loadData();

    // Simulate reply from mestre de obras after 2 seconds (somente no modo sandbox)
    if (!isRealSupabaseConfigured && profile.role === 'engenheiro') {
      setTimeout(() => {
        const replyMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          project_id: selectedProjectId,
          user_id: 'user-pedro', // Pedro Mestre de Obra
          content: 'Entendido, Engenheiro. Vamos providenciar de imediato e manter o progresso atualizado no painel.',
          created_at: new Date().toISOString()
        };
        const updatedMsgs = mockDb.getMessages();
        updatedMsgs.push(replyMsg);
        mockDb.setMessages(updatedMsgs);
        loadData();
      }, 2000);
    }
  };

  // Change Task Status & Progress
  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status'], progressValue?: number) => {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    let finalProgress = progressValue !== undefined ? progressValue : t.progress;
    if (newStatus === 'concluido') finalProgress = 100;
    if (newStatus === 'pendente') finalProgress = 0;

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('tasks').update({ status: newStatus, progress: finalProgress }).eq('id', taskId);
      if (error) {
        console.error('Erro ao atualizar serviço:', error);
        return;
      }
    } else {
      const currentTasks = mockDb.getTasks();
      const idx = currentTasks.findIndex(x => x.id === taskId);
      if (idx !== -1) {
        currentTasks[idx] = { ...currentTasks[idx], status: newStatus, progress: finalProgress };
        mockDb.setTasks(currentTasks);
      }
    }

    // Auto-calculate total project progress based on average task progress
    await recalculateProjectProgress(t.project_id, taskId, finalProgress);
    loadData();
  };

  const recalculateProjectProgress = async (projId: string, changedTaskId?: string, changedProgress?: number) => {
    const baseTasks = isRealSupabaseConfigured ? tasks : mockDb.getTasks();
    const projTasks = baseTasks
      .filter(t => t.project_id === projId)
      .map(t => (changedTaskId && t.id === changedTaskId ? { ...t, progress: changedProgress ?? t.progress } : t));

    if (projTasks.length > 0) {
      const avgProgress = projTasks.reduce((sum, t) => sum + t.progress, 0) / projTasks.length;
      const rounded = Math.round(avgProgress);
      const proj = projects.find(p => p.id === projId);
      const newStatus = rounded === 100 ? 'concluido' : proj?.status;

      if (isRealSupabaseConfigured && realSupabase) {
        await realSupabase.from('projects').update({ progress: rounded, status: newStatus }).eq('id', projId);
      } else {
        const currentProjs = mockDb.getProjects();
        const pIdx = currentProjs.findIndex(p => p.id === projId);
        if (pIdx !== -1) {
          currentProjs[pIdx] = { ...currentProjs[pIdx], progress: rounded, status: newStatus || currentProjs[pIdx].status };
          mockDb.setProjects(currentProjs);
        }
      }
    }
  };

  // Manually override a project's progress (independent of task averages)
  const handleUpdateProjectProgress = async (projId: string, newProgress: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newProgress)));
    const proj = projects.find(p => p.id === projId);
    const newStatus = clamped === 100 ? 'concluido' : proj?.status;

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('projects').update({ progress: clamped, status: newStatus }).eq('id', projId);
      if (error) console.error('Erro ao atualizar progresso:', error);
    } else {
      const currentProjs = mockDb.getProjects();
      const idx = currentProjs.findIndex(p => p.id === projId);
      if (idx !== -1) {
        currentProjs[idx] = { ...currentProjs[idx], progress: clamped, status: newStatus || currentProjs[idx].status };
        mockDb.setProjects(currentProjs);
      }
    }
    loadData();
    setEditingProgressProjId(null);
  };

  // Open the edit modal pre-filled with the project's current data
  const openEditProject = (proj: Project) => {
    setEditProjId(proj.id);
    setEditProjName(proj.name);
    setEditProjClient(proj.client_name || '');
    setEditProjAddress(proj.address || '');
    setEditProjDeadline(proj.deadline || '');
    setEditProjDesc(proj.description || '');
    setEditProjCoverImage(proj.cover_image || '');
    setShowEditProject(true);
  };

  // Save changes made in the edit modal
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjId || !editProjName.trim()) return;

    const payload = {
      name: editProjName.trim(),
      client_name: editProjClient.trim() || null,
      address: editProjAddress.trim() || null,
      deadline: editProjDeadline || null,
      description: editProjDesc.trim() || null,
    };

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('projects').update(payload).eq('id', editProjId);
      if (error) {
        console.error('Erro ao editar obra:', error);
        alert('Não foi possível salvar as alterações: ' + error.message);
        return;
      }
    } else {
      const currentProjs = mockDb.getProjects();
      const idx = currentProjs.findIndex(p => p.id === editProjId);
      if (idx !== -1) {
        currentProjs[idx] = { ...currentProjs[idx], ...payload, cover_image: editProjCoverImage || null };
        mockDb.setProjects(currentProjs);
      }
    }

    setShowEditProject(false);
    setEditProjId(null);
    loadData();
  };

  // Delete a project and clean up everything linked to it
  const handleDeleteProject = async (projId: string) => {
    const proj = projects.find(p => p.id === projId);
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a obra "${proj?.name || ''}"? Essa ação não pode ser desfeita e removerá também suas tarefas, materiais, equipe e mensagens.`
    );
    if (!confirmed) return;

    if (isRealSupabaseConfigured && realSupabase) {
      // As tabelas filhas têm ON DELETE CASCADE, então excluir a obra já
      // remove tarefas, materiais, membros e mensagens vinculados
      const { error } = await realSupabase.from('projects').delete().eq('id', projId);
      if (error) {
        console.error('Erro ao excluir obra:', error);
        alert('Não foi possível excluir a obra: ' + error.message);
        return;
      }
    } else {
      mockDb.setProjects(mockDb.getProjects().filter(p => p.id !== projId));
      mockDb.setTasks(mockDb.getTasks().filter(t => t.project_id !== projId));
      mockDb.setMaterials(mockDb.getMaterials().filter(m => m.project_id !== projId));
      mockDb.setMembers(mockDb.getMembers().filter(m => m.project_id !== projId));
      mockDb.setMessages(mockDb.getMessages().filter(msg => msg.project_id !== projId));
    }

    if (selectedProjectId === projId) setSelectedProjectId(null);
    loadData();
  };

  // Helper Audio Chime using standard Web Audio API (cross-browser synthesis)
  const playChime = (type: LocalNotification['type']) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'material_low' || type === 'task_overdue') {
        // Dual chord synth alarm chime
        osc1.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc2.frequency.setValueAtTime(554.37, ctx.currentTime); // C#5
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.45);
        osc2.stop(ctx.currentTime + 0.45);
      } else {
        // Upbeat pleasant positive notification chime
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1); // G5
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc1.start();
        osc2.start(ctx.currentTime + 0.1);
        osc1.stop(ctx.currentTime + 0.6);
        osc2.stop(ctx.currentTime + 0.6);
      }
    } catch (err) {
      console.warn('Audio feedback blocked by browser policies:', err);
    }
  };

  // Helper trigger notification
  const triggerNotification = (type: LocalNotification['type'], title: string, message: string, projectId: string, projectName: string) => {
    const currentNotifs = mockDb.getNotifications();
    const newNotif: LocalNotification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      projectId,
      projectName,
      createdAt: new Date().toISOString(),
      read: false
    };
    currentNotifs.unshift(newNotif);
    mockDb.setNotifications(currentNotifs);
    setNotifications(currentNotifs);

    // Audio chime play
    playChime(type);

    // Notificação real na barra do celular (ícone PHD)
    sendNativeNotification(title, message);

    // Dynamic floating Toast alert append
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setActiveToasts(prev => [...prev, { id: toastId, type, title, message, projectName }]);
    
    // Dismiss toast after 5.5 seconds
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== toastId));
    }, 5500);
  };

  // Service point clock actions
  const startTimer = (taskId: string) => {
    setActiveTimerTaskId(taskId);
    setTimerSeconds(0);
  };

  const stopTimer = (taskId: string) => {
    if (timerSeconds < 5) {
      // Too short
      setActiveTimerTaskId(null);
      return;
    }
    const task = tasks.find(t => t.id === taskId);
    const proj = projects.find(p => p.id === task?.project_id);
    
    // Log hours
    const hours = (timerSeconds / 3600).toFixed(2);
    alert(`Ponto de trabalho registrado com sucesso!\nVocê registrou ${timerSeconds} segundos (~${hours} horas) na atividade: "${task?.title}"`);
    
    // Update task to Em Andamento if it was pending
    if (task && task.status === 'pendente') {
      handleUpdateTaskStatus(taskId, 'em_andamento', 10);
    }
    
    setActiveTimerTaskId(null);
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const markAllAsRead = () => {
    const current = mockDb.getNotifications().map(n => ({ ...n, read: true }));
    mockDb.setNotifications(current);
    setNotifications(current);
  };

  // Filter projects based on query
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.client_name && p.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background safe-area-top flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-text-secondary font-medium animate-pulse">Iniciando PHD Gestões...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW: UNAUTHENTICATED (LOGIN / SIGNUP)
  // ==========================================
  if (!session) {
    return (
      <div className="min-h-screen bg-background safe-area-top safe-area-bottom flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl overflow-hidden shadow-lg shadow-primary/20 relative group border border-primary/20">
            <img src={appIcon} alt="PHD Gestões" className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-dark to-accent opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-20 pointer-events-none"></div>
          </div>
          <h2 className="mt-6 text-3xl font-bold font-display tracking-tight text-secondary">
            PHD Gestões
          </h2>
          <p className="mt-2 text-sm text-text-secondary font-medium">
            Gestão inteligente de obras, equipes e suprimentos
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-surface py-8 px-6 shadow-md rounded-2xl border border-border">
            
            {/* Tab selector */}
            <div className="flex bg-input-bg p-1 rounded-xl mb-6">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  authMode === 'login' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  authMode === 'signup' ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Criar Conta
              </button>
            </div>

            <form className="space-y-4" onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Augusto"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Senha *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-text pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-light hover:text-text-secondary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Telefone (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Função na Obra
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['engenheiro', 'mestre_obra', 'encarregado', 'funcionario'] as UserRole[]).map((r) => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setUserRole(r)}
                          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition text-center ${
                            userRole === r
                              ? 'bg-primary border-primary text-white'
                              : 'border-border bg-surface-alt text-text-secondary hover:bg-input-bg'
                          }`}
                        >
                          {ROLE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-error-light border border-error/20 text-error text-xs font-medium">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-md shadow-primary/10 transition flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{authMode === 'login' ? 'Entrar no Sistema' : 'Cadastrar e Entrar'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {!isRealSupabaseConfigured && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                    <span className="bg-surface px-3 text-text-light">Acesso Rápido de Teste</span>
                  </div>
                </div>

                <button
                  onClick={handleQuickLogin}
                  className="w-full p-2.5 text-left rounded-xl bg-surface-alt hover:bg-input-bg border border-border transition"
                >
                  <div className="text-xs font-bold text-primary">Eng. João Silva</div>
                  <div className="text-[10px] text-text-light font-medium">Gestor Geral</div>
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN APPLICATION DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-background text-text flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION - DESKTOP */}
      <aside className="hidden md:flex w-64 bg-sidebar text-white flex-col shrink-0 border-r border-sidebar-light">
        <div className="p-5 border-b border-sidebar-light flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden shadow-md shadow-primary/20 border border-primary/20 bg-secondary-light shrink-0">
            <img src={appIcon} alt="PHD Gestões Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold font-display tracking-tight text-sm leading-none">PHD Gestões</h1>
            <span className="text-[10px] text-accent font-semibold uppercase tracking-wider">Canteiro Conectado</span>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="p-4 border-b border-sidebar-light bg-sidebar-light/40 flex items-center gap-3">
          <img 
            src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
            alt={profile?.full_name} 
            className="w-10 h-10 rounded-full border border-primary/40 object-cover"
          />
          <div className="overflow-hidden">
            <p className="font-semibold text-xs text-white truncate">{profile?.full_name}</p>
            <span className="text-[10px] text-text-light block font-medium uppercase">{ROLE_LABELS[profile?.role || 'funcionario']}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => { setActiveTab('projects'); setSelectedProjectId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'projects' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'text-text-light hover:bg-sidebar-light hover:text-white'
            }`}
          >
            <HardHat size={18} />
            <span>Obras</span>
          </button>

          <button
            onClick={() => { setActiveTab('materials'); setSelectedProjectId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'materials' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'text-text-light hover:bg-sidebar-light hover:text-white'
            }`}
          >
            <Package size={18} />
            <span>Materiais</span>
          </button>

          <button
            onClick={() => { setActiveTab('tasks'); setSelectedProjectId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'tasks' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'text-text-light hover:bg-sidebar-light hover:text-white'
            }`}
          >
            <ClipboardList size={18} />
            <span>Serviços</span>
          </button>

          <button
            onClick={() => { setActiveTab('team'); setSelectedProjectId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'team' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'text-text-light hover:bg-sidebar-light hover:text-white'
            }`}
          >
            <Users size={18} />
            <span>Equipe</span>
          </button>

          <button
            onClick={() => { setActiveTab('notifications'); setSelectedProjectId(null); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'notifications' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'text-text-light hover:bg-sidebar-light hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell size={18} />
              <span>Avisos</span>
            </div>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="bg-error text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('profile'); setSelectedProjectId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'profile' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'text-text-light hover:bg-sidebar-light hover:text-white'
            }`}
          >
            <User size={18} />
            <span>Meu Perfil</span>
          </button>
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-sidebar-light space-y-2">
          <button 
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg text-error hover:bg-error-light hover:text-error transition"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden bg-surface border-t border-border flex justify-around p-2 pt-2 safe-area-bottom fixed bottom-0 left-0 right-0 z-40 shadow-lg">
        <button 
          onClick={() => { setActiveTab('projects'); setSelectedProjectId(null); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'projects' ? 'text-primary' : 'text-text-light'}`}
        >
          <HardHat size={20} />
          <span className="text-[9px] font-bold">Obras</span>
        </button>
        <button 
          onClick={() => { setActiveTab('materials'); setSelectedProjectId(null); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'materials' ? 'text-primary' : 'text-text-light'}`}
        >
          <Package size={20} />
          <span className="text-[9px] font-bold">Insumos</span>
        </button>
        <button 
          onClick={() => { setActiveTab('tasks'); setSelectedProjectId(null); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'tasks' ? 'text-primary' : 'text-text-light'}`}
        >
          <ClipboardList size={20} />
          <span className="text-[9px] font-bold">Serviços</span>
        </button>
        <button 
          onClick={() => { setActiveTab('team'); setSelectedProjectId(null); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'team' ? 'text-primary' : 'text-text-light'}`}
        >
          <Users size={20} />
          <span className="text-[9px] font-bold">Equipe</span>
        </button>
        <button 
          onClick={() => { setActiveTab('profile'); setSelectedProjectId(null); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-primary' : 'text-text-light'}`}
        >
          <User size={20} />
          <span className="text-[9px] font-bold">Perfil</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 safe-area-top overflow-y-auto pb-20 md:pb-8">
        
        {/* AUTOMATIC DEVICE CLOCK, DATE AND WEATHER FORECAST STATUS BAR */}
        {profile && (
          <div className="mb-6 bg-surface border border-border rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              
              {/* Date & Time (Cell phone/Device integrated) */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0 flex flex-col items-center justify-center min-w-[70px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                    {currentDeviceTime.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
                  </span>
                  <span className="text-2xl font-black leading-none font-display text-primary mt-0.5">
                    {currentDeviceTime.getDate()}
                  </span>
                  <span className="text-[9px] font-bold text-text-secondary mt-1">
                    {currentDeviceTime.toLocaleDateString('pt-BR', { weekday: 'short' }).split('-')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary leading-normal">
                    Horário do Dispositivo (Sincronizado)
                  </h3>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-bold font-mono tracking-tight text-secondary">
                      {formatTime(currentDeviceTime)}
                    </span>
                    <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                      Hora e Dia Real
                    </span>
                  </div>
                  <p className="text-xs text-text-light mt-1 font-medium">
                    {formatDateLong(currentDeviceTime)}
                  </p>
                </div>
              </div>

              {/* Separator for LG screens */}
              <div className="hidden lg:block h-12 w-px bg-border"></div>

              {/* Weather Forecast (GPS integration with Open-Meteo & Nominatim) */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-accent/10 rounded-xl text-accent shrink-0">
                    {renderWeatherIcon(weather?.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-secondary">
                        {weatherLoading ? 'Atualizando...' : weather ? `${weather.temp}°C` : '--°C'}
                      </span>
                      <span className="text-xs font-medium text-text-secondary px-2 py-0.5 bg-input-bg rounded-full border border-border">
                        {weatherLoading ? 'Consultando satélite...' : weather?.condition || 'Sem previsão'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-text-secondary">
                      <MapPin size={12} className={weather?.isReal ? "text-success fill-success/10 animate-pulse" : "text-text-light"} />
                      <span className="font-medium">{weather?.city || 'Buscando posição...'}</span>
                      {weather?.humidity !== undefined && (
                        <span className="text-text-light ml-2">| Umidade: {weather.humidity}%</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* GPS Sync & Android permission indicator */}
                <div className="flex items-center gap-2">
                  {permissionStatus === 'granted' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/15 border border-success/20 text-success text-xs font-semibold">
                      <div className="w-1.5 h-1.5 rounded-full bg-success animate-ping"></div>
                      GPS Ativo & Clima Real
                    </div>
                  ) : permissionStatus === 'denied' ? (
                    <button
                      onClick={() => setShowAndroidPermissionModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-warning/15 border border-warning/20 hover:bg-warning/25 text-warning text-xs font-semibold transition"
                    >
                      <ShieldAlert size={14} />
                      GPS Bloqueado (Mudar para Real)
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAndroidPermissionModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-md shadow-primary/10 transition"
                    >
                      <Navigation size={13} className="animate-pulse" />
                      Obter Clima do Canteiro (Real)
                    </button>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            TAB: PROJECTS (OBRAS)
           ========================================== */}
        {activeTab === 'projects' && !selectedProjectId && (
          <div className="space-y-6">
            
            {/* Header section with title and search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-display text-secondary">Canteiro de Obras</h2>
                <p className="text-sm text-text-secondary">Monitore o progresso, suprimentos e mão de obra de cada projeto</p>
              </div>

              {/* Action buttons (Engineers / Admins only can register new projects) */}
              {(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.role === 'admin') && (
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold shadow-md shadow-primary/10 transition self-start sm:self-auto"
                >
                  <Plus size={18} />
                  <span>Nova Obra</span>
                </button>
              )}
            </div>

            {/* Filter and search bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-surface p-3 rounded-2xl border border-border">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-text-light" size={18} />
                <input
                  type="text"
                  placeholder="Buscar obra pelo nome, cliente ou endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-surface-alt border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-text-secondary" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-surface-alt border border-border text-text-secondary focus:outline-none"
                >
                  <option value="all">Todas as Fases</option>
                  <option value="planejamento">Planejamento</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="pausado">Pausado</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                  <HardHat size={32} />
                </div>
                <h3 className="font-bold text-lg text-secondary mb-2">Nenhuma obra localizada</h3>
                <p className="text-sm text-text-secondary mb-6">Altere os filtros de pesquisa ou crie um novo projeto para gerenciar os trabalhos.</p>
                {(profile?.role === 'engenheiro' || profile?.role === 'admin') && (
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition"
                  >
                    Registrar Primeira Obra
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((proj) => {
                  const daysLeft = getDaysRemaining(proj.deadline);
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  
                  return (
                    <div 
                      key={proj.id}
                      onClick={() => { setSelectedProjectId(proj.id); setProjectSubTab('overview'); }}
                      className="bg-surface rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary-100 transition duration-300 cursor-pointer flex flex-col group overflow-hidden"
                    >
                      {proj.cover_image && (
                        <img
                          src={proj.cover_image}
                          alt={proj.name}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      {/* Top status bar */}
                      <div className="p-5 flex-1 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition duration-300">
                            <Building2 size={20} />
                          </div>
                          
                          {/* Status Badge */}
                          <span 
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ 
                              backgroundColor: `${STATUS_COLORS[proj.status]}15`,
                              color: STATUS_COLORS[proj.status]
                            }}
                          >
                            {STATUS_LABELS[proj.status]}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-base text-secondary group-hover:text-primary transition truncate">{proj.name}</h4>
                          <span className="text-xs text-text-light font-medium block truncate">{proj.client_name || 'Cliente Particular'}</span>
                        </div>

                        <div className="space-y-2 text-xs text-text-secondary font-medium">
                          {proj.address && (
                            <div className="flex items-center gap-1.5 text-text-secondary">
                              <MapPin size={14} className="text-text-light shrink-0" />
                              <span className="truncate">{proj.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-text-light shrink-0" />
                            <span>Prazo: {formatDate(proj.deadline)}</span>
                            {daysLeft !== null && (
                              <span className={`ml-auto font-bold ${
                                isOverdue ? 'text-error animate-pulse' : daysLeft <= 15 ? 'text-warning' : 'text-success'
                              }`}>
                                {isOverdue ? `${Math.abs(daysLeft)}d de atraso` : `${daysLeft}d restantes`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-text-secondary">
                            <span>Conclusão Geral</span>
                            <span className="text-primary">{proj.progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-input-bg rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${proj.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer actions */}
                      <div className="bg-surface-alt border-t border-border p-3 px-5 flex items-center justify-between text-xs font-bold text-primary group-hover:bg-primary-50/30 transition duration-300">
                        <span>Ver Painel Integrado</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB: SUB-PANEL: DETALHES DA OBRA SELECIONADA
           ========================================== */}
        {selectedProjectId && (
          <div className="space-y-6">
            
            {/* Breadcrumb navigation */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-light">
              <span onClick={() => setSelectedProjectId(null)} className="hover:text-primary cursor-pointer">Obras</span>
              <ChevronRight size={14} />
              <span className="text-text-secondary">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </span>
            </div>

            {/* Project Cover Header */}
            {(() => {
              const proj = projects.find(p => p.id === selectedProjectId);
              if (!proj) return null;
              
              const daysLeft = getDaysRemaining(proj.deadline);
              const isOverdue = daysLeft !== null && daysLeft < 0;

              return (
                <div className="bg-surface border border-border rounded-2xl shadow-sm space-y-4 overflow-hidden">
                  {proj.cover_image && (
                    <img
                      src={proj.cover_image}
                      alt={proj.name}
                      className="w-full h-40 md:h-56 object-cover"
                    />
                  )}
                  <div className={proj.cover_image ? 'p-6 pt-4 space-y-4' : 'p-6 space-y-4'}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold font-display text-secondary">{proj.name}</h3>
                        <p className="text-xs text-text-secondary font-medium">Cliente: {proj.client_name || 'Particular'} | {proj.address}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={proj.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          if (isRealSupabaseConfigured && realSupabase) {
                            const { error } = await realSupabase.from('projects').update({ status: newStatus }).eq('id', proj.id);
                            if (error) {
                              console.error('Erro ao atualizar status da obra:', error);
                              return;
                            }
                          } else {
                            const currentProjs = [...projects];
                            const idx = currentProjs.findIndex(p => p.id === proj.id);
                            if (idx !== -1) {
                              currentProjs[idx].status = newStatus as any;
                              mockDb.setProjects(currentProjs);
                            }
                          }
                          loadData();
                        }}
                        disabled={!(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra')}
                        className="text-xs font-bold px-3 py-2 rounded-xl border border-border text-text focus:outline-none"
                      >
                        <option value="planejamento">Planejamento</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="pausado">Pausado</option>
                        <option value="concluido">Concluído</option>
                      </select>

                      {(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.role === 'admin') && (
                        <>
                          <button
                            onClick={() => openEditProject(proj)}
                            className="px-3 py-2 border border-border bg-surface-alt hover:bg-input-bg text-text-secondary rounded-xl text-xs font-bold transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            className="px-3 py-2 border border-error/30 bg-error/5 hover:bg-error/10 text-error rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setSelectedProjectId(null)}
                        className="px-4 py-2 border border-border bg-surface-alt hover:bg-input-bg text-text-secondary rounded-xl text-xs font-bold transition"
                      >
                        Fechar Painel
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-text-secondary">{proj.description || 'Nenhuma descrição estendida fornecida para esta obra.'}</p>

                  {/* Summary indicators */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="p-3.5 bg-background rounded-xl border border-border">
                      <div className="flex items-center justify-between">
                        <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Progresso Geral</span>
                        {(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.role === 'admin') && editingProgressProjId !== proj.id && (
                          <button
                            onClick={() => { setEditingProgressProjId(proj.id); setManualProgressValue(proj.progress); }}
                            className="text-text-light hover:text-primary transition"
                            title="Editar progresso manualmente"
                          >
                            <Sliders size={12} />
                          </button>
                        )}
                      </div>
                      {editingProgressProjId === proj.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={manualProgressValue}
                            onChange={(e) => setManualProgressValue(Number(e.target.value))}
                            className="flex-1 accent-primary"
                          />
                          <span className="text-xs font-bold text-primary w-9 text-right">{manualProgressValue}%</span>
                          <button
                            onClick={() => handleUpdateProjectProgress(proj.id, manualProgressValue)}
                            className="text-success hover:opacity-80"
                            title="Salvar"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingProgressProjId(null)}
                            className="text-text-light hover:text-error"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-primary font-display">{proj.progress}%</span>
                      )}
                    </div>
                    <div className="p-3.5 bg-background rounded-xl border border-border">
                      <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Prazo</span>
                      <span className="text-xs font-bold text-secondary">{formatDate(proj.deadline)}</span>
                    </div>
                    <div className="p-3.5 bg-background rounded-xl border border-border">
                      <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Status Prazo</span>
                      <span className={`text-xs font-bold ${isOverdue ? 'text-error' : 'text-success'}`}>
                        {isOverdue ? `${Math.abs(daysLeft || 0)}d de atraso` : `${daysLeft || 0}d restantes`}
                      </span>
                    </div>
                    <div className="p-3.5 bg-background rounded-xl border border-border">
                      <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Atividades</span>
                      <span className="text-xs font-bold text-secondary">
                        {tasks.filter(t => t.project_id === proj.id).length} Cadastradas
                      </span>
                    </div>
                  </div>
                  </div>
                </div>
              );
            })()}

            {/* Sub-tabs inside active project */}
            <div className="flex border-b border-border overflow-x-auto whitespace-nowrap bg-surface px-4 py-1.5 rounded-2xl border border-border">
              <button
                onClick={() => setProjectSubTab('overview')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  projectSubTab === 'overview' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Geral Obra
              </button>
              <button
                onClick={() => setProjectSubTab('tasks')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  projectSubTab === 'tasks' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Cronograma Serviços ({tasks.filter(t => t.project_id === selectedProjectId).length})
              </button>
              <button
                onClick={() => setProjectSubTab('materials')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  projectSubTab === 'materials' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Suprimentos ({materials.filter(m => m.project_id === selectedProjectId).length})
              </button>
              <button
                onClick={() => setProjectSubTab('team')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  projectSubTab === 'team' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Equipe Local
              </button>
              <button
                onClick={() => setProjectSubTab('messages')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  projectSubTab === 'messages' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Conversas Canteiro
              </button>
            </div>

            {/* SUB-TAB: OVERVIEW GERAL */}
            {projectSubTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                
                {/* Visual statistics */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Detailed progress dashboard */}
                  <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-5">
                    <h4 className="font-bold text-sm text-secondary uppercase tracking-wider border-b pb-2">Status do Cronograma</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-primary-50/50 rounded-xl border border-primary-100">
                        <span className="block text-xl font-bold font-display text-primary">
                          {tasks.filter(t => t.project_id === selectedProjectId && t.status === 'concluido').length}
                        </span>
                        <span className="text-[10px] text-text-light font-bold uppercase">Entregues</span>
                      </div>
                      <div className="p-4 bg-warning/10 rounded-xl border border-warning/20">
                        <span className="block text-xl font-bold font-display text-warning">
                          {tasks.filter(t => t.project_id === selectedProjectId && t.status === 'em_andamento').length}
                        </span>
                        <span className="text-[10px] text-text-light font-bold uppercase">Executando</span>
                      </div>
                      <div className="p-4 bg-text-light/10 rounded-xl border border-border">
                        <span className="block text-xl font-bold font-display text-text-secondary">
                          {tasks.filter(t => t.project_id === selectedProjectId && t.status === 'pendente').length}
                        </span>
                        <span className="text-[10px] text-text-light font-bold uppercase">Planejados</span>
                      </div>
                    </div>

                    {/* Progress representation */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-xs font-bold text-text-secondary uppercase">Evolução por Categoria de Serviço</h5>
                      {['Fundação', 'Estrutura', 'Alvenaria', 'Instalações', 'Elétrica', 'Acabamento'].map(cat => {
                        const catTasks = tasks.filter(t => t.project_id === selectedProjectId && t.category === cat);
                        if (catTasks.length === 0) return null;
                        const catProgress = Math.round(catTasks.reduce((s, t) => s + t.progress, 0) / catTasks.length);

                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-text-secondary">
                              <span>{cat}</span>
                              <span>{catProgress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-input-bg rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${catProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Material checklist highlights */}
                  <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Suprimentos Críticos</h4>
                      <button onClick={() => setProjectSubTab('materials')} className="text-xs font-bold text-primary hover:underline">Ver Todos</button>
                    </div>

                    <div className="space-y-3">
                      {materials.filter(m => m.project_id === selectedProjectId).slice(0, 3).map(mat => {
                        const ratio = mat.acquired_quantity / mat.needed_quantity;
                        const isCritical = ratio < 0.3;

                        return (
                          <div key={mat.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-alt">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-secondary">{mat.name}</span>
                              <p className="text-[10px] text-text-secondary">Necesário: {mat.needed_quantity} {mat.unit} | Adquirido: {mat.acquired_quantity} {mat.unit}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCritical ? 'bg-error-light text-error' : 'bg-success/10 text-success'
                            }`}>
                              {isCritical ? '⚠️ Baixo' : '✓ OK'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Right Column: Key Alerts & Action Panel */}
                <div className="space-y-6">
                  
                  {/* Notifications feed inside project */}
                  <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-sm text-secondary uppercase tracking-wider border-b pb-2">Avisos e Boletins</h4>
                    
                    {notifications.filter(n => n.projectId === selectedProjectId).length === 0 ? (
                      <p className="text-xs text-text-light font-medium text-center py-4">Sem avisos urgentes pendentes de solução.</p>
                    ) : (
                      <div className="space-y-3">
                        {notifications.filter(n => n.projectId === selectedProjectId).slice(0, 3).map(notif => (
                          <div key={notif.id} className="p-3 rounded-xl border border-border bg-surface-alt flex gap-2">
                            <ShieldAlert className="text-warning shrink-0" size={16} />
                            <div>
                              <span className="text-xs font-bold block text-secondary">{notif.title}</span>
                              <p className="text-[10px] text-text-secondary leading-normal mt-0.5">{notif.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Team Members List */}
                  <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Equipe de Canto</h4>
                      <button onClick={() => setProjectSubTab('team')} className="text-xs font-bold text-primary hover:underline">Ver Lista</button>
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        const currentProjectMembers = projectMembers.filter(m => m.project_id === selectedProjectId);
                        const userProfiles = currentProjectMembers.map(m => team.find(t => t.id === m.user_id)).filter(Boolean) as Profile[];

                        return userProfiles.slice(0, 3).map(member => (
                          <div key={member.id} className="flex items-center gap-3">
                            <img src={member.avatar_url || ''} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <div>
                              <span className="text-xs font-bold text-secondary block leading-none mb-0.5">{member.fullName || member.full_name}</span>
                              <span className="text-[10px] text-text-light uppercase font-semibold">{ROLE_LABELS[member.role]}</span>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* SUB-TAB: TASKS (SERVIÇOS) */}
            {projectSubTab === 'tasks' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Cronograma de Atividades do Canteiro</h4>
                  {(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.role === 'admin') && (
                    <button
                      onClick={() => setShowCreateTask(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition"
                    >
                      <Plus size={14} />
                      <span>Novo Serviço</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {tasks.filter(t => t.project_id === selectedProjectId).map(task => {
                    const assignedUser = team.find(u => u.id === task.assigned_to);
                    const isTaskTimerRunning = activeTimerTaskId === task.id;

                    return (
                      <div key={task.id} className="bg-surface rounded-2xl border border-border p-5 space-y-4 hover:border-primary-100 transition shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary-50">{task.category}</span>
                              <h5 className="font-bold text-base text-secondary">{task.title}</h5>
                            </div>
                            <p className="text-xs text-text-secondary">{task.description}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span 
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                              style={{ 
                                backgroundColor: `${STATUS_COLORS[task.status]}15`,
                                color: STATUS_COLORS[task.status]
                              }}
                            >
                              {STATUS_LABELS[task.status]}
                            </span>
                          </div>
                        </div>

                        {/* Interactive items */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/60">
                          
                          {/* Assignment & Deadline */}
                          <div className="flex items-center gap-2 text-xs">
                            <User size={14} className="text-text-light" />
                            <span className="font-semibold text-text-secondary">Responsável:</span>
                            <span className="font-bold text-secondary">{assignedUser?.full_name || 'Sem designação'}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <Calendar size={14} className="text-text-light" />
                            <span className="font-semibold text-text-secondary">Entrega:</span>
                            <span className="font-bold text-secondary">{formatDate(task.deadline)}</span>
                          </div>

                          {/* Dynamic Action timer log or Status dropdown */}
                          <div className="flex items-center gap-2 justify-end">
                            
                            {/* LIVE TIMER COMPONENT FOR FIELD WORKERS */}
                            {task.status !== 'concluido' && (
                              <div className="flex items-center gap-2">
                                {isTaskTimerRunning ? (
                                  <div className="flex items-center gap-2 bg-error-light px-2 py-1 rounded-lg border border-error/20 animate-pulse text-error">
                                    <Clock size={12} />
                                    <span className="font-mono text-xs font-bold">{formatTimer(timerSeconds)}</span>
                                    <button 
                                      onClick={() => stopTimer(task.id)}
                                      className="p-1 rounded-full bg-error text-white hover:bg-error-dark transition"
                                      title="Parar Serviço"
                                    >
                                      <Square size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => startTimer(task.id)}
                                    disabled={activeTimerTaskId !== null}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                      activeTimerTaskId !== null 
                                        ? 'bg-border text-text-light cursor-not-allowed' 
                                        : 'bg-success/10 hover:bg-success/20 text-success'
                                    }`}
                                  >
                                    <Play size={10} />
                                    <span>Ponto de Trabalho</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* State controller for Engineering roles */}
                            {(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.role === 'admin' || profile?.id === task.assigned_to) && (
                              <select
                                value={task.status}
                                onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as any)}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-surface border border-border text-text"
                              >
                                <option value="pendente">Pendente</option>
                                <option value="em_andamento">Em Andamento</option>
                                <option value="concluido">Concluído</option>
                                <option value="pausado">Pausado</option>
                              </select>
                            )}
                          </div>

                        </div>

                        {/* Progress controller bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                            <span>Percentual Concluído</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={task.progress}
                              onChange={(e) => handleUpdateTaskStatus(task.id, task.status, Number(e.target.value))}
                              disabled={!(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.id === task.assigned_to)}
                              className="flex-1 accent-primary h-1.5 bg-input-bg rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-TAB: MATERIALS (MATERIAIS) */}
            {projectSubTab === 'materials' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Suprimentos e Estoque da Obra</h4>
                  {(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.role === 'admin') && (
                    <button
                      onClick={() => setShowCreateMaterial(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition"
                    >
                      <Plus size={14} />
                      <span>Novo Material</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materials.filter(m => m.project_id === selectedProjectId).map(mat => {
                    const ratio = mat.acquired_quantity / mat.needed_quantity;
                    const isLow = ratio < 0.3;

                    return (
                      <div key={mat.id} className="bg-surface rounded-2xl border border-border p-5 space-y-4 hover:border-primary-100 transition shadow-sm">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h5 className="font-bold text-base text-secondary">{mat.name}</h5>
                            {mat.notes && <p className="text-xs text-text-secondary mt-0.5">{mat.notes}</p>}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isLow ? 'bg-error-light text-error animate-pulse' : 'bg-success/10 text-success'
                          }`}>
                            {isLow ? '⚠️ Crítico' : 'Estoque Saudável'}
                          </span>
                        </div>

                        {/* Progress values */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-text-secondary">
                            <span>Quantidade Comprada</span>
                            <span>{mat.acquired_quantity} / {mat.needed_quantity} {mat.unit} ({Math.round(ratio * 100)}%)</span>
                          </div>
                          <div className="h-2 w-full bg-input-bg rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${isLow ? 'bg-error' : 'bg-success'}`}
                              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Inventory adjustments (Anyone can record addition of materials in canteiro!) */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/60">
                          <span className="text-[11px] font-bold text-text-secondary uppercase">Registrar Entrada</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateMaterialQuantity(mat.id, -10)}
                              className="px-2 py-1 rounded bg-surface-alt hover:bg-input-bg border border-border text-xs font-bold"
                            >
                              -10
                            </button>
                            <button
                              onClick={() => handleUpdateMaterialQuantity(mat.id, -1)}
                              className="px-2 py-1 rounded bg-surface-alt hover:bg-input-bg border border-border text-xs font-bold"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleUpdateMaterialQuantity(mat.id, 1)}
                              className="px-2 py-1 rounded bg-surface-alt hover:bg-input-bg border border-border text-xs font-bold text-primary"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleUpdateMaterialQuantity(mat.id, 10)}
                              className="px-2 py-1 rounded bg-surface-alt hover:bg-input-bg border border-border text-xs font-bold text-primary"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-TAB: TEAM (EQUIPE LOCAL) */}
            {projectSubTab === 'team' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Integrantes do Canteiro de Obra</h4>
                  {(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.role === 'admin') && (
                    <button
                      onClick={() => setShowInviteMember(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition"
                    >
                      <Plus size={14} />
                      <span>Designar Colaborador</span>
                    </button>
                  )}
                </div>

                {(() => {
                  const currentProjectMembers = projectMembers.filter(m => m.project_id === selectedProjectId);
                  const userProfiles = currentProjectMembers.map(m => team.find(t => t.id === m.user_id)).filter(Boolean) as Profile[];

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userProfiles.map(member => (
                        <div key={member.id} className="bg-surface rounded-2xl border border-border p-4 flex gap-4 items-center">
                          <img src={member.avatar_url || ''} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-secondary block truncate leading-tight">{member.full_name}</span>
                            <span className="text-[10px] text-text-light uppercase font-bold tracking-wider">{ROLE_LABELS[member.role]}</span>
                            <p className="text-[11px] text-text-secondary mt-1 truncate">{member.phone || 'Sem telefone'}</p>
                          </div>
                          
                          {/* Quick remove from project member */}
                          {(profile?.role === 'engenheiro' || profile?.role === 'admin') && member.id !== profile?.id && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Deseja desvincular ${member.full_name} desta obra?`)) return;

                                if (isRealSupabaseConfigured && realSupabase) {
                                  const { error } = await realSupabase
                                    .from('project_members')
                                    .delete()
                                    .eq('project_id', selectedProjectId)
                                    .eq('user_id', member.id);
                                  if (error) {
                                    console.error('Erro ao remover integrante:', error);
                                    alert('Não foi possível remover o integrante: ' + error.message);
                                    return;
                                  }
                                } else {
                                  const current = mockDb.getMembers().filter(m => !(m.project_id === selectedProjectId && m.user_id === member.id));
                                  mockDb.setMembers(current);
                                }
                                loadData();
                              }}
                              className="text-text-light hover:text-error transition p-1"
                              title="Remover integrante"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SUB-TAB: MESSAGES (CONVERSAS DO CANTEIRO) */}
            {projectSubTab === 'messages' && (
              <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 shadow-sm flex flex-col h-[450px] animate-fade-in">
                <div className="border-b pb-3 mb-4 flex items-center gap-2">
                  <MessageSquare className="text-primary" size={18} />
                  <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Mural e Instruções Técnicas</h4>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {messages.filter(m => m.project_id === selectedProjectId).map(msg => {
                    const msgUser = team.find(u => u.id === msg.user_id);
                    const isCurrentUser = msg.user_id === profile?.id;

                    return (
                      <div key={msg.id} className={`flex gap-3 max-w-lg ${isCurrentUser ? 'ml-auto flex-row-reverse' : ''}`}>
                        <img 
                          src={msgUser?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                          alt="" 
                          className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                        />
                        <div className="space-y-1">
                          <div className={`flex items-baseline gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                            <span className="text-xs font-bold text-secondary">{msgUser?.full_name}</span>
                            <span className="text-[9px] text-text-light">
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isCurrentUser 
                              ? 'bg-primary text-white rounded-tr-none' 
                              : 'bg-surface-alt border border-border text-text rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message input field */}
                <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t border-border flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Escreva um comunicado ou resposta para a equipe..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs rounded-xl bg-surface-alt border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white shadow-sm transition shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </form>

              </div>
            )}

          </div>
        )}

        {/* ==========================================
            TAB: GENERAL MATERIALS VIEW (MATERIAIS COMPLETO)
           ========================================== */}
        {activeTab === 'materials' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold font-display text-secondary">Estoque de Materiais Geral</h2>
                <p className="text-sm text-text-secondary">Visão unificada de insumos e matérias-primas cadastradas</p>
              </div>
            </div>

            {/* Complete list grouped by active project */}
            {projects.map(proj => {
              const projMats = materials.filter(m => m.project_id === proj.id);
              if (projMats.length === 0) return null;

              return (
                <div key={proj.id} className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Building2 size={16} className="text-primary" />
                    <h3 className="font-bold text-base text-secondary">{proj.name}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projMats.map(mat => {
                      const ratio = mat.acquired_quantity / mat.needed_quantity;
                      const isLow = ratio < 0.3;

                      return (
                        <div key={mat.id} className="p-4 rounded-xl border border-border bg-surface-alt space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-xs font-bold text-secondary block">{mat.name}</span>
                              {mat.notes && <span className="text-[10px] text-text-secondary">{mat.notes}</span>}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isLow ? 'bg-error-light text-error' : 'bg-success/10 text-success'
                            }`}>
                              {isLow ? '🚨 Estoque Crítico' : 'Estoque Regular'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-text-secondary">
                              <span>Adquirido</span>
                              <span>{mat.acquired_quantity} / {mat.needed_quantity} {mat.unit} ({Math.round(ratio * 100)}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-input-bg rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${isLow ? 'bg-error' : 'bg-success'}`}
                                style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==========================================
            TAB: GENERAL TASKS (CRONOGRAMA DE SERVIÇOS)
           ========================================== */}
        {activeTab === 'tasks' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold font-display text-secondary">Cronograma Geral de Serviços</h2>
              <p className="text-sm text-text-secondary">Lista consolidada de tarefas de engenharia e campo</p>
            </div>

            <div className="space-y-6">
              {projects.map(proj => {
                const projTasks = tasks.filter(t => t.project_id === proj.id);
                if (projTasks.length === 0) return null;

                return (
                  <div key={proj.id} className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Building2 size={16} className="text-primary" />
                      <h3 className="font-bold text-base text-secondary">{proj.name}</h3>
                    </div>

                    <div className="space-y-3">
                      {projTasks.map(task => {
                        const assignedUser = team.find(u => u.id === task.assigned_to);

                        return (
                          <div key={task.id} className="p-4 rounded-xl border border-border bg-surface-alt flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-50 px-2 py-0.5 rounded">{task.category}</span>
                                <h5 className="font-bold text-sm text-secondary truncate">{task.title}</h5>
                              </div>
                              <p className="text-xs text-text-secondary truncate">{task.description}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 shrink-0 text-xs">
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <User size={14} className="text-text-light" />
                                <span>{assignedUser?.full_name || 'Sem Responsável'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-text-secondary">
                                <Calendar size={14} className="text-text-light" />
                                <span>{formatDate(task.deadline)}</span>
                              </div>
                              <span 
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{ 
                                  backgroundColor: `${STATUS_COLORS[task.status]}15`,
                                  color: STATUS_COLORS[task.status]
                                }}
                              >
                                {STATUS_LABELS[task.status]}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: TEAM (EQUIPE COMPLETA)
           ========================================== */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold font-display text-secondary">Profissionais da Construtora</h2>
              <p className="text-sm text-text-secondary">Quadro técnico, líderes de equipe e funcionários de campo</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map(member => {
                const assignedTasks = tasks.filter(t => t.assigned_to === member.id);
                const activeHoursLogged = assignedTasks.filter(t => t.status === 'em_andamento').length;
                const phoneLinks = getPhoneLinks(member.phone);

                return (
                  <div key={member.id} className="bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition">
                    <div className="flex gap-4 items-center mb-4">
                      <img src={member.avatar_url || ''} alt="" className="w-14 h-14 rounded-full object-cover border border-primary/20 shrink-0" />
                      <div>
                        <h4 className="font-bold text-base text-secondary leading-tight">{member.full_name}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded mt-1 inline-block" style={{ backgroundColor: ROLE_COLORS[member.role] }}>
                          {ROLE_LABELS[member.role]}
                        </span>
                        <p className="text-xs text-text-secondary mt-1">{member.phone || 'Sem Telefone'}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-alt rounded-xl border border-border flex justify-around text-center text-xs font-bold text-text-secondary mb-3">
                      <div>
                        <span className="block text-primary text-sm font-display">{assignedTasks.length}</span>
                        <span className="text-[9px] text-text-light font-bold uppercase">Atividades</span>
                      </div>
                      <div className="border-r border-border h-8 my-auto"></div>
                      <div>
                        <span className="block text-warning text-sm font-display">{activeHoursLogged}</span>
                        <span className="text-[9px] text-text-light font-bold uppercase">Em Execução</span>
                      </div>
                    </div>

                    {phoneLinks && (
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={phoneLinks.whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-success/10 hover:bg-success text-success hover:text-white font-bold text-xs transition"
                        >
                          <MessageCircle size={15} />
                          WhatsApp
                        </a>
                        <a
                          href={phoneLinks.tel}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs transition"
                        >
                          <Phone size={15} />
                          Ligar
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: NOTIFICATIONS (AVISOS GERAIS)
           ========================================== */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header section with Action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-display text-secondary">Avisos e Incidentes do Canteiro</h2>
                <p className="text-sm text-text-secondary">Monitore alertas de suprimentos baixos, prazos e avisos gerais</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={markAllAsRead}
                  className="px-3.5 py-2 border border-border bg-surface hover:bg-input-bg rounded-xl text-xs font-bold text-text-secondary hover:text-primary transition flex items-center gap-1.5"
                >
                  <CheckSquare size={14} />
                  <span>Marcar Todos Lidos</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza de que deseja apagar permanentemente todo o histórico de avisos?')) {
                      mockDb.setNotifications([]);
                      setNotifications([]);
                    }
                  }}
                  className="px-3.5 py-2 border border-border bg-surface hover:bg-error-light rounded-xl text-xs font-bold text-error transition flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Limpar Histórico</span>
                </button>
              </div>
            </div>

            {/* Faceted Filtering & Search Panel */}
            <div className="bg-surface p-4 rounded-2xl border border-border space-y-3 shadow-sm">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 text-text-light" size={16} />
                  <input
                    type="text"
                    placeholder="Filtrar avisos por texto ou conteúdo..."
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-surface-alt border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
                  <select
                    value={notifTypeFilter}
                    onChange={(e) => setNotifTypeFilter(e.target.value as any)}
                    className="text-xs font-semibold px-3 py-2 rounded-xl bg-surface-alt border border-border text-text-secondary focus:outline-none"
                  >
                    <option value="all">Categorias (Todas)</option>
                    <option value="material_low">⚠️ Estoque Crítico</option>
                    <option value="task_deadline">📅 Atribuições / Prazos</option>
                    <option value="task_overdue">🚨 Prazos Expirados</option>
                    <option value="system">⚙️ Comunicados</option>
                  </select>

                  <select
                    value={notifStatusFilter}
                    onChange={(e) => setNotifStatusFilter(e.target.value as any)}
                    className="text-xs font-semibold px-3 py-2 rounded-xl bg-surface-alt border border-border text-text-secondary focus:outline-none"
                  >
                    <option value="all">Status (Todos)</option>
                    <option value="unread">Não Resolvidos</option>
                    <option value="read">Resolvidos / Lidos</option>
                  </select>

                  <select
                    value={notifProjectFilter}
                    onChange={(e) => setNotifProjectFilter(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 rounded-xl bg-surface-alt border border-border text-text-secondary focus:outline-none col-span-2 sm:col-span-1"
                  >
                    <option value="all">Filtrar por Obra (Todas)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main Double Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Notification stream - 2 Cols */}
              <div className="lg:col-span-2 space-y-3">
                {(() => {
                  const filtered = notifications.filter(notif => {
                    const matchesSearch = notif.title.toLowerCase().includes(notifSearch.toLowerCase()) || 
                                          notif.message.toLowerCase().includes(notifSearch.toLowerCase());
                    const matchesType = notifTypeFilter === 'all' || notif.type === notifTypeFilter;
                    const matchesStatus = notifStatusFilter === 'all' || 
                                          (notifStatusFilter === 'unread' && !notif.read) || 
                                          (notifStatusFilter === 'read' && notif.read);
                    const matchesProject = notifProjectFilter === 'all' || notif.projectId === notifProjectFilter;
                    return matchesSearch && matchesType && matchesStatus && matchesProject;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-surface border border-border rounded-2xl p-10 text-center shadow-sm">
                        <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary mx-auto mb-3">
                          <Bell size={24} className="text-primary/70" />
                        </div>
                        <h4 className="font-bold text-sm text-secondary mb-1">Nenhum aviso localizado</h4>
                        <p className="text-xs text-text-secondary max-w-sm mx-auto">Você não possui avisos pendentes para os filtros de busca selecionados.</p>
                      </div>
                    );
                  }

                  return filtered.map(notif => {
                    const isAlert = notif.type === 'material_low' || notif.type === 'task_overdue';
                    
                    return (
                      <div 
                        key={notif.id} 
                        className={`bg-surface rounded-2xl border border-border p-4 flex gap-4 hover:border-primary-100 transition shadow-sm relative ${
                          !notif.read ? 'border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          notif.type === 'material_low' 
                            ? 'bg-error-light text-error' 
                            : notif.type === 'task_overdue'
                            ? 'bg-error-light text-error'
                            : notif.type === 'task_deadline'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-primary-50 text-primary'
                        }`}>
                          {isAlert ? <ShieldAlert size={20} /> : <Info size={20} />}
                        </div>

                        <div className="flex-1 space-y-1 pr-6">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                            <h4 className="font-bold text-xs sm:text-sm text-secondary flex items-center gap-1.5">
                              {notif.title}
                              {!notif.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                              )}
                            </h4>
                            <span className="text-[10px] text-text-light font-medium shrink-0">
                              {new Date(notif.createdAt).toLocaleDateString('pt-BR')} às {new Date(notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">{notif.message}</p>
                          
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {notif.projectName && (
                              <span className="text-[9px] font-bold bg-primary-50 text-primary px-2 py-0.5 rounded">
                                Obra: {notif.projectName}
                              </span>
                            )}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              notif.type === 'material_low' 
                                ? 'bg-error-light text-error' 
                                : notif.type === 'task_overdue' 
                                ? 'bg-error-light text-error'
                                : 'bg-surface-alt border border-border text-text-secondary'
                            }`}>
                              {notif.type === 'material_low' ? 'Insumos' : notif.type === 'task_overdue' ? 'Atrasado' : notif.type === 'task_deadline' ? 'Atividade' : 'Geral'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive buttons */}
                        <div className="absolute right-3 top-3 flex items-center gap-1">
                          {!notif.read ? (
                            <button
                              onClick={() => {
                                const current = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
                                mockDb.setNotifications(current);
                                setNotifications(current);
                              }}
                              className="p-1 rounded-lg hover:bg-input-bg text-text-light hover:text-success transition"
                              title="Marcar como Resolvido"
                            >
                              <CheckCircle size={15} />
                            </button>
                          ) : (
                            <span className="text-success p-1" title="Resolvido">
                              <Check size={14} />
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const current = notifications.filter(n => n.id !== notif.id);
                              mockDb.setNotifications(current);
                              setNotifications(current);
                            }}
                            className="p-1 rounded-lg hover:bg-error-light text-text-light hover:text-error transition"
                            title="Excluir Alerta"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Sidebar Configuration & Manual Notification Trigger - 1 Col */}
              <div className="space-y-6">
                
                {/* 1. Alert Parameters Configuration */}
                <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Sliders size={16} className="text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-secondary">Parâmetros de Alerta</h3>
                  </div>

                  {/* Sound Cue toggle */}
                  <div className="flex items-center justify-between p-3 bg-surface-alt rounded-xl border border-border">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-secondary block">Alerta Sonoro (Sintetizado)</span>
                      <span className="text-[10px] text-text-secondary block">Chime de áudio em tempo real</span>
                    </div>
                    <button
                      onClick={() => {
                        const next = !soundEnabled;
                        setSoundEnabled(next);
                        localStorage.setItem('notif_sound_enabled', String(next));
                        
                        // Play a pleasant chime immediately so user can try the sound
                        if (next) {
                          try {
                            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                            const ctx = new AudioContextClass();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.frequency.setValueAtTime(659.25, ctx.currentTime);
                            gain.gain.setValueAtTime(0.08, ctx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                            osc.start();
                            osc.stop(ctx.currentTime + 0.2);
                          } catch (e) {}
                        }
                      }}
                      className={`p-2 rounded-xl transition ${
                        soundEnabled ? 'bg-primary text-white' : 'bg-surface border border-border text-text-light'
                      }`}
                      title={soundEnabled ? "Desativar Som" : "Ativar Som"}
                    >
                      {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                  </div>

                  {/* Critical Stock threshold range input */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-secondary">
                      <span>Limite de Estoque Baixo</span>
                      <span className="text-primary">{stockThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={stockThreshold}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStockThreshold(val);
                        localStorage.setItem('notif_stock_threshold', String(val));
                      }}
                      className="w-full accent-primary h-1.5 bg-input-bg rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-text-secondary leading-normal">
                      Os alertas de estoque crítico serão disparados automaticamente sempre que o suprimento cair abaixo de {stockThreshold}% da quantidade ideal.
                    </p>
                  </div>
                </div>

                {/* 2. Custom Manual Notification Simulator */}
                <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Sparkles size={16} className="text-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-secondary">Simulador de Alertas</h3>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    Envie avisos manuais instantâneos para testar os efeitos visuais, Toasts flutuantes e alarmes sonoros.
                  </p>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!customNotifTitle.trim() || !customNotifMsg.trim()) return;
                      
                      let projId = customNotifProjId;
                      let projName = '';
                      
                      if (!projId && projects.length > 0) {
                        projId = projects[0].id;
                        projName = projects[0].name;
                      } else if (projId) {
                        const p = projects.find(proj => proj.id === projId);
                        if (p) projName = p.name;
                      }

                      triggerNotification(
                        customNotifType,
                        customNotifTitle.trim(),
                        customNotifMsg.trim(),
                        projId || 'system-global',
                        projName || 'Geral'
                      );

                      setCustomNotifTitle('');
                      setCustomNotifMsg('');
                    }} 
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-text-light mb-1">Categoria do Alerta</label>
                      <select
                        value={customNotifType}
                        onChange={(e) => setCustomNotifType(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-surface-alt text-text"
                      >
                        <option value="system">⚙️ Comunicado Geral (Success chime)</option>
                        <option value="material_low">⚠️ Estoque Crítico (Alarm sound)</option>
                        <option value="task_deadline">📅 Atribuição de Serviço (Success chime)</option>
                        <option value="task_overdue">🚨 Serviço Atrasado (Alarm sound)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-text-light mb-1">Obra Vinculada</label>
                      <select
                        value={customNotifProjId}
                        onChange={(e) => setCustomNotifProjId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-surface-alt text-text"
                      >
                        <option value="">Geral / Sem Obra</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-text-light mb-1">Título do Alerta *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Entrega de Brita Bloqueada"
                        value={customNotifTitle}
                        onChange={(e) => setCustomNotifTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-text-light mb-1">Mensagem do Alerta *</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Ex: O caminhão de fornecimento quebrou no trajeto."
                        value={customNotifMsg}
                        onChange={(e) => setCustomNotifMsg(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-1"
                    >
                      <Sparkles size={13} />
                      <span>Emitir Alerta Sonoro/Visual</span>
                    </button>
                  </form>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            TAB: USER PROFILE & SETTINGS (PERFIL)
           ========================================== */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6 text-center">
              
              {/* Profile cover picture */}
              <div className="relative inline-block">
                <img 
                  src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                  alt={profile?.full_name} 
                  className="w-24 h-24 rounded-full border-4 border-primary/20 mx-auto object-cover"
                />
                <label
                  htmlFor="avatar-upload-input"
                  className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center border-2 border-surface shadow-md cursor-pointer hover:bg-primary/90 transition ${avatarUploading ? 'pointer-events-none opacity-70' : ''}`}
                  title="Alterar foto de perfil"
                >
                  {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </label>
                <input
                  id="avatar-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
              </div>
              {avatarError && (
                <p className="text-xs font-semibold text-error -mt-2">{avatarError}</p>
              )}

              <div>
                <h3 className="text-xl font-bold font-display text-secondary">{profile?.full_name}</h3>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Função Ativa: {ROLE_LABELS[profile?.role || 'funcionario']}</span>
              </div>

              {/* User stats */}
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-background rounded-xl border border-border space-y-0.5">
                  <span className="text-[10px] text-text-light font-bold uppercase tracking-wider">E-mail de Trabalho</span>
                  <p className="text-xs font-bold text-secondary">{session?.user?.email || `${profile?.id}@obras.com`}</p>
                </div>
                <div className="p-4 bg-background rounded-xl border border-border space-y-0.5">
                  <span className="text-[10px] text-text-light font-bold uppercase tracking-wider">Telefone de Contato</span>
                  <p className="text-xs font-bold text-secondary">{profile?.phone || 'Não informado'}</p>
                </div>
              </div>

              <button
                onClick={signOut}
                className="w-full py-3 px-4 rounded-xl bg-error/10 hover:bg-error text-error hover:text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                <span>Encerrar Sessão</span>
              </button>

            </div>
          </div>
        )}



      </main>

      {/* ==========================================
          MODAL: CREATE PROJECT (NOVA OBRA)
         ========================================== */}
      {showCreateProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h4 className="font-bold text-lg text-secondary font-display">Registrar Nova Obra</h4>
              <button onClick={() => setShowCreateProject(false)} className="text-text-light hover:text-text-secondary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Foto de Capa</label>
                {newProjCover && (
                  <img src={newProjCover} alt="Prévia da capa" className="w-full h-32 object-cover rounded-xl border border-border mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverImageSelect(e, setNewProjCover)}
                  className="w-full text-xs text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Nome da Obra *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Residencial Bela Vista"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Cliente</label>
                <input
                  type="text"
                  placeholder="Ex: Construtora Alfa Ltda"
                  value={newProjClient}
                  onChange={(e) => setNewProjClient(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Endereço da Obra</label>
                <input
                  type="text"
                  placeholder="Ex: Av. das Nações, 420 - Centro"
                  value={newProjAddress}
                  onChange={(e) => setNewProjAddress(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Prazo Estimado de Entrega</label>
                <input
                  type="date"
                  value={newProjDeadline}
                  onChange={(e) => setNewProjDeadline(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Descrição do Projeto</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes adicionais sobre escopo, pavimentos ou especificações técnicas..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="flex-1 py-2.5 border border-border bg-surface hover:bg-input-bg text-text-secondary text-sm font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition shadow-md shadow-primary/10"
                >
                  Criar Obra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: EDIT PROJECT (EDITAR OBRA)
         ========================================== */}
      {showEditProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h4 className="font-bold text-lg text-secondary font-display">Editar Obra</h4>
              <button onClick={() => setShowEditProject(false)} className="text-text-light hover:text-text-secondary">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Foto de Capa</label>
                {editProjCoverImage && (
                  <img src={editProjCoverImage} alt="Prévia da capa" className="w-full h-32 object-cover rounded-xl border border-border mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverImageSelect(e, setEditProjCoverImage)}
                  className="w-full text-xs text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Nome da Obra *</label>
                <input
                  type="text"
                  required
                  value={editProjName}
                  onChange={(e) => setEditProjName(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Cliente</label>
                <input
                  type="text"
                  value={editProjClient}
                  onChange={(e) => setEditProjClient(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Endereço da Obra</label>
                <input
                  type="text"
                  value={editProjAddress}
                  onChange={(e) => setEditProjAddress(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Prazo Estimado de Entrega</label>
                <input
                  type="date"
                  value={editProjDeadline}
                  onChange={(e) => setEditProjDeadline(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Descrição do Projeto</label>
                <textarea
                  rows={3}
                  value={editProjDesc}
                  onChange={(e) => setEditProjDesc(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProject(false)}
                  className="flex-1 py-2.5 border border-border bg-surface hover:bg-input-bg text-text-secondary text-sm font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition shadow-md shadow-primary/10"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CREATE TASK (NOVO SERVIÇO)
         ========================================== */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h4 className="font-bold text-lg text-secondary font-display">Adicionar Novo Serviço</h4>
              <button onClick={() => setShowCreateTask(false)} className="text-text-light hover:text-text-secondary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Nome da Atividade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Escovamento de Vigas"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Categoria</label>
                <select
                  value={newTaskCat}
                  onChange={(e) => setNewTaskCat(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none"
                >
                  <option value="">Selecione a especialidade...</option>
                  <option value="Fundação">Fundação</option>
                  <option value="Estrutura">Estrutura</option>
                  <option value="Alvenaria">Alvenaria</option>
                  <option value="Instalações">Instalações</option>
                  <option value="Elétrica">Elétrica</option>
                  <option value="Acabamento">Acabamento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Colaborador Responsável</label>
                <select
                  value={newTaskAssigned}
                  onChange={(e) => setNewTaskAssigned(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none"
                >
                  <option value="">Selecione o encarregado ou funcionário...</option>
                  {team.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({ROLE_LABELS[u.role]})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Prazo de Entrega</label>
                <input
                  type="date"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Instruções de execução específicas..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="flex-1 py-2.5 border border-border bg-surface hover:bg-input-bg text-text-secondary text-sm font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition shadow-md"
                >
                  Criar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CREATE MATERIAL (NOVO MATERIAL)
         ========================================== */}
      {showCreateMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h4 className="font-bold text-lg text-secondary font-display">Cadastrar Insumo / Material</h4>
              <button onClick={() => setShowCreateMaterial(false)} className="text-text-light hover:text-text-secondary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateMaterial} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Nome do Material *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cimento CP II"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Unidade *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sacos, kg, m³, Unid..."
                    value={newMatUnit}
                    onChange={(e) => setNewMatUnit(e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Quantidade Necessária *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newMatNeeded}
                    onChange={(e) => setNewMatNeeded(Number(e.target.value))}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Quantidade já Adquirida (Estoque Inicial)</label>
                <input
                  type="number"
                  min="0"
                  value={newMatAcquired}
                  onChange={(e) => setNewMatAcquired(Number(e.target.value))}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Notas / Instruções de Armazenamento</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Guardar sobre paletes, longe de umidade..."
                  value={newMatNotes}
                  onChange={(e) => setNewMatNotes(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateMaterial(false)}
                  className="flex-1 py-2.5 border border-border bg-surface hover:bg-input-bg text-text-secondary text-sm font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition shadow-md"
                >
                  Criar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: DESIGN TEAM MEMBER (DESIGNAR INTEGRANTE)
         ========================================== */}
      {showInviteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-sm shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h4 className="font-bold text-lg text-secondary font-display">Adicionar à Equipe</h4>
              <button onClick={() => { setShowInviteMember(false); setInviteMode('existing'); }} className="text-text-light hover:text-text-secondary">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setInviteMode('existing')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  inviteMode === 'existing' ? 'bg-primary text-white shadow-sm' : 'bg-surface-alt border border-border text-text-secondary hover:bg-input-bg'
                }`}
              >
                Já Tem Conta
              </button>
              <button
                type="button"
                onClick={() => setInviteMode('new')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  inviteMode === 'new' ? 'bg-primary text-white shadow-sm' : 'bg-surface-alt border border-border text-text-secondary hover:bg-input-bg'
                }`}
              >
                Novo Funcionário
              </button>
            </div>

            {inviteMode === 'existing' ? (
              <form onSubmit={handleInviteMember} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Selecionar Profissional *</label>
                  <select
                    required
                    value={inviteUserId}
                    onChange={(e) => setInviteUserId(e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Selecione o profissional...</option>
                    {team.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({ROLE_LABELS[u.role]})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowInviteMember(false); setInviteMode('existing'); }}
                    className="flex-1 py-2.5 border border-border bg-surface hover:bg-input-bg text-text-secondary text-sm font-semibold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition shadow-md"
                  >
                    Designar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddNewEmployee} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Augusto"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={newEmployeePhone}
                    onChange={(e) => setNewEmployeePhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Cargo *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['engenheiro', 'mestre_obra', 'encarregado', 'funcionario'] as UserRole[]).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setNewEmployeeRole(r)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border transition text-center ${
                          newEmployeeRole === r
                            ? 'bg-primary border-primary text-white'
                            : 'border-border bg-surface-alt text-text-secondary hover:bg-input-bg'
                        }`}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowInviteMember(false); setInviteMode('existing'); }}
                    className="flex-1 py-2.5 border border-border bg-surface hover:bg-input-bg text-text-secondary text-sm font-semibold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition shadow-md"
                  >
                    Cadastrar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          FLOATING IN-APP TOAST NOTIFICATIONS
         ========================================== */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {activeToasts.map(toast => {
          const isWarning = toast.type === 'material_low' || toast.type === 'task_overdue';
          return (
            <div
              key={toast.id}
              onClick={() => {
                setActiveTab('notifications');
                setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              className="pointer-events-auto bg-surface/95 backdrop-blur border border-border/80 p-4 rounded-2xl shadow-xl flex gap-3 transition-all duration-300 transform translate-y-0 hover:translate-y-[-2px] cursor-pointer hover:border-primary-100 animate-fade-in"
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                isWarning ? 'bg-error-light text-error animate-pulse' : 'bg-primary-50 text-primary'
              }`}>
                {isWarning ? <ShieldAlert size={16} /> : <Bell size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-1">
                  <h5 className="font-bold text-xs text-secondary truncate leading-normal">{toast.title}</h5>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
                    }}
                    className="text-text-light hover:text-text-secondary transition p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5 line-clamp-2">{toast.message}</p>
                {toast.projectName && (
                  <span className="inline-block text-[9px] font-bold bg-primary-50 text-primary px-1.5 py-0.5 rounded mt-1">
                    Obra: {toast.projectName}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SIMULATED NATIVE ANDROID PERMISSION DIALOG (Material You style) */}
      {showAndroidPermissionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface text-text rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-border transform scale-100 transition-all duration-300">
            
            {/* Header: Android style Location Icon */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3 animate-bounce">
                <MapPin size={30} className="text-primary fill-primary/10" />
              </div>
              <h4 className="text-base font-bold font-display tracking-tight text-secondary px-2 leading-snug">
                Permitir que o app <span className="font-extrabold text-primary">PHD Gestão de Obras</span> acesse a localização deste dispositivo?
              </h4>
            </div>

            {/* Description / Explanatory text */}
            <p className="text-xs text-text-secondary text-center mb-6 px-1 leading-relaxed">
              O aplicativo requer permissão de geolocalização para sincronizar automaticamente a previsão do tempo do canteiro, registrar as horas dos serviços locais com exatidão e integrar o fuso horário correto do dispositivo.
            </p>

            {/* Android style Action Buttons */}
            <div className="flex flex-col gap-2 font-medium animate-pulse-subtle">
              <button
                onClick={requestAndroidLocationPermission}
                className="w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition shadow-sm hover:shadow active:scale-[0.98]"
              >
                Durante o uso do app
              </button>
              <button
                onClick={requestAndroidLocationPermission}
                className="w-full py-3 px-4 rounded-2xl bg-input-bg border border-border hover:bg-gray-100 text-text text-sm font-semibold transition active:scale-[0.98]"
              >
                Apenas esta vez
              </button>
              <button
                onClick={() => {
                  setShowAndroidPermissionModal(false);
                  setPermissionStatus('denied');
                  fetchWeatherByCoords(-23.5489, -46.6388, false);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-transparent hover:bg-black/5 text-error text-xs font-semibold transition text-center"
              >
                Não permitir
              </button>
            </div>
            
            {/* Android Visual Navigation Bar decoration */}
            <div className="w-20 h-1 bg-border rounded-full mx-auto mt-5"></div>
          </div>
        </div>
      )}

    </div>
  );
}
