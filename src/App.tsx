import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, HardHat, Package, ClipboardList, Users, Bell, User, 
  Plus, MapPin, Calendar, ChevronRight, X, ArrowRight, Eye, EyeOff, 
  Check, Play, Square, Clock, Send, ShieldAlert, CheckCircle, 
  Search, Sliders, LogOut, CheckSquare, MessageSquare, Briefcase,
  Trash2, Volume2, VolumeX, Sparkles, Filter, Info,
  Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Navigation,
  Camera, Loader2, Phone, MessageCircle, Share2, FileText, Upload, ShieldCheck, Home,
  TrendingUp, TrendingDown, DollarSign, BarChart3
} from 'lucide-react';
import { useAuth } from './lib/auth';
import { requestNotificationPermission, sendNativeNotification, scheduleMonthlyReportReminder } from './lib/notifications';
import { getNotificationPermissionStatus, NATIVE_RESOURCES, NativePermissionStatus } from './lib/permissions';
import {
  isAppLockEnabled, setAppLockEnabled, isDeviceSecurityAvailable, verifyDeviceSecurity,
  hasAskedAboutAppLock, setAskedAboutAppLock, DeviceSecurityResult,
} from './lib/appLock';
import AppLockScreen from './AppLockScreen';
import AppLockOfferScreen from './AppLockOfferScreen';
import { shareElementAsImage } from './lib/shareReport';
import { shareElementAsPdf } from './lib/sharePdfReport';
import { getProgressForecast } from './lib/progressForecast';
import { extractInvoiceText, parseInvoiceMaterials, InvoiceMaterialCandidate } from './lib/ocrInvoice';
import appIcon from './assets/images/icon.png';
import { supabase, mockDb, ROLE_LABELS, ROLE_COLORS, STATUS_LABELS, STATUS_COLORS, uploadAvatar, isRealSupabaseConfigured, realSupabase, generateMemberCode } from './lib/supabase';
import { Project, Task, Material, Message, LocalNotification, UserRole, Profile, ProjectMember, DiaryEntry, SafetyChecklistItem, IncidentReport, DEFAULT_SAFETY_ITEMS, BudgetItem, CashFlowEntry, SupplierQuote, Payment, MaterialReceipt } from './types';

export default function App() {
  const { session, profile, loading, signIn, signUp, signOut, refreshProfile, resetPassword } = useAuth();
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
  const [activeTab, setActiveTab] = useState<'inicio' | 'projects' | 'materials' | 'tasks' | 'team' | 'notifications' | 'profile'>('inicio');
  const [reportProjectId, setReportProjectId] = useState<string | null>(null);
  const [sharingReport, setSharingReport] = useState(false);
  const reportCardRef = useRef<HTMLDivElement>(null);
  
  // Drill-down project view
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectSubTab, setProjectSubTab] = useState<'overview' | 'tasks' | 'materials' | 'diary' | 'safety' | 'team' | 'messages' | 'financeiro'>('overview');

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
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [safetyItems, setSafetyItems] = useState<SafetyChecklistItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
  const [supplierQuotes, setSupplierQuotes] = useState<SupplierQuote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materialReceipts, setMaterialReceipts] = useState<MaterialReceipt[]>([]);
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
          { data: diaryData },
          { data: safetyData },
          { data: incidentsData },
        ] = await Promise.all([
          realSupabase.from('projects').select('*').order('created_at', { ascending: false }),
          realSupabase.from('tasks').select('*'),
          realSupabase.from('materials').select('*'),
          realSupabase.from('profiles').select('*'),
          realSupabase.from('messages').select('*').order('created_at', { ascending: true }),
          realSupabase.from('project_members').select('*'),
          realSupabase.from('diary_entries').select('*').order('entry_date', { ascending: false }),
          realSupabase.from('safety_checklist_items').select('*'),
          realSupabase.from('incidents').select('*').order('occurred_at', { ascending: false }),
        ]);

        setProjects((projectsData as Project[]) || []);
        setTasks((tasksData as Task[]) || []);
        setMaterials((materialsData as Material[]) || []);
        setTeam((profilesData as Profile[]) || []);
        setMessages((messagesData as Message[]) || []);
        setProjectMembers((membersData as ProjectMember[]) || []);
        setDiaryEntries((diaryData as DiaryEntry[]) || []);
        setSafetyItems((safetyData as SafetyChecklistItem[]) || []);
        setIncidents((incidentsData as IncidentReport[]) || []);
        // Financeiro e cotações permanecem locais ao dispositivo (sem tabela no banco ainda)
        setBudgetItems(mockDb.getBudgetItems());
        setCashFlow(mockDb.getCashFlow());
        setSupplierQuotes(mockDb.getSupplierQuotes());
        setPayments(mockDb.getPayments());
        setMaterialReceipts(mockDb.getMaterialReceipts());
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
    setDiaryEntries(mockDb.getDiaryEntries());
    setSafetyItems(mockDb.getSafetyItems());
    setIncidents(mockDb.getIncidents());
    setBudgetItems(mockDb.getBudgetItems());
    setCashFlow(mockDb.getCashFlow());
    setSupplierQuotes(mockDb.getSupplierQuotes());
    setPayments(mockDb.getPayments());
    setMaterialReceipts(mockDb.getMaterialReceipts());
  };

  // Segurança e Permissões: status da permissão nativa de notificações
  const [notifPermStatus, setNotifPermStatus] = useState<NativePermissionStatus>('web');

  const refreshNotifPermStatus = async () => {
    setNotifPermStatus(await getNotificationPermissionStatus());
  };

  // Bloqueio de segurança do app: usa só os recursos nativos do Android
  // (digital, rosto, PIN, padrão ou senha que o usuário já configurou no aparelho)
  const [appLockOn, setAppLockOn] = useState(false);
  const [appUnlocked, setAppUnlocked] = useState(false);
  const [deviceSecurityAvailable, setDeviceSecurityAvailable] = useState(false);
  const [showAppLockOffer, setShowAppLockOffer] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    const enabled = isAppLockEnabled(profile.id);
    setAppLockOn(enabled);
    setAppUnlocked(!enabled);

    isDeviceSecurityAvailable().then((available) => {
      setDeviceSecurityAvailable(available);
      // Primeira vez que este usuário abre o app: oferece ativar o bloqueio
      if (available && !enabled && !hasAskedAboutAppLock(profile.id)) {
        setShowAppLockOffer(true);
      }
    });
  }, [profile?.id]);

  const handleToggleAppLock = async (enabled: boolean) => {
    if (!profile?.id) return;
    if (enabled) {
      const result = await verifyDeviceSecurity('Confirme sua identidade para ativar o bloqueio de segurança');
      if (!result.success) {
        if (result.reason === 'not_enrolled') {
          alert('Seu Android ainda não tem nenhuma digital, PIN ou padrão configurados. Vá em Configurações do Android → Segurança → Bloqueio de tela, configure uma trava e tente novamente.');
        }
        return;
      }
    }
    setAppLockEnabled(profile.id, enabled);
    setAppLockOn(enabled);
  };

  // Ativa o bloqueio a partir da tela de oferta de primeiro acesso
  const handleActivateAppLockFromOffer = async (): Promise<DeviceSecurityResult> => {
    if (!profile?.id) return { success: false, reason: 'unknown' };
    const result = await verifyDeviceSecurity('Confirme sua identidade para ativar o bloqueio de segurança');
    if (result.success) {
      setAppLockEnabled(profile.id, true);
      setAppLockOn(true);
      setAppUnlocked(true); // já confirmou a identidade agora, não precisa pedir de novo
      setAskedAboutAppLock(profile.id);
      setShowAppLockOffer(false);
    }
    return result;
  };

  const handleDismissAppLockOffer = () => {
    if (!profile?.id) return;
    setAskedAboutAppLock(profile.id);
    setShowAppLockOffer(false);
  };

  useEffect(() => {
    loadData();
    // Pede permissão de notificações do sistema (Android/iOS) assim que o app abre
    requestNotificationPermission().then(refreshNotifPermStatus);
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
    localStorage.setItem('location_permission_prompted', 'true');
    
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

  const handleShareProjectReport = async (proj: Project) => {
    if (sharingReport) return;
    setSharingReport(true);
    try {
      setReportProjectId(proj.id);
      // Aguarda o card do relatório renderizar fora da tela antes de capturar
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      if (!reportCardRef.current) {
        throw new Error('Não foi possível preparar o relatório.');
      }

      const fileName = `relatorio-${proj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.png`;
      await shareElementAsImage(
        reportCardRef.current,
        fileName,
        `Relatório - ${proj.name}`,
        `Relatório da obra "${proj.name}" gerado pelo app PHD Gestões.`
      );
    } catch (err: any) {
      console.error('Erro ao compartilhar relatório:', err);
      alert('Erro ao compartilhar: ' + (err && err.message ? err.message : String(err)));
    } finally {
      setSharingReport(false);
      setReportProjectId(null);
    }
  };

  // Relatório PDF mensal da obra (mesmo card, exportado como PDF)
  const [sharingPdfReport, setSharingPdfReport] = useState(false);
  const [pdfReportProjectId, setPdfReportProjectId] = useState<string | null>(null);

  const handleShareProjectPdfReport = async (proj: Project) => {
    if (sharingPdfReport) return;
    setSharingPdfReport(true);
    try {
      setPdfReportProjectId(proj.id);
      setReportProjectId(proj.id);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      if (!reportCardRef.current) {
        throw new Error('Não foi possível preparar o relatório.');
      }

      const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const fileName = `relatorio-mensal-${proj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.pdf`;
      await shareElementAsPdf(
        reportCardRef.current,
        fileName,
        `Relatório Mensal - ${proj.name}`,
        `Relatório mensal (${monthLabel}) da obra "${proj.name}" gerado pelo app PHD Gestões.`
      );
    } catch (err: any) {
      console.error('Erro ao compartilhar relatório em PDF:', err);
      alert('Erro ao compartilhar: ' + (err && err.message ? err.message : String(err)));
    } finally {
      setSharingPdfReport(false);
      setPdfReportProjectId(null);
      setReportProjectId(null);
    }
  };

  // Agenda o lembrete mensal de relatório para todas as obras ativas
  useEffect(() => {
    projects
      .filter(p => p.status === 'em_andamento' || p.status === 'planejamento')
      .forEach(p => { scheduleMonthlyReportReminder(p.id, p.name); });
  }, [projects.length]);

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
          if (result.state === 'prompt' && session && !localStorage.getItem('location_permission_prompted')) {
            const t = setTimeout(() => {
              localStorage.setItem('location_permission_prompted', 'true');
              requestAndroidLocationPermission();
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
    if (!email || !password || !fullName || !phone) {
      setAuthError('Preencha os campos obrigatórios (*), incluindo o telefone.');
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = await signUp(email, password, fullName, userRole, phone);
      if (error) {
        if (/duplicate|unique|already exists/i.test(error)) {
          setAuthError('Esse telefone já está cadastrado em outra conta. Use outro número.');
        } else {
          setAuthError(error);
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao criar conta.';
      setAuthError(/duplicate|unique/i.test(msg) ? 'Esse telefone já está cadastrado em outra conta. Use outro número.' : msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Esqueci Minha Senha
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetEmail) {
      setResetError('Informe o e-mail da sua conta.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) {
        setResetError(error);
      } else {
        setResetSent(true);
      }
    } catch (err: any) {
      setResetError(err.message || 'Erro ao solicitar redefinição de senha.');
    } finally {
      setResetLoading(false);
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

  // Create Diary Entry (Diário de Obra)
  const [showCreateDiary, setShowCreateDiary] = useState(false);
  const [newDiaryDate, setNewDiaryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDiaryWeather, setNewDiaryWeather] = useState<'sol' | 'nublado' | 'chuva' | 'tempestade'>('sol');
  const [newDiaryWorkers, setNewDiaryWorkers] = useState(0);
  const [newDiaryDescription, setNewDiaryDescription] = useState('');
  const [newDiaryOccurrences, setNewDiaryOccurrences] = useState('');
  const [newDiaryPhoto, setNewDiaryPhoto] = useState<string | null>(null);

  const handleCreateDiaryEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiaryDescription.trim() || !selectedProjectId) return;

    const basePayload = {
      project_id: selectedProjectId,
      entry_date: newDiaryDate,
      weather: newDiaryWeather,
      workers_count: Number(newDiaryWorkers) || null,
      description: newDiaryDescription.trim(),
      occurrences: newDiaryOccurrences.trim() || null,
      photo: newDiaryPhoto,
      created_by: profile?.id || 'guest',
    };

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('diary_entries').insert(basePayload);
      if (error) {
        console.error('Erro ao registrar diário de obra:', error);
        alert('Não foi possível registrar o diário: ' + error.message);
        return;
      }
    } else {
      const newEntry: DiaryEntry = { id: `diary-${Date.now()}`, created_at: new Date().toISOString(), ...basePayload };
      const currentEntries = mockDb.getDiaryEntries();
      currentEntries.unshift(newEntry);
      mockDb.setDiaryEntries(currentEntries);
    }

    setNewDiaryDate(new Date().toISOString().slice(0, 10));
    setNewDiaryWeather('sol');
    setNewDiaryWorkers(0);
    setNewDiaryDescription('');
    setNewDiaryOccurrences('');
    setNewDiaryPhoto(null);
    setShowCreateDiary(false);
    loadData();
  };

  const handleDiaryPhotoSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setNewDiaryPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ==========================================
  // FINANCEIRO: ORÇAMENTO (previsto x realizado)
  // ==========================================
  const [showCreateBudgetItem, setShowCreateBudgetItem] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetPlanned, setNewBudgetPlanned] = useState('');
  const [newBudgetActual, setNewBudgetActual] = useState('');

  const handleCreateBudgetItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetCategory.trim() || !selectedProjectId) return;

    const newItem: BudgetItem = {
      id: `budget-${Date.now()}`,
      project_id: selectedProjectId,
      category: newBudgetCategory.trim(),
      planned_value: Number(newBudgetPlanned) || 0,
      actual_value: Number(newBudgetActual) || 0,
      notes: null,
      created_by: profile?.id || 'guest',
      created_at: new Date().toISOString(),
    };
    const current = mockDb.getBudgetItems();
    current.unshift(newItem);
    mockDb.setBudgetItems(current);
    setBudgetItems(current);

    setNewBudgetCategory('');
    setNewBudgetPlanned('');
    setNewBudgetActual('');
    setShowCreateBudgetItem(false);
  };

  const handleDeleteBudgetItem = (id: string) => {
    const current = mockDb.getBudgetItems().filter(b => b.id !== id);
    mockDb.setBudgetItems(current);
    setBudgetItems(current);
  };

  // ==========================================
  // FINANCEIRO: FLUXO DE CAIXA
  // ==========================================
  const [showCreateCashFlow, setShowCreateCashFlow] = useState(false);
  const [newCashFlowType, setNewCashFlowType] = useState<'entrada' | 'saida'>('saida');
  const [newCashFlowDate, setNewCashFlowDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newCashFlowDescription, setNewCashFlowDescription] = useState('');
  const [newCashFlowAmount, setNewCashFlowAmount] = useState('');
  const [newCashFlowCategory, setNewCashFlowCategory] = useState('');

  const handleCreateCashFlowEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashFlowDescription.trim() || !newCashFlowAmount || !selectedProjectId) return;

    const newEntry: CashFlowEntry = {
      id: `cashflow-${Date.now()}`,
      project_id: selectedProjectId,
      entry_date: newCashFlowDate,
      type: newCashFlowType,
      description: newCashFlowDescription.trim(),
      amount: Number(newCashFlowAmount) || 0,
      category: newCashFlowCategory.trim() || null,
      created_by: profile?.id || 'guest',
      created_at: new Date().toISOString(),
    };
    const current = mockDb.getCashFlow();
    current.unshift(newEntry);
    mockDb.setCashFlow(current);
    setCashFlow(current);

    setNewCashFlowType('saida');
    setNewCashFlowDate(new Date().toISOString().slice(0, 10));
    setNewCashFlowDescription('');
    setNewCashFlowAmount('');
    setNewCashFlowCategory('');
    setShowCreateCashFlow(false);
  };

  const handleDeleteCashFlowEntry = (id: string) => {
    const current = mockDb.getCashFlow().filter(c => c.id !== id);
    mockDb.setCashFlow(current);
    setCashFlow(current);
  };

  // ==========================================
  // COTAÇÃO DE FORNECEDORES
  // ==========================================
  const [quotingMaterialId, setQuotingMaterialId] = useState<string | null>(null);
  const [newQuoteSupplier, setNewQuoteSupplier] = useState('');
  const [newQuotePrice, setNewQuotePrice] = useState('');

  const handleCreateSupplierQuote = (e: React.FormEvent, materialId: string) => {
    e.preventDefault();
    if (!newQuoteSupplier.trim() || !newQuotePrice || !selectedProjectId) return;

    const newQuote: SupplierQuote = {
      id: `quote-${Date.now()}`,
      material_id: materialId,
      project_id: selectedProjectId,
      supplier_name: newQuoteSupplier.trim(),
      unit_price: Number(newQuotePrice) || 0,
      notes: null,
      created_by: profile?.id || 'guest',
      created_at: new Date().toISOString(),
    };
    const current = mockDb.getSupplierQuotes();
    current.unshift(newQuote);
    mockDb.setSupplierQuotes(current);
    setSupplierQuotes(current);

    setNewQuoteSupplier('');
    setNewQuotePrice('');
  };

  const handleDeleteSupplierQuote = (id: string) => {
    const current = mockDb.getSupplierQuotes().filter(q => q.id !== id);
    mockDb.setSupplierQuotes(current);
    setSupplierQuotes(current);
  };

  // ==========================================
  // PAGAMENTOS A FORNECEDORES E FUNCIONÁRIOS
  // ==========================================
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [newPaymentName, setNewPaymentName] = useState('');
  const [newPaymentType, setNewPaymentType] = useState<'fornecedor' | 'funcionario'>('fornecedor');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDueDate, setNewPaymentDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentName.trim() || !newPaymentAmount || !selectedProjectId) return;

    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      project_id: selectedProjectId,
      payee_name: newPaymentName.trim(),
      payee_type: newPaymentType,
      amount: Number(newPaymentAmount) || 0,
      due_date: newPaymentDueDate || null,
      paid_date: null,
      status: 'pendente',
      notes: null,
      created_by: profile?.id || 'guest',
      created_at: new Date().toISOString(),
    };
    const current = mockDb.getPayments();
    current.unshift(newPayment);
    mockDb.setPayments(current);
    setPayments(current);

    setNewPaymentName('');
    setNewPaymentType('fornecedor');
    setNewPaymentAmount('');
    setNewPaymentDueDate(new Date().toISOString().slice(0, 10));
    setShowCreatePayment(false);
  };

  const handleMarkPaymentPaid = (id: string) => {
    const current = mockDb.getPayments().map(p =>
      p.id === id ? { ...p, status: 'pago' as const, paid_date: new Date().toISOString().slice(0, 10) } : p
    );
    mockDb.setPayments(current);
    setPayments(current);
  };

  const handleDeletePayment = (id: string) => {
    const current = mockDb.getPayments().filter(p => p.id !== id);
    mockDb.setPayments(current);
    setPayments(current);
  };

  // ==========================================
  // NOTAS FISCAIS / COMPROVANTES DE MATERIAIS
  // ==========================================
  const [receiptMaterialId, setReceiptMaterialId] = useState<string | null>(null);
  const [newReceiptAmount, setNewReceiptAmount] = useState('');
  const [newReceiptDate, setNewReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newReceiptPhoto, setNewReceiptPhoto] = useState<string | null>(null);

  const handleReceiptPhotoSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setNewReceiptPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateMaterialReceipt = (e: React.FormEvent, materialId: string) => {
    e.preventDefault();
    if (!newReceiptAmount || !newReceiptPhoto || !selectedProjectId) return;

    const newReceipt: MaterialReceipt = {
      id: `receipt-${Date.now()}`,
      material_id: materialId,
      project_id: selectedProjectId,
      amount: Number(newReceiptAmount) || 0,
      purchased_at: newReceiptDate,
      photo: newReceiptPhoto,
      notes: null,
      created_by: profile?.id || 'guest',
      created_at: new Date().toISOString(),
    };
    const current = mockDb.getMaterialReceipts();
    current.unshift(newReceipt);
    mockDb.setMaterialReceipts(current);
    setMaterialReceipts(current);

    setNewReceiptAmount('');
    setNewReceiptDate(new Date().toISOString().slice(0, 10));
    setNewReceiptPhoto(null);
    setReceiptMaterialId(null);
  };

  const handleDeleteMaterialReceipt = (id: string) => {
    const current = mockDb.getMaterialReceipts().filter(r => r.id !== id);
    mockDb.setMaterialReceipts(current);
    setMaterialReceipts(current);
  };

  // Área construída da obra (usada no cálculo de custo por m²)
  const handleUpdateProjectArea = async (projId: string, areaM2: number | null) => {
    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('projects').update({ built_area_m2: areaM2 }).eq('id', projId);
      if (error) console.error('Erro ao atualizar área construída:', error);
    } else {
      const currentProjs = mockDb.getProjects();
      const idx = currentProjs.findIndex(p => p.id === projId);
      if (idx !== -1) {
        currentProjs[idx] = { ...currentProjs[idx], built_area_m2: areaM2 };
        mockDb.setProjects(currentProjs);
      }
    }
    loadData();
  };

  // Checklist de EPI e Segurança
  const handleSeedSafetyChecklist = async (projectId: string) => {
    const existing = safetyItems.filter(s => s.project_id === projectId);
    if (existing.length > 0) return;

    const itemsPayload = DEFAULT_SAFETY_ITEMS.map(label => ({
      project_id: projectId,
      label,
      completed: false,
      checked_by: null,
      checked_at: null,
      created_by: profile?.id || 'guest',
    }));

    if (isRealSupabaseConfigured && realSupabase) {
      await realSupabase.from('safety_checklist_items').insert(itemsPayload);
    } else {
      const newItems: SafetyChecklistItem[] = itemsPayload.map(p => ({ id: `safety-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString(), ...p }));
      const current = mockDb.getSafetyItems();
      mockDb.setSafetyItems([...current, ...newItems]);
    }
    loadData();
  };

  const handleToggleSafetyItem = async (item: SafetyChecklistItem) => {
    const nextCompleted = !item.completed;
    const patch = { completed: nextCompleted, checked_by: profile?.id || null, checked_at: nextCompleted ? new Date().toISOString() : null };

    if (isRealSupabaseConfigured && realSupabase) {
      await realSupabase.from('safety_checklist_items').update(patch).eq('id', item.id);
    } else {
      const current = mockDb.getSafetyItems();
      const idx = current.findIndex(s => s.id === item.id);
      if (idx !== -1) { current[idx] = { ...current[idx], ...patch }; mockDb.setSafetyItems(current); }
    }
    loadData();
  };

  // Registro de Ocorrências/Acidentes
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [newIncidentDate, setNewIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newIncidentType, setNewIncidentType] = useState<'acidente' | 'quase_acidente' | 'ocorrencia'>('ocorrencia');
  const [newIncidentSeverity, setNewIncidentSeverity] = useState<'leve' | 'moderada' | 'grave'>('leve');
  const [newIncidentDescription, setNewIncidentDescription] = useState('');
  const [newIncidentInjured, setNewIncidentInjured] = useState('');
  const [newIncidentAction, setNewIncidentAction] = useState('');
  const [newIncidentPhoto, setNewIncidentPhoto] = useState<string | null>(null);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentDescription.trim() || !selectedProjectId) return;

    const basePayload = {
      project_id: selectedProjectId,
      occurred_at: newIncidentDate,
      type: newIncidentType,
      severity: newIncidentSeverity,
      description: newIncidentDescription.trim(),
      injured_person: newIncidentInjured.trim() || null,
      action_taken: newIncidentAction.trim() || null,
      photo: newIncidentPhoto,
      created_by: profile?.id || 'guest',
    };

    if (isRealSupabaseConfigured && realSupabase) {
      const { error } = await realSupabase.from('incidents').insert(basePayload);
      if (error) {
        console.error('Erro ao registrar ocorrência:', error);
        alert('Não foi possível registrar a ocorrência: ' + error.message);
        return;
      }
    } else {
      const newIncident: IncidentReport = { id: `incident-${Date.now()}`, created_at: new Date().toISOString(), ...basePayload };
      const current = mockDb.getIncidents();
      current.unshift(newIncident);
      mockDb.setIncidents(current);
    }

    // Ocorrências graves disparam notificação imediata
    if (newIncidentSeverity === 'grave') {
      const proj = projects.find(p => p.id === selectedProjectId);
      triggerNotification('system', 'Ocorrência Grave Registrada', `Uma ocorrência grave foi registrada na obra ${proj?.name}: ${basePayload.description.slice(0, 80)}`, selectedProjectId, proj?.name || '');
    }

    setNewIncidentDate(new Date().toISOString().slice(0, 10));
    setNewIncidentType('ocorrencia');
    setNewIncidentSeverity('leve');
    setNewIncidentDescription('');
    setNewIncidentInjured('');
    setNewIncidentAction('');
    setNewIncidentPhoto(null);
    setShowCreateIncident(false);
    loadData();
  };

  const handleIncidentPhotoSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setNewIncidentPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };


  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState<(InvoiceMaterialCandidate & { selected: boolean })[]>([]);
  const [showOcrReview, setShowOcrReview] = useState(false);
  const [ocrRawText, setOcrRawText] = useState('');

  const handleScanInvoice = async (file: File) => {
    setOcrProcessing(true);
    try {
      const imageDataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const text = await extractInvoiceText(imageDataUrl);
      setOcrRawText(text);
      const candidates = parseInvoiceMaterials(text);
      setOcrCandidates(candidates.map(c => ({ ...c, selected: true })));
      setShowOcrReview(true);
    } catch (err) {
      console.error('Erro ao ler nota fiscal:', err);
      alert('Não foi possível ler a nota fiscal. Tente uma foto mais nítida e bem iluminada.');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleImportOcrCandidates = async () => {
    if (!selectedProjectId) return;
    const toImport = ocrCandidates.filter(c => c.selected && c.name.trim());

    for (const c of toImport) {
      const basePayload = {
        project_id: selectedProjectId,
        name: c.name.trim(),
        unit: c.unit || 'un',
        needed_quantity: c.quantity,
        acquired_quantity: c.quantity,
        notes: 'Importado automaticamente via OCR de nota fiscal',
        created_by: profile?.id || 'guest',
      };

      if (isRealSupabaseConfigured && realSupabase) {
        await realSupabase.from('materials').insert(basePayload);
      } else {
        const newMaterial: Material = { id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString(), ...basePayload };
        const currentMats = mockDb.getMaterials();
        currentMats.push(newMaterial);
        mockDb.setMaterials(currentMats);
      }
    }

    setShowOcrReview(false);
    setOcrCandidates([]);
    setOcrRawText('');
    loadData();
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

  // Invite Team Member to Project — agora por busca via código PHD-0000 ou telefone,
  // em vez de listar todas as contas cadastradas no app.
  const [inviteMode, setInviteMode] = useState<'existing' | 'new'>('existing');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [foundMember, setFoundMember] = useState<Profile | null>(null);
  const [memberSearchError, setMemberSearchError] = useState('');
  const [searchingMember, setSearchingMember] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeePhone, setNewEmployeePhone] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState<UserRole>('funcionario');

  const handleSearchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberSearchError('');
    setFoundMember(null);
    if (!memberSearchTerm.trim()) return;
    setSearchingMember(true);
    try {
      if (isRealSupabaseConfigured && realSupabase) {
        const { data, error } = await realSupabase.rpc('find_profile_by_code_or_phone', {
          p_search: memberSearchTerm.trim(),
        });
        if (error) {
          console.error('Erro ao buscar colaborador:', error);
          setMemberSearchError('Não foi possível buscar. Tente novamente.');
        } else if (data && data.length > 0) {
          setFoundMember(data[0] as Profile);
        } else {
          setMemberSearchError('Nenhuma conta encontrada com esse código ou telefone.');
        }
      } else {
        const result = mockDb.findProfileByCodeOrPhone(memberSearchTerm);
        if (result) {
          setFoundMember(result);
        } else {
          setMemberSearchError('Nenhuma conta encontrada com esse código ou telefone.');
        }
      }
    } finally {
      setSearchingMember(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundMember || !selectedProjectId) return;
    const inviteUserId = foundMember.id;
    const invitedUser = foundMember;

    const alreadyMember = mockDb.getMembers().some(m => m.project_id === selectedProjectId && m.user_id === inviteUserId);

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

    setMemberSearchTerm('');
    setFoundMember(null);
    setMemberSearchError('');
    setShowInviteMember(false);
    loadData();

    const proj = projects.find(p => p.id === selectedProjectId);
    triggerNotification('system', 'Equipe Atualizada', `${invitedUser?.full_name} foi integrado à equipe da obra ${proj?.name}.`, selectedProjectId, proj?.name || '');
  };

  // Cadastra um funcionário novo diretamente (nome, telefone, cargo) e já adiciona à obra atual
  const handleAddNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !newEmployeePhone.trim() || !selectedProjectId) return;

    if (isRealSupabaseConfigured && realSupabase) {
      alert('No modo com Supabase real, cada profissional precisa criar a própria conta (cadastro com e-mail e senha) antes de poder ser adicionado à equipe, pois o perfil fica vinculado ao login dele. Peça para o profissional se cadastrar e depois use a opção "Já Tem Conta" para adicioná-lo à obra.');
      return;
    }

    const currentProfiles = mockDb.getProfiles();
    const newPhoneDigits = newEmployeePhone.trim().replace(/\D/g, '');
    const phoneTaken = currentProfiles.some(p => p.phone && p.phone.replace(/\D/g, '') === newPhoneDigits);
    if (phoneTaken) {
      alert('Esse telefone já está cadastrado em outra conta. Confira o número e tente novamente.');
      return;
    }
    const newProfile: Profile = {
      id: `func-${Date.now()}`,
      full_name: newEmployeeName.trim(),
      role: newEmployeeRole,
      phone: newEmployeePhone.trim() || null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      member_code: generateMemberCode(currentProfiles),
    };

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

  // Importar Projeto em PDF por obra
  const [importingPdfProjId, setImportingPdfProjId] = useState<string | null>(null);

  const handleImportProjectPdf = async (projId: string, file: File) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Selecione um arquivo em formato PDF.');
      return;
    }

    setImportingPdfProjId(projId);
    try {
      const base64Pdf: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (isRealSupabaseConfigured && realSupabase) {
        const { error } = await realSupabase.from('projects').update({ project_pdf: base64Pdf }).eq('id', projId);
        if (error) console.error('Erro ao importar PDF do projeto:', error);
      } else {
        const currentProjs = mockDb.getProjects();
        const idx = currentProjs.findIndex(p => p.id === projId);
        if (idx !== -1) {
          currentProjs[idx] = { ...currentProjs[idx], project_pdf: base64Pdf };
          mockDb.setProjects(currentProjs);
        }
      }
      loadData();
    } catch (err) {
      console.error('Erro ao importar PDF do projeto:', err);
    } finally {
      setImportingPdfProjId(null);
    }
  };

  // Ao clicar, abre o PDF do projeto (se existir) e, em seguida, abre a obra
  const handleOpenProjectPdf = (proj: Project) => {
    if (proj.project_pdf) {
      window.open(proj.project_pdf, '_blank');
    }
    setSelectedProjectId(proj.id);
    setProjectSubTab('overview');
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
      <div className="min-h-screen bg-secondary safe-area-top flex flex-col items-center justify-center overflow-hidden">
        <div className="relative crane-rig">
          <div className="crane-ground"></div>
          <div className="crane-mast"></div>
          <div className="crane-cabin"></div>

          <div className="crane-jib-group">
            <div className="crane-counter-jib"></div>
            <div className="crane-counterweight"></div>
            <div className="crane-jib"></div>
            <div className="crane-tie1"></div>
            <div className="crane-tie2"></div>

            <div className="crane-trolley-group">
              <div className="crane-trolley"></div>
              <div className="crane-cable"></div>
              <div className="crane-crate"></div>
            </div>
          </div>
        </div>

        <p className="mt-5 text-white font-display font-bold text-lg tracking-wide">PHD Gestões</p>
        <p className="mt-1 text-white/60 text-xs font-medium animate-pulse">Iniciando...</p>

        <style>{`
          .crane-rig { width: 220px; height: 160px; }
          .crane-ground { position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; }
          .crane-mast { position: absolute; bottom: 4px; left: 30px; width: 10px; height: 130px;
            background: repeating-linear-gradient(0deg, #F5A623 0px, #F5A623 8px, #C9860F 8px, #C9860F 10px); border-radius: 1px; }
          .crane-cabin { position: absolute; bottom: 122px; left: 24px; width: 22px; height: 16px;
            background: #1a1f3a; border: 2px solid #F5A623; border-radius: 2px; }
          .crane-jib-group { position: absolute; bottom: 130px; left: 35px; width: 4px; height: 4px;
            transform-origin: 0px 0px; animation: craneRotateJib 6s ease-in-out infinite; }
          .crane-counter-jib { position: absolute; top: -3px; left: -46px; width: 46px; height: 6px; background: #C9860F; border-radius: 2px; }
          .crane-counterweight { position: absolute; top: 2px; left: -42px; width: 20px; height: 14px; background: #3E4750; border-radius: 1px; }
          .crane-jib { position: absolute; top: -3px; left: 0; width: 150px; height: 6px;
            background: repeating-linear-gradient(90deg, #F5A623 0px, #F5A623 8px, #C9860F 8px, #C9860F 10px); border-radius: 2px; }
          .crane-tie1 { position: absolute; width: 92px; height: 1.5px; background: #C9860F; top: 0; left: 0;
            transform-origin: left center; transform: rotate(12deg) translateY(-32px); }
          .crane-tie2 { position: absolute; width: 40px; height: 1.5px; background: #C9860F; top: 0; left: -40px;
            transform-origin: right center; transform: rotate(-12deg) translateY(-32px); }
          .crane-trolley-group { position: absolute; top: -1px; left: 20px; animation: craneTrolleyMove 6s ease-in-out infinite; }
          .crane-trolley { width: 9px; height: 6px; background: #3E4750; border-radius: 1px; margin: 0 auto; }
          .crane-cable { width: 1.5px; background: #9AA4B2; margin: 0 auto; animation: craneCableLength 6s ease-in-out infinite; }
          .crane-crate { width: 18px; height: 14px; margin: 0 auto; border-radius: 2px;
            background: linear-gradient(180deg,#B8703A,#8A4F26); border: 1px solid #6E3D1C; }

          @keyframes craneRotateJib {
            0%, 15%   { transform: rotate(0deg); }
            50%       { transform: rotate(-9deg); }
            85%, 100% { transform: rotate(0deg); }
          }
          @keyframes craneTrolleyMove {
            0%, 10%   { left: 20px; }
            45%, 58%  { left: 108px; }
            92%, 100% { left: 20px; }
          }
          @keyframes craneCableLength {
            0%, 8%    { height: 18px; }
            22%, 40%  { height: 48px; }
            48%, 55%  { height: 48px; }
            68%, 82%  { height: 18px; }
            92%,100%  { height: 18px; }
          }
        `}</style>
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
                      Telefone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                    <p className="text-[11px] text-text-light mt-1">Cada telefone só pode estar em uma conta.</p>
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

            {authMode === 'login' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                    <span className="bg-surface px-3 text-text-light">Esqueci Minha Senha</span>
                  </div>
                </div>

                <button
                  onClick={() => { setShowForgotPassword(true); setResetEmail(email); setResetError(null); setResetSent(false); }}
                  className="w-full p-2.5 text-left rounded-xl bg-surface-alt hover:bg-input-bg border border-border transition"
                >
                  <div className="text-xs font-bold text-primary">Redefinir senha</div>
                  <div className="text-[10px] text-text-light font-medium">Receba um link por e-mail para criar uma nova senha</div>
                </button>
              </>
            )}

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

        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface rounded-2xl border border-border w-full max-w-sm shadow-xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-border">
                <h4 className="font-bold text-lg text-secondary font-display">Esqueci Minha Senha</h4>
                <button
                  onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError(null); }}
                  className="text-text-light hover:text-text-secondary"
                >
                  <X size={20} />
                </button>
              </div>

              {resetSent ? (
                <div className="p-5 space-y-4 text-center">
                  <p className="text-sm text-text-secondary">
                    Se houver uma conta com o e-mail <span className="font-bold text-secondary">{resetEmail}</span>, enviamos um link para redefinir sua senha.
                  </p>
                  <button
                    onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
                    className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">E-mail da Conta *</label>
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </div>

                  {resetError && (
                    <div className="p-3 rounded-xl bg-error-light border border-error/20 text-error text-xs font-medium">
                      {resetError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(false); setResetError(null); }}
                      className="flex-1 py-2.5 border border-border bg-surface hover:bg-input-bg text-text-secondary text-sm font-semibold rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition shadow-md disabled:opacity-60"
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: BLOQUEIO DE SEGURANÇA DO APP (PIN / BIOMETRIA)
  // ==========================================
  if (appLockOn && !appUnlocked) {
    return (
      <AppLockScreen
        userName={profile?.full_name}
        onUnlock={() => setAppUnlocked(true)}
      />
    );
  }

  // ==========================================
  // VIEW: OFERTA DE ATIVAÇÃO DO BLOQUEIO (1ª vez que este usuário abre o app)
  // ==========================================
  if (showAppLockOffer) {
    return (
      <AppLockOfferScreen
        onActivate={handleActivateAppLockFromOffer}
        onDismiss={handleDismissAppLockOffer}
      />
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
            onClick={() => { setActiveTab('inicio'); setSelectedProjectId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'inicio' ? 'bg-primary text-white shadow-md shadow-primary/10' : 'text-text-light hover:bg-sidebar-light hover:text-white'
            }`}
          >
            <Home size={18} />
            <span>Início</span>
          </button>

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
            onClick={() => { setAppUnlocked(false); signOut(); }}
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
          onClick={() => { setActiveTab('inicio'); setSelectedProjectId(null); }}
          className={`flex flex-col items-center gap-1 ${activeTab === 'inicio' ? 'text-primary' : 'text-text-light'}`}
        >
          <Home size={20} />
          <span className="text-[9px] font-bold">Início</span>
        </button>
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
                      onClick={requestAndroidLocationPermission}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-warning/15 border border-warning/20 hover:bg-warning/25 text-warning text-xs font-semibold transition"
                    >
                      <ShieldAlert size={14} />
                      GPS Bloqueado (Mudar para Real)
                    </button>
                  ) : (
                    <button
                      onClick={requestAndroidLocationPermission}
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
            TAB: INÍCIO (HOME)
           ========================================== */}
        {activeTab === 'inicio' && (() => {
          const activeProjects = projects.filter(p => p.status === 'em_andamento' || p.status === 'planejamento');
          const pendingTasks = tasks.filter(t => t.status === 'pendente' || t.status === 'em_andamento');
          const overdueTasks = tasks.filter(t => {
            const d = getDaysRemaining(t.deadline);
            return d !== null && d < 0 && t.status !== 'concluido';
          });
          const lowStockMaterials = materials.filter(m => (m.acquired_quantity / m.needed_quantity) < (stockThreshold / 100));
          const nearestDeadlines = projects
            .filter(p => p.deadline && p.status !== 'concluido')
            .map(p => ({ proj: p, days: getDaysRemaining(p.deadline) }))
            .filter(x => x.days !== null)
            .sort((a, b) => (a.days as number) - (b.days as number))
            .slice(0, 4);

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Cards resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center"><Building2 size={18} /></div>
                  </div>
                  <p className="text-2xl font-bold text-secondary font-display">{activeProjects.length}</p>
                  <p className="text-[11px] font-semibold text-text-light uppercase tracking-wide">Obras Ativas</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center"><ClipboardList size={18} /></div>
                  </div>
                  <p className="text-2xl font-bold text-secondary font-display">{pendingTasks.length}</p>
                  <p className="text-[11px] font-semibold text-text-light uppercase tracking-wide">Serviços Pendentes</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${overdueTasks.length > 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}><ShieldAlert size={18} /></div>
                  </div>
                  <p className="text-2xl font-bold text-secondary font-display">{overdueTasks.length}</p>
                  <p className="text-[11px] font-semibold text-text-light uppercase tracking-wide">Serviços Atrasados</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${lowStockMaterials.length > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}><Package size={18} /></div>
                  </div>
                  <p className="text-2xl font-bold text-secondary font-display">{lowStockMaterials.length}</p>
                  <p className="text-[11px] font-semibold text-text-light uppercase tracking-wide">Suprimentos Críticos</p>
                </div>
              </div>

              {/* Atalhos rápidos */}
              <div className="bg-surface border border-border rounded-2xl p-4">
                <h4 className="font-bold text-xs text-secondary uppercase tracking-wider mb-3">Atalhos Rápidos</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => { setActiveTab('projects'); setShowCreateProject(true); }}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-primary-50 hover:bg-primary/20 text-primary transition"
                  >
                    <Building2 size={20} />
                    <span className="text-[11px] font-bold">Nova Obra</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('materials')}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-warning/10 hover:bg-warning/20 text-warning transition"
                  >
                    <Package size={20} />
                    <span className="text-[11px] font-bold">Suprimentos</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent transition"
                  >
                    <ClipboardList size={20} />
                    <span className="text-[11px] font-bold">Serviços</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('team')}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary transition"
                  >
                    <Users size={20} />
                    <span className="text-[11px] font-bold">Equipe</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Prazos mais próximos */}
                <div className="bg-surface border border-border rounded-2xl p-4">
                  <h4 className="font-bold text-xs text-secondary uppercase tracking-wider mb-3">Prazos Mais Próximos</h4>
                  {nearestDeadlines.length === 0 ? (
                    <p className="text-xs text-text-light text-center py-6">Nenhuma obra com prazo definido.</p>
                  ) : (
                    <div className="space-y-2">
                      {nearestDeadlines.map(({ proj, days }) => (
                        <button
                          key={proj.id}
                          onClick={() => { setActiveTab('projects'); setSelectedProjectId(proj.id); setProjectSubTab('overview'); }}
                          className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-alt transition text-left"
                        >
                          <div>
                            <p className="text-xs font-bold text-secondary">{proj.name}</p>
                            <p className="text-[10px] text-text-light">{proj.client_name || 'Sem cliente'}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${(days as number) < 0 ? 'bg-error/10 text-error' : (days as number) <= 7 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                            {(days as number) < 0 ? `${Math.abs(days as number)}d atrasado` : `${days}d restantes`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suprimentos críticos */}
                <div className="bg-surface border border-border rounded-2xl p-4">
                  <h4 className="font-bold text-xs text-secondary uppercase tracking-wider mb-3">Suprimentos com Estoque Crítico</h4>
                  {lowStockMaterials.length === 0 ? (
                    <p className="text-xs text-text-light text-center py-6">Nenhum suprimento em nível crítico. 🎉</p>
                  ) : (
                    <div className="space-y-2">
                      {lowStockMaterials.slice(0, 5).map((mat) => {
                        const proj = projects.find(p => p.id === mat.project_id);
                        const ratio = Math.round((mat.acquired_quantity / mat.needed_quantity) * 100);
                        return (
                          <button
                            key={mat.id}
                            onClick={() => { setActiveTab('projects'); setSelectedProjectId(mat.project_id); setProjectSubTab('materials'); }}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-alt transition text-left"
                          >
                            <div>
                              <p className="text-xs font-bold text-secondary">{mat.name}</p>
                              <p className="text-[10px] text-text-light">{proj?.name || 'Obra'}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-warning/10 text-warning">{ratio}%</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}


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
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShareProjectReport(proj); }}
                            disabled={sharingReport}
                            title="Compartilhar relatório desta obra"
                            className="flex items-center gap-1.5 text-text-secondary hover:text-primary transition disabled:opacity-50"
                          >
                            {sharingReport && reportProjectId === proj.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Share2 size={14} />
                            )}
                            Relatório
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleShareProjectPdfReport(proj); }}
                            disabled={sharingPdfReport}
                            title="Gerar e compartilhar relatório mensal em PDF"
                            className="flex items-center gap-1.5 text-text-secondary hover:text-primary transition disabled:opacity-50"
                          >
                            {sharingPdfReport && pdfReportProjectId === proj.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <FileText size={14} />
                            )}
                            Relatório Mensal (PDF)
                          </button>

                          {proj.project_pdf ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenProjectPdf(proj); }}
                              title="Abrir PDF do projeto e entrar na obra"
                              className="flex items-center gap-1.5 text-text-secondary hover:text-primary transition"
                            >
                              <FileText size={14} />
                              Abrir PDF
                            </button>
                          ) : (
                            <label
                              onClick={(e) => e.stopPropagation()}
                              title="Importar projeto em PDF para esta obra"
                              className="flex items-center gap-1.5 text-text-secondary hover:text-primary transition cursor-pointer"
                            >
                              {importingPdfProjId === proj.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Upload size={14} />
                              )}
                              Importar Projeto (PDF)
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImportProjectPdf(proj.id, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <span className="flex items-center gap-1">
                          Ver Painel Integrado
                          <ChevronRight size={16} />
                        </span>
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
                        onClick={() => handleShareProjectReport(proj)}
                        disabled={sharingReport}
                        className="px-4 py-2 border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {sharingReport ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                        Compartilhar Relatório
                      </button>

                      <button
                        onClick={() => handleShareProjectPdfReport(proj)}
                        disabled={sharingPdfReport}
                        className="px-4 py-2 border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {sharingPdfReport ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                        Relatório Mensal (PDF)
                      </button>

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
                onClick={() => setProjectSubTab('diary')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  projectSubTab === 'diary' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Diário de Obra ({diaryEntries.filter(d => d.project_id === selectedProjectId).length})
              </button>
              <button
                onClick={() => setProjectSubTab('safety')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  projectSubTab === 'safety' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Segurança ({incidents.filter(i => i.project_id === selectedProjectId).length})
              </button>
              <button
                onClick={() => setProjectSubTab('financeiro')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  projectSubTab === 'financeiro' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text'
                }`}
              >
                Financeiro
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

                  {/* Previsão de Atraso */}
                  {(() => {
                    const proj = projects.find(p => p.id === selectedProjectId);
                    if (!proj) return null;
                    const forecast = getProgressForecast(proj.start_date, proj.deadline, proj.progress);

                    if (forecast.status === 'sem_dados') {
                      return (
                        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                          <h4 className="font-bold text-sm text-secondary uppercase tracking-wider border-b pb-2 mb-3">Previsão de Conclusão</h4>
                          <p className="text-xs text-text-light">Defina data de início, prazo e registre progresso para calcular a previsão.</p>
                        </div>
                      );
                    }

                    const cfg = {
                      no_prazo: { label: 'No Prazo', badgeClass: 'bg-success/10 text-success', icon: CheckCircle },
                      atencao: { label: 'Atenção', badgeClass: 'bg-warning/10 text-warning', icon: ShieldAlert },
                      atrasado: { label: 'Risco de Atraso', badgeClass: 'bg-error/10 text-error', icon: ShieldAlert },
                    }[forecast.status as 'no_prazo' | 'atencao' | 'atrasado'];
                    const Icon = cfg.icon;

                    return (
                      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Previsão de Conclusão</h4>
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${cfg.badgeClass}`}>
                            <Icon size={12} />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          No ritmo atual de progresso ({forecast.dailyRatePercent?.toFixed(2)}%/dia), a obra deve concluir em{' '}
                          <strong>{forecast.projectedDate?.toLocaleDateString('pt-BR')}</strong>
                          {forecast.delayDays !== null && forecast.delayDays > 0 ? (
                            <> — cerca de <strong className="text-error">{forecast.delayDays} dia(s) após o prazo</strong> combinado.</>
                          ) : (
                            <> — dentro do prazo combinado.</>
                          )}
                        </p>
                      </div>
                    );
                  })()}


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

                {/* Cronograma visual (Gantt) */}
                {(() => {
                  const projTasks = tasks.filter(t => t.project_id === selectedProjectId && t.start_date && t.deadline);
                  if (projTasks.length === 0) return null;

                  const starts = projTasks.map(t => new Date(t.start_date as string).getTime());
                  const ends = projTasks.map(t => new Date(t.deadline as string).getTime());
                  const minDate = Math.min(...starts);
                  const maxDate = Math.max(...ends);
                  const totalSpan = Math.max(1, maxDate - minDate);

                  return (
                    <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                      <h4 className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={16} className="text-primary" />
                        Cronograma Visual
                      </h4>
                      <div className="space-y-2.5">
                        {projTasks
                          .sort((a, b) => new Date(a.start_date as string).getTime() - new Date(b.start_date as string).getTime())
                          .map(task => {
                            const start = new Date(task.start_date as string).getTime();
                            const end = new Date(task.deadline as string).getTime();
                            const offsetPct = ((start - minDate) / totalSpan) * 100;
                            const widthPct = Math.max(2, ((end - start) / totalSpan) * 100);
                            return (
                              <div key={task.id} className="flex items-center gap-3">
                                <span className="w-28 sm:w-40 shrink-0 text-xs font-semibold text-text-secondary truncate">{task.title}</span>
                                <div className="flex-1 h-6 bg-input-bg rounded-full relative overflow-hidden">
                                  <div
                                    className="absolute top-0 h-full rounded-full flex items-center px-2"
                                    style={{
                                      left: `${offsetPct}%`,
                                      width: `${widthPct}%`,
                                      backgroundColor: STATUS_COLORS[task.status],
                                    }}
                                  >
                                    <span className="text-[10px] font-bold text-white whitespace-nowrap overflow-hidden">
                                      {task.progress}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      <div className="flex justify-between text-[10px] text-text-light font-semibold pt-1">
                        <span>{formatDate(new Date(minDate).toISOString())}</span>
                        <span>{formatDate(new Date(maxDate).toISOString())}</span>
                      </div>
                    </div>
                  );
                })()}

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
                  <div className="flex items-center gap-2">
                    {(profile?.role === 'engenheiro' || profile?.role === 'mestre_obra' || profile?.role === 'admin') && (
                      <label
                        title="Ler nota fiscal com a câmera e sugerir materiais automaticamente"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition cursor-pointer"
                      >
                        {ocrProcessing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        <span>Ler Nota Fiscal (OCR)</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanInvoice(f); e.target.value = ''; }}
                        />
                      </label>
                    )}
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

                        {/* Cotação de fornecedores */}
                        {(() => {
                          const matQuotes = supplierQuotes
                            .filter(q => q.material_id === mat.id)
                            .sort((a, b) => a.unit_price - b.unit_price);
                          const cheapest = matQuotes[0];
                          const isQuoting = quotingMaterialId === mat.id;

                          return (
                            <div className="pt-2 border-t border-border/60 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-text-secondary uppercase">
                                  Cotações de Fornecedores ({matQuotes.length})
                                </span>
                                <button
                                  onClick={() => setQuotingMaterialId(isQuoting ? null : mat.id)}
                                  className="text-[11px] font-bold text-primary hover:underline"
                                >
                                  {isQuoting ? 'Fechar' : '+ Cotação'}
                                </button>
                              </div>

                              {matQuotes.length > 0 && (
                                <div className="space-y-1.5">
                                  {matQuotes.map(q => {
                                    const isCheapest = cheapest && q.id === cheapest.id;
                                    const totalEstimate = q.unit_price * mat.needed_quantity;
                                    return (
                                      <div
                                        key={q.id}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                                          isCheapest ? 'bg-success/10 border border-success/30' : 'bg-background border border-border'
                                        }`}
                                      >
                                        <div>
                                          <span className={`font-semibold ${isCheapest ? 'text-success' : 'text-text-secondary'}`}>
                                            {isCheapest && '✓ '}{q.supplier_name}
                                          </span>
                                          <span className="text-text-light"> · {q.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{mat.unit}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-text-light">
                                            Total est.: {totalEstimate.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </span>
                                          <button onClick={() => handleDeleteSupplierQuote(q.id)} className="text-text-light hover:text-error">
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {isQuoting && (
                                <form
                                  onSubmit={(e) => handleCreateSupplierQuote(e, mat.id)}
                                  className="flex items-center gap-2 bg-surface-alt border border-border rounded-lg p-2"
                                >
                                  <input
                                    type="text"
                                    placeholder="Fornecedor"
                                    value={newQuoteSupplier}
                                    onChange={e => setNewQuoteSupplier(e.target.value)}
                                    className="flex-1 px-2 py-1.5 rounded border border-border bg-input-bg text-xs"
                                    required
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={`R$/${mat.unit}`}
                                    value={newQuotePrice}
                                    onChange={e => setNewQuotePrice(e.target.value)}
                                    className="w-24 px-2 py-1.5 rounded border border-border bg-input-bg text-xs"
                                    required
                                  />
                                  <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded text-xs font-bold shrink-0">
                                    Salvar
                                  </button>
                                </form>
                              )}
                            </div>
                          );
                        })()}

                        {/* Notas fiscais / comprovantes de compra */}
                        {(() => {
                          const matReceipts = materialReceipts.filter(r => r.material_id === mat.id);
                          const isAttaching = receiptMaterialId === mat.id;

                          return (
                            <div className="pt-2 border-t border-border/60 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-text-secondary uppercase">
                                  Notas Fiscais / Comprovantes ({matReceipts.length})
                                </span>
                                <button
                                  onClick={() => setReceiptMaterialId(isAttaching ? null : mat.id)}
                                  className="text-[11px] font-bold text-primary hover:underline"
                                >
                                  {isAttaching ? 'Fechar' : '+ Anexar'}
                                </button>
                              </div>

                              {matReceipts.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                  {matReceipts.map(r => (
                                    <div key={r.id} className="relative">
                                      <img src={r.photo} alt="Comprovante" className="h-20 w-full object-cover rounded-lg border border-border" />
                                      <span className="block text-[10px] font-bold text-secondary mt-0.5">
                                        {r.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                      <span className="block text-[9px] text-text-light">{formatDate(r.purchased_at)}</span>
                                      <button
                                        onClick={() => handleDeleteMaterialReceipt(r.id)}
                                        className="absolute top-1 right-1 bg-error text-white rounded-full p-0.5"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {isAttaching && (
                                <form
                                  onSubmit={(e) => handleCreateMaterialReceipt(e, mat.id)}
                                  className="bg-surface-alt border border-border rounded-lg p-3 space-y-2"
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptPhotoSelect(f); }}
                                    className="w-full text-xs"
                                    required
                                  />
                                  {newReceiptPhoto && (
                                    <img src={newReceiptPhoto} alt="Prévia" className="h-16 rounded-lg object-cover border border-border" />
                                  )}
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="Valor pago (R$)"
                                      value={newReceiptAmount}
                                      onChange={e => setNewReceiptAmount(e.target.value)}
                                      className="w-full px-2 py-1.5 rounded border border-border bg-input-bg text-xs"
                                      required
                                    />
                                    <input
                                      type="date"
                                      value={newReceiptDate}
                                      onChange={e => setNewReceiptDate(e.target.value)}
                                      className="w-full px-2 py-1.5 rounded border border-border bg-input-bg text-xs"
                                    />
                                  </div>
                                  <button type="submit" className="w-full py-1.5 bg-primary text-white rounded text-xs font-bold">
                                    Salvar Comprovante
                                  </button>
                                </form>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-TAB: DIÁRIO DE OBRA */}
            {projectSubTab === 'diary' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Registros do Diário</h4>
                  <button
                    onClick={() => setShowCreateDiary(true)}
                    className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm shadow-primary/20"
                  >
                    <Plus size={14} />
                    Novo Registro
                  </button>
                </div>

                {showCreateDiary && (
                  <form onSubmit={handleCreateDiaryEntry} className="bg-surface-alt border border-border rounded-xl p-4 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-text-light">Data</label>
                        <input
                          type="date"
                          value={newDiaryDate}
                          onChange={(e) => setNewDiaryDate(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-text-light">Mão de obra presente</label>
                        <input
                          type="number"
                          min={0}
                          value={newDiaryWorkers}
                          onChange={(e) => setNewDiaryWorkers(Number(e.target.value))}
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                          placeholder="Nº de pessoas"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-text-light">Clima do dia</label>
                      <div className="flex gap-2 mt-1">
                        {([
                          { value: 'sol', label: 'Sol', Icon: Sun },
                          { value: 'nublado', label: 'Nublado', Icon: Cloud },
                          { value: 'chuva', label: 'Chuva', Icon: CloudRain },
                          { value: 'tempestade', label: 'Tempestade', Icon: CloudLightning },
                        ] as const).map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setNewDiaryWeather(value)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] font-bold transition ${
                              newDiaryWeather === value ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-secondary hover:border-primary/50'
                            }`}
                          >
                            <Icon size={16} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-text-light">O que foi feito hoje</label>
                      <textarea
                        value={newDiaryDescription}
                        onChange={(e) => setNewDiaryDescription(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none"
                        rows={3}
                        placeholder="Descreva os serviços executados no dia..."
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-text-light">Ocorrências (opcional)</label>
                      <textarea
                        value={newDiaryOccurrences}
                        onChange={(e) => setNewDiaryOccurrences(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none"
                        rows={2}
                        placeholder="Problemas, atrasos, acidentes, visitas..."
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-text-light">Foto do dia (opcional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDiaryPhotoSelect(f); }}
                        className="w-full mt-1 text-xs"
                      />
                      {newDiaryPhoto && (
                        <img src={newDiaryPhoto} alt="Prévia" className="mt-2 h-24 rounded-lg object-cover border border-border" />
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="flex-1 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2.5 rounded-lg transition">
                        Salvar Registro
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateDiary(false)}
                        className="px-4 py-2.5 rounded-lg text-xs font-bold text-text-secondary hover:bg-surface transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {diaryEntries.filter(d => d.project_id === selectedProjectId).length === 0 && !showCreateDiary && (
                    <div className="text-center py-10 text-text-light text-sm">
                      Nenhum registro no diário desta obra ainda.
                    </div>
                  )}

                  {diaryEntries
                    .filter(d => d.project_id === selectedProjectId)
                    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
                    .map((entry) => {
                      const WeatherIcon = entry.weather === 'sol' ? Sun : entry.weather === 'nublado' ? Cloud : entry.weather === 'chuva' ? CloudRain : entry.weather === 'tempestade' ? CloudLightning : Cloud;
                      const author = team.find(t => t.id === entry.created_by);
                      return (
                        <div key={entry.id} className="bg-surface border border-border rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="h-9 w-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
                                <WeatherIcon size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-secondary">
                                  {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-text-light">
                                  {author?.full_name || 'Registrado'} {entry.workers_count ? `· ${entry.workers_count} pessoa(s) na obra` : ''}
                                </p>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-text-secondary mt-3 leading-relaxed whitespace-pre-line">{entry.description}</p>

                          {entry.occurrences && (
                            <div className="mt-2 p-2 rounded-lg bg-warning/10 border border-warning/20">
                              <p className="text-[10px] font-bold text-warning uppercase mb-0.5">Ocorrências</p>
                              <p className="text-[11px] text-text-secondary">{entry.occurrences}</p>
                            </div>
                          )}

                          {entry.photo && (
                            <img src={entry.photo} alt="Registro do dia" className="mt-3 max-h-56 rounded-lg object-cover border border-border" />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* SUB-TAB: SAFETY (SEGURANÇA / EPI / OCORRÊNCIAS) */}
            {projectSubTab === 'safety' && (() => {
              const projSafetyItems = safetyItems.filter(s => s.project_id === selectedProjectId);
              const projIncidents = incidents.filter(i => i.project_id === selectedProjectId);
              const completedCount = projSafetyItems.filter(s => s.completed).length;

              return (
                <div className="space-y-6 animate-fade-in">
                  {/* Checklist de EPI */}
                  <div className="bg-surface border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
                        <HardHat size={16} className="text-primary" />
                        Checklist de EPI e Segurança
                      </h4>
                      {projSafetyItems.length > 0 && (
                        <span className="text-[11px] font-bold text-text-light">{completedCount}/{projSafetyItems.length} conferidos</span>
                      )}
                    </div>

                    {projSafetyItems.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-text-light mb-3">Nenhum checklist criado ainda para esta obra.</p>
                        <button
                          onClick={() => selectedProjectId && handleSeedSafetyChecklist(selectedProjectId)}
                          className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                        >
                          Criar Checklist Padrão
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {projSafetyItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleToggleSafetyItem(item)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition ${
                              item.completed ? 'bg-success/5 border-success/20' : 'bg-surface-alt border-border hover:border-primary/30'
                            }`}
                          >
                            <div className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 border-2 ${item.completed ? 'bg-success border-success' : 'border-border'}`}>
                              {item.completed && <Check size={14} className="text-white" />}
                            </div>
                            <span className={`text-xs font-semibold ${item.completed ? 'text-text-secondary line-through' : 'text-secondary'}`}>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Registro de Ocorrências/Acidentes */}
                  <div className="bg-surface border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert size={16} className="text-error" />
                        Ocorrências e Acidentes
                      </h4>
                      <button
                        onClick={() => setShowCreateIncident(true)}
                        className="flex items-center gap-1.5 bg-error hover:bg-error/90 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                      >
                        <Plus size={14} />
                        Registrar
                      </button>
                    </div>

                    {showCreateIncident && (
                      <form onSubmit={handleCreateIncident} className="bg-surface-alt border border-border rounded-xl p-4 space-y-3 mb-3 animate-fade-in">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-text-light">Data</label>
                            <input type="date" value={newIncidentDate} onChange={(e) => setNewIncidentDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm" required />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-text-light">Tipo</label>
                            <select value={newIncidentType} onChange={(e) => setNewIncidentType(e.target.value as any)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm">
                              <option value="ocorrencia">Ocorrência</option>
                              <option value="quase_acidente">Quase Acidente</option>
                              <option value="acidente">Acidente</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-text-light">Gravidade</label>
                          <div className="flex gap-2 mt-1">
                            {([
                              { value: 'leve', label: 'Leve', cls: 'bg-success/10 text-success border-success/30' },
                              { value: 'moderada', label: 'Moderada', cls: 'bg-warning/10 text-warning border-warning/30' },
                              { value: 'grave', label: 'Grave', cls: 'bg-error/10 text-error border-error/30' },
                            ] as const).map((s) => (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => setNewIncidentSeverity(s.value)}
                                className={`flex-1 py-2 rounded-lg border text-[11px] font-bold transition ${newIncidentSeverity === s.value ? s.cls : 'bg-surface border-border text-text-secondary'}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-text-light">Descrição do ocorrido</label>
                          <textarea value={newIncidentDescription} onChange={(e) => setNewIncidentDescription(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none" rows={3} placeholder="O que aconteceu..." required />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-text-light">Pessoa envolvida (opcional)</label>
                          <input type="text" value={newIncidentInjured} onChange={(e) => setNewIncidentInjured(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm" placeholder="Nome / função" />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-text-light">Medida tomada (opcional)</label>
                          <textarea value={newIncidentAction} onChange={(e) => setNewIncidentAction(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none" rows={2} placeholder="Ex: primeiros socorros, afastamento, correção do risco..." />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-text-light">Foto (opcional)</label>
                          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIncidentPhotoSelect(f); }} className="w-full mt-1 text-xs" />
                          {newIncidentPhoto && <img src={newIncidentPhoto} alt="Prévia" className="mt-2 h-24 rounded-lg object-cover border border-border" />}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button type="submit" className="flex-1 bg-error hover:bg-error/90 text-white text-xs font-bold py-2.5 rounded-lg transition">Salvar Registro</button>
                          <button type="button" onClick={() => setShowCreateIncident(false)} className="px-4 py-2.5 rounded-lg text-xs font-bold text-text-secondary hover:bg-surface transition">Cancelar</button>
                        </div>
                      </form>
                    )}

                    {projIncidents.length === 0 && !showCreateIncident ? (
                      <p className="text-xs text-text-light text-center py-6">Nenhuma ocorrência registrada nesta obra. 🎉</p>
                    ) : (
                      <div className="space-y-2">
                        {projIncidents.map((inc) => {
                          const sevClass = inc.severity === 'grave' ? 'bg-error/10 text-error' : inc.severity === 'moderada' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success';
                          const typeLabel = inc.type === 'acidente' ? 'Acidente' : inc.type === 'quase_acidente' ? 'Quase Acidente' : 'Ocorrência';
                          return (
                            <div key={inc.id} className="p-3 rounded-lg border border-border bg-surface-alt">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-secondary">{typeLabel} · {new Date(inc.occurred_at + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                  {inc.injured_person && <p className="text-[10px] text-text-light">Envolvido: {inc.injured_person}</p>}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${sevClass}`}>{inc.severity}</span>
                              </div>
                              <p className="text-xs text-text-secondary mt-2 leading-relaxed">{inc.description}</p>
                              {inc.action_taken && (
                                <p className="text-[11px] text-text-secondary mt-1"><strong>Medida tomada:</strong> {inc.action_taken}</p>
                              )}
                              {inc.photo && <img src={inc.photo} alt="Registro" className="mt-2 max-h-40 rounded-lg object-cover border border-border" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SUB-TAB: FINANCEIRO (ORÇAMENTO E FLUXO DE CAIXA) */}
            {projectSubTab === 'financeiro' && (() => {
              const projBudget = budgetItems.filter(b => b.project_id === selectedProjectId);
              const projCashFlow = cashFlow
                .filter(c => c.project_id === selectedProjectId)
                .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
              const totalPlanned = projBudget.reduce((sum, b) => sum + b.planned_value, 0);
              const totalActual = projBudget.reduce((sum, b) => sum + b.actual_value, 0);
              const totalEntradas = projCashFlow.filter(c => c.type === 'entrada').reduce((sum, c) => sum + c.amount, 0);
              const totalSaidas = projCashFlow.filter(c => c.type === 'saida').reduce((sum, c) => sum + c.amount, 0);
              const saldo = totalEntradas - totalSaidas;
              const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

              return (
                <div className="space-y-6 animate-fade-in">
                  {/* Resumo geral */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Orçado</span>
                      <span className="text-lg font-bold text-secondary">{fmt(totalPlanned)}</span>
                    </div>
                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Realizado</span>
                      <span className={`text-lg font-bold ${totalActual > totalPlanned ? 'text-error' : 'text-secondary'}`}>{fmt(totalActual)}</span>
                    </div>
                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Entradas (Caixa)</span>
                      <span className="text-lg font-bold text-success">{fmt(totalEntradas)}</span>
                    </div>
                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Saldo em Caixa</span>
                      <span className={`text-lg font-bold ${saldo < 0 ? 'text-error' : 'text-success'}`}>{fmt(saldo)}</span>
                    </div>
                  </div>

                  {/* Custo por m² construído */}
                  {(() => {
                    const currentProj = projects.find(p => p.id === selectedProjectId);
                    const totalGasto = totalActual + payments.filter(p => p.project_id === selectedProjectId && p.status === 'pago').reduce((sum, p) => sum + p.amount, 0);
                    const custoPorM2 = currentProj?.built_area_m2 && currentProj.built_area_m2 > 0
                      ? totalGasto / currentProj.built_area_m2
                      : null;
                    return (
                      <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                        <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Custo por m² Construído</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <label className="text-[10px] text-text-light font-bold uppercase">Área construída (m²)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={currentProj?.built_area_m2 ?? ''}
                              onBlur={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                if (selectedProjectId) handleUpdateProjectArea(selectedProjectId, val);
                              }}
                              placeholder="Ex: 250"
                              className="w-32 px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                            />
                          </div>
                          <div className="flex-1 min-w-[140px] p-3.5 bg-background rounded-xl border border-border">
                            <span className="block text-[10px] text-text-light font-bold uppercase tracking-wider">Custo por m²</span>
                            <span className="text-lg font-bold text-secondary">
                              {custoPorM2 !== null ? custoPorM2.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '— informe a área'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Orçamento previsto x realizado */}
                  <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Orçamento: Previsto x Realizado</h3>
                      <button
                        onClick={() => setShowCreateBudgetItem(!showCreateBudgetItem)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {showCreateBudgetItem ? 'Cancelar' : '+ Categoria'}
                      </button>
                    </div>

                    {showCreateBudgetItem && (
                      <form onSubmit={handleCreateBudgetItem} className="bg-surface-alt border border-border rounded-xl p-4 space-y-3">
                        <input
                          type="text"
                          placeholder="Categoria (ex: Mão de obra, Materiais, Equipamentos)"
                          value={newBudgetCategory}
                          onChange={e => setNewBudgetCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                          required
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-text-light font-bold uppercase">Valor Previsto (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newBudgetPlanned}
                              onChange={e => setNewBudgetPlanned(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-text-light font-bold uppercase">Valor Realizado (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newBudgetActual}
                              onChange={e => setNewBudgetActual(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                            />
                          </div>
                        </div>
                        <button type="submit" className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold">
                          Salvar Categoria
                        </button>
                      </form>
                    )}

                    {projBudget.length === 0 && !showCreateBudgetItem && (
                      <p className="text-sm text-text-light text-center py-4">Nenhuma categoria de orçamento cadastrada ainda.</p>
                    )}

                    <div className="space-y-3">
                      {projBudget.map(item => {
                        const pct = item.planned_value > 0 ? Math.min(100, (item.actual_value / item.planned_value) * 100) : 0;
                        const over = item.actual_value > item.planned_value;
                        return (
                          <div key={item.id} className="p-3.5 bg-background rounded-xl border border-border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-secondary">{item.category}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${over ? 'text-error' : 'text-text-secondary'}`}>
                                  {fmt(item.actual_value)} / {fmt(item.planned_value)}
                                </span>
                                <button onClick={() => handleDeleteBudgetItem(item.id)} className="text-text-light hover:text-error">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-input-bg rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-error' : 'bg-primary'}`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            {over && (
                              <span className="text-[11px] text-error font-semibold mt-1 block">
                                Estourou o orçamento em {fmt(item.actual_value - item.planned_value)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fluxo de caixa */}
                  <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Fluxo de Caixa</h3>
                      <button
                        onClick={() => setShowCreateCashFlow(!showCreateCashFlow)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {showCreateCashFlow ? 'Cancelar' : '+ Lançamento'}
                      </button>
                    </div>

                    {showCreateCashFlow && (
                      <form onSubmit={handleCreateCashFlowEntry} className="bg-surface-alt border border-border rounded-xl p-4 space-y-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setNewCashFlowType('entrada')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold ${newCashFlowType === 'entrada' ? 'bg-success text-white' : 'bg-input-bg text-text-secondary'}`}
                          >
                            Entrada
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewCashFlowType('saida')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold ${newCashFlowType === 'saida' ? 'bg-error text-white' : 'bg-input-bg text-text-secondary'}`}
                          >
                            Saída
                          </button>
                        </div>
                        <input
                          type="date"
                          value={newCashFlowDate}
                          onChange={e => setNewCashFlowDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Descrição (ex: Pagamento fornecedor, Medição recebida)"
                          value={newCashFlowDescription}
                          onChange={e => setNewCashFlowDescription(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                          required
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Valor (R$)"
                            value={newCashFlowAmount}
                            onChange={e => setNewCashFlowAmount(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Categoria (opcional)"
                            value={newCashFlowCategory}
                            onChange={e => setNewCashFlowCategory(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                          />
                        </div>
                        <button type="submit" className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold">
                          Salvar Lançamento
                        </button>
                      </form>
                    )}

                    {projCashFlow.length === 0 && !showCreateCashFlow && (
                      <p className="text-sm text-text-light text-center py-4">Nenhum lançamento de caixa registrado ainda.</p>
                    )}

                    <div className="space-y-2">
                      {projCashFlow.map(entry => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                          <div className="flex items-center gap-3">
                            {entry.type === 'entrada' ? (
                              <TrendingUp size={16} className="text-success shrink-0" />
                            ) : (
                              <TrendingDown size={16} className="text-error shrink-0" />
                            )}
                            <div>
                              <span className="block text-sm font-semibold text-secondary">{entry.description}</span>
                              <span className="block text-[11px] text-text-light">
                                {formatDate(entry.entry_date)}{entry.category ? ` · ${entry.category}` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${entry.type === 'entrada' ? 'text-success' : 'text-error'}`}>
                              {entry.type === 'entrada' ? '+' : '-'} {fmt(entry.amount)}
                            </span>
                            <button onClick={() => handleDeleteCashFlowEntry(entry.id)} className="text-text-light hover:text-error">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pagamentos a Fornecedores e Funcionários */}
                  {(() => {
                    const projPayments = payments
                      .filter(p => p.project_id === selectedProjectId)
                      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
                    const today = new Date().toISOString().slice(0, 10);

                    return (
                      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Pagamentos a Fornecedores e Funcionários</h3>
                          <button
                            onClick={() => setShowCreatePayment(!showCreatePayment)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            {showCreatePayment ? 'Cancelar' : '+ Pagamento'}
                          </button>
                        </div>

                        {showCreatePayment && (
                          <form onSubmit={handleCreatePayment} className="bg-surface-alt border border-border rounded-xl p-4 space-y-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setNewPaymentType('fornecedor')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold ${newPaymentType === 'fornecedor' ? 'bg-primary text-white' : 'bg-input-bg text-text-secondary'}`}
                              >
                                Fornecedor
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewPaymentType('funcionario')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold ${newPaymentType === 'funcionario' ? 'bg-primary text-white' : 'bg-input-bg text-text-secondary'}`}
                              >
                                Funcionário
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder={newPaymentType === 'fornecedor' ? 'Nome do fornecedor' : 'Nome do funcionário'}
                              value={newPaymentName}
                              onChange={e => setNewPaymentName(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                              required
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Valor (R$)"
                                value={newPaymentAmount}
                                onChange={e => setNewPaymentAmount(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                                required
                              />
                              <input
                                type="date"
                                value={newPaymentDueDate}
                                onChange={e => setNewPaymentDueDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-sm"
                              />
                            </div>
                            <button type="submit" className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold">
                              Salvar Pagamento
                            </button>
                          </form>
                        )}

                        {projPayments.length === 0 && !showCreatePayment && (
                          <p className="text-sm text-text-light text-center py-4">Nenhum pagamento cadastrado ainda.</p>
                        )}

                        <div className="space-y-2">
                          {projPayments.map(p => {
                            const isLate = p.status !== 'pago' && p.due_date && p.due_date < today;
                            const statusLabel = p.status === 'pago' ? 'Pago' : isLate ? 'Atrasado' : 'Pendente';
                            const statusColor = p.status === 'pago' ? 'text-success' : isLate ? 'text-error' : 'text-warning';
                            return (
                              <div key={p.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-secondary">{p.payee_name}</span>
                                    <span className="text-[10px] font-bold text-text-light uppercase">{p.payee_type === 'fornecedor' ? 'Fornecedor' : 'Funcionário'}</span>
                                  </div>
                                  <span className={`text-[11px] font-bold ${statusColor}`}>
                                    {statusLabel}{p.due_date ? ` · Venc.: ${formatDate(p.due_date)}` : ''}{p.paid_date ? ` · Pago em: ${formatDate(p.paid_date)}` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-secondary">{fmt(p.amount)}</span>
                                  {p.status !== 'pago' && (
                                    <button
                                      onClick={() => handleMarkPaymentPaid(p.id)}
                                      className="text-[11px] font-bold text-success hover:underline"
                                    >
                                      Marcar pago
                                    </button>
                                  )}
                                  <button onClick={() => handleDeletePayment(p.id)} className="text-text-light hover:text-error">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

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

              {/* Código de membro (PHD-0000) */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-left">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Seu Código de Membro</span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-lg font-bold text-primary font-display tracking-wider">{profile?.member_code || '—'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (profile?.member_code) {
                        navigator.clipboard?.writeText(profile.member_code);
                        alert('Código copiado! Envie para quem for te adicionar em uma obra.');
                      }
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary-dark transition"
                  >
                    Copiar
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary mt-2 leading-relaxed">
                  Compartilhe este código (ou seu telefone) com o responsável da obra para ser adicionado à equipe. Ele não fica visível para outras pessoas por padrão.
                </p>
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
                onClick={() => { setAppUnlocked(false); signOut(); }}
                className="w-full py-3 px-4 rounded-xl bg-error/10 hover:bg-error text-error hover:text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                <span>Encerrar Sessão</span>
              </button>

            </div>

            {/* Segurança e Recursos Nativos */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-secondary">Segurança e Recursos Nativos</h4>
                  <p className="text-[11px] text-text-light">Veja o que o app acessa no seu Android e por quê</p>
                </div>
              </div>

              <div className="space-y-3">
                {NATIVE_RESOURCES.map((res) => {
                  const isNotif = res.key === 'notifications';
                  const granted = isNotif && notifPermStatus === 'granted';
                  const denied = isNotif && notifPermStatus === 'denied';

                  return (
                    <div key={res.key} className="p-3 rounded-xl bg-background border border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-secondary">{res.label}</p>
                          <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{res.description}</p>
                        </div>

                        {res.requiresPermission ? (
                          <span
                            className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                              granted
                                ? 'bg-success/10 text-success'
                                : denied
                                ? 'bg-error/10 text-error'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {granted ? 'Concedida' : denied ? 'Negada' : notifPermStatus === 'web' ? 'Não se aplica' : 'Pendente'}
                          </span>
                        ) : (
                          <span className="shrink-0 px-2 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success whitespace-nowrap">
                            Sem permissão especial
                          </span>
                        )}
                      </div>

                      {isNotif && notifPermStatus !== 'granted' && notifPermStatus !== 'web' && (
                        <button
                          onClick={async () => { await requestNotificationPermission(); await refreshNotifPermStatus(); }}
                          className="mt-2 text-[11px] font-bold text-primary hover:underline"
                        >
                          {denied ? 'Ativar nas configurações do Android' : 'Permitir notificações'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-text-light leading-relaxed">
                O PHD Gestões não solicita permissão de acesso irrestrito ao armazenamento do aparelho. Arquivos (PDFs e fotos) são escolhidos por você através do seletor nativo do Android, e relatórios compartilhados usam apenas a pasta privada de cache do app.
              </p>

              {/* Bloqueio de segurança do app (recursos nativos do Android) */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-secondary">Bloqueio de Segurança do App</p>
                    <p className="text-[11px] text-text-light mt-0.5">
                      {deviceSecurityAvailable
                        ? 'Exige a digital, rosto, PIN ou padrão já configurados no seu Android para abrir o app'
                        : 'Configure uma digital, rosto, PIN ou padrão nas configurações do Android para usar este recurso'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleAppLock(!appLockOn)}
                    disabled={!deviceSecurityAvailable && !appLockOn}
                    className={`shrink-0 w-11 h-6 rounded-full transition relative disabled:opacity-40 ${appLockOn ? 'bg-primary' : 'bg-input-bg'}`}
                    title={appLockOn ? 'Desativar bloqueio' : 'Ativar bloqueio'}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${appLockOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
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
      {showOcrReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <div>
                <h4 className="font-bold text-lg text-secondary font-display">Materiais Detectados</h4>
                <p className="text-[11px] text-text-light">Revise os itens antes de importar — a leitura automática pode errar.</p>
              </div>
              <button onClick={() => setShowOcrReview(false)} className="text-text-light hover:text-text-secondary">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              {ocrCandidates.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-text-secondary">Não foi possível identificar itens automaticamente nesta nota.</p>
                  <details className="text-left">
                    <summary className="text-xs font-bold text-primary cursor-pointer">Ver texto lido pela câmera</summary>
                    <pre className="text-[10px] text-text-light whitespace-pre-wrap mt-2 p-2 bg-surface-alt rounded-lg max-h-40 overflow-y-auto">{ocrRawText || '(nenhum texto reconhecido)'}</pre>
                  </details>
                </div>
              ) : (
                ocrCandidates.map((c, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border ${c.selected ? 'border-primary/30 bg-primary-50/30' : 'border-border bg-surface-alt opacity-60'}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={c.selected}
                        onChange={(e) => setOcrCandidates(prev => prev.map((p, i) => i === idx ? { ...p, selected: e.target.checked } : p))}
                        className="mt-2"
                      />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => setOcrCandidates(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                          className="col-span-3 px-2 py-1.5 text-xs rounded-lg border border-border bg-surface"
                          placeholder="Nome do material"
                        />
                        <input
                          type="number"
                          value={c.quantity}
                          onChange={(e) => setOcrCandidates(prev => prev.map((p, i) => i === idx ? { ...p, quantity: Number(e.target.value) } : p))}
                          className="px-2 py-1.5 text-xs rounded-lg border border-border bg-surface"
                          placeholder="Qtd"
                        />
                        <input
                          type="text"
                          value={c.unit}
                          onChange={(e) => setOcrCandidates(prev => prev.map((p, i) => i === idx ? { ...p, unit: e.target.value } : p))}
                          className="col-span-2 px-2 py-1.5 text-xs rounded-lg border border-border bg-surface"
                          placeholder="Unidade"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 border-t border-border flex gap-2">
              <button
                onClick={handleImportOcrCandidates}
                disabled={ocrCandidates.filter(c => c.selected).length === 0}
                className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-bold py-2.5 rounded-xl transition disabled:opacity-50"
              >
                Importar {ocrCandidates.filter(c => c.selected).length} Selecionado(s)
              </button>
              <button
                onClick={() => setShowOcrReview(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-bold hover:bg-surface-alt transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="p-5 space-y-4">
                <form onSubmit={handleSearchMember} className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Código PHD ou Telefone *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Ex: PHD-0001 ou (11) 99999-9999"
                      value={memberSearchTerm}
                      onChange={(e) => { setMemberSearchTerm(e.target.value); setFoundMember(null); setMemberSearchError(''); }}
                      className="flex-1 px-4 py-2 text-sm rounded-xl border border-border bg-surface-alt text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="submit"
                      disabled={searchingMember}
                      className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white text-xs font-bold rounded-xl transition disabled:opacity-60"
                    >
                      {searchingMember ? '...' : 'Buscar'}
                    </button>
                  </div>
                  <p className="text-[11px] text-text-light">Peça o código PHD (visível no perfil da pessoa) ou o telefone cadastrado por ela.</p>
                </form>

                {memberSearchError && (
                  <p className="text-xs font-semibold text-error">{memberSearchError}</p>
                )}

                {foundMember && (
                  <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
                    <img
                      src={foundMember.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={foundMember.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-secondary truncate">{foundMember.full_name}</p>
                      <p className="text-[11px] text-text-secondary">{ROLE_LABELS[foundMember.role]} · {foundMember.member_code}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleInviteMember} className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowInviteMember(false); setInviteMode('existing'); setMemberSearchTerm(''); setFoundMember(null); setMemberSearchError(''); }}
                    className="flex-1 py-2.5 border border-border bg-surface hover:bg-input-bg text-text-secondary text-sm font-semibold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!foundMember}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl transition shadow-md disabled:opacity-50"
                  >
                    Designar
                  </button>
                </form>
              </div>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Telefone *</label>
                  <input
                    type="text"
                    required
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

      {/* ==========================================
          CARD DE RELATÓRIO (renderizado fora da tela,
          usado apenas para gerar a imagem compartilhada)
         ========================================== */}
      {reportProjectId && (() => {
        const proj = projects.find(p => p.id === reportProjectId);
        if (!proj) return null;

        const projTasks = tasks.filter(t => t.project_id === proj.id);
        const projMaterials = materials.filter(m => m.project_id === proj.id);
        const done = projTasks.filter(t => t.status === 'concluido').length;
        const doing = projTasks.filter(t => t.status === 'em_andamento').length;
        const pending = projTasks.filter(t => t.status === 'pendente').length;
        const lowStockMaterials = projMaterials.filter(m => m.acquired_quantity < m.needed_quantity);
        const daysLeft = getDaysRemaining(proj.deadline);
        const isOverdue = daysLeft !== null && daysLeft < 0;
        const now = new Date();

        return (
          <div
            className="fixed top-0 pointer-events-none"
            style={{
              left: '-9999px',
              width: '800px',
              // Força as cores do tema claro no relatório, independente do
              // modo escuro do celular (o card sempre tem fundo branco,
              // então o texto precisa ficar sempre escuro pra ser legível).
              ['--color-secondary' as any]: '#0a0e27',
              ['--color-text' as any]: '#0a0e27',
              ['--color-text-secondary' as any]: '#475569',
              ['--color-text-light' as any]: '#94a3b8',
              ['--color-border' as any]: '#e2e8f5',
              ['--color-border-dark' as any]: '#cbd5e1',
              ['--color-surface' as any]: '#ffffff',
              ['--color-surface-alt' as any]: '#f8faff',
              ['--color-background' as any]: '#f0f4ff',
              ['--color-input-bg' as any]: '#f1f5ff',
              ['--color-primary-50' as any]: '#eff6ff',
              ['--color-primary-100' as any]: '#dbeafe',
              ['--color-error-light' as any]: '#fef2f2',
            } as React.CSSProperties}
          >
            <div ref={reportCardRef} className="bg-white p-10 w-[800px]" style={{ fontFamily: 'inherit' }}>
              {/* Cabeçalho */}
              <div className="flex items-center justify-between border-b-4 border-primary pb-5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                    <Building2 size={30} className="text-white" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold font-display text-secondary leading-tight">PHD Gestões</h1>
                    <p className="text-xs text-text-secondary font-semibold">Relatório de Obra</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-text-light font-semibold">Gerado em</p>
                  <p className="text-xs font-bold text-secondary">{now.toLocaleDateString('pt-BR')} às {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Identificação da obra */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-bold text-secondary">{proj.name}</h2>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${STATUS_COLORS[proj.status]}20`, color: STATUS_COLORS[proj.status] }}
                  >
                    {STATUS_LABELS[proj.status]}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">Cliente: {proj.client_name || 'Particular'}</p>
                {proj.address && <p className="text-sm text-text-secondary">{proj.address}</p>}
                {profile?.full_name && (
                  <p className="text-sm text-text-secondary">
                    Responsável: <span className="font-semibold text-secondary">{profile.full_name}</span>
                    {profile.role && <span className="text-text-light"> ({ROLE_LABELS[profile.role]})</span>}
                  </p>
                )}
              </div>

              {/* Progresso */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-text-light uppercase tracking-wider">Progresso Geral</span>
                  <span className="text-lg font-bold text-primary">{proj.progress}%</span>
                </div>
                <div className="w-full h-3 bg-background rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${proj.progress}%` }} />
                </div>
              </div>

              {/* Indicadores */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-background rounded-xl border border-border text-center">
                  <p className="text-lg font-bold text-primary">{done}</p>
                  <p className="text-[10px] text-text-light font-bold uppercase">Entregues</p>
                </div>
                <div className="p-3 bg-background rounded-xl border border-border text-center">
                  <p className="text-lg font-bold text-warning">{doing}</p>
                  <p className="text-[10px] text-text-light font-bold uppercase">Executando</p>
                </div>
                <div className="p-3 bg-background rounded-xl border border-border text-center">
                  <p className="text-lg font-bold text-text-secondary">{pending}</p>
                  <p className="text-[10px] text-text-light font-bold uppercase">Planejados</p>
                </div>
                <div className="p-3 bg-background rounded-xl border border-border text-center">
                  <p className={`text-lg font-bold ${isOverdue ? 'text-error' : 'text-secondary'}`}>
                    {daysLeft === null ? '—' : Math.abs(daysLeft)}
                  </p>
                  <p className="text-[10px] text-text-light font-bold uppercase">
                    {isOverdue ? 'Dias de Atraso' : 'Dias Restantes'}
                  </p>
                </div>
              </div>

              {/* Prazo */}
              <div className="flex items-center gap-2 mb-6 text-xs text-text-secondary font-semibold">
                <Calendar size={14} />
                Prazo final: {formatDate(proj.deadline)}
              </div>

              {/* Suprimentos em alerta */}
              {lowStockMaterials.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-xs font-bold text-text-light uppercase tracking-wider mb-2">
                    Suprimentos em Alerta ({lowStockMaterials.length})
                  </h3>
                  <div className="space-y-1.5">
                    {lowStockMaterials.slice(0, 6).map(m => (
                      <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-error-light rounded-lg border border-error/20">
                        <span className="text-xs font-semibold text-secondary">{m.name}</span>
                        <span className="text-xs font-bold text-error">
                          {m.acquired_quantity}/{m.needed_quantity} {m.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rodapé */}
              <div className="mt-8 pt-4 border-t border-border text-center">
                <p className="text-[10px] text-text-light font-semibold">Relatório gerado automaticamente pelo app PHD Gestões</p>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
