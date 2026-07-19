import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type NativePermissionStatus = 'granted' | 'denied' | 'prompt' | 'web';

/**
 * Consulta o status atual da permissão de notificações do sistema.
 * Retorna 'web' quando o app está rodando no navegador (fora do APK),
 * onde essa permissão nativa não se aplica.
 */
export async function getNotificationPermissionStatus(): Promise<NativePermissionStatus> {
  if (!Capacitor.isNativePlatform()) return 'web';

  try {
    const result = await LocalNotifications.checkPermissions();
    if (result.display === 'granted') return 'granted';
    if (result.display === 'denied') return 'denied';
    return 'prompt';
  } catch (err) {
    console.warn('Não foi possível verificar a permissão de notificações:', err);
    return 'prompt';
  }
}

/**
 * Lista os recursos nativos do Android que o app efetivamente utiliza,
 * com uma explicação curta do que cada um faz e se exige permissão
 * explícita do sistema ou não.
 */
export const NATIVE_RESOURCES = [
  {
    key: 'notifications',
    label: 'Notificações do Sistema',
    description: 'Avisa sobre novas tarefas, mensagens e atualizações de obras direto na barra de notificações do celular.',
    requiresPermission: true,
  },
  {
    key: 'files',
    label: 'Seletor de Arquivos',
    description: 'Usado para importar o projeto em PDF de cada obra e enviar foto de perfil. O app abre o seletor nativo do Android — nenhum acesso irrestrito ao armazenamento é solicitado.',
    requiresPermission: false,
  },
  {
    key: 'cache',
    label: 'Armazenamento em Cache do App',
    description: 'Usado apenas para gerar e compartilhar relatórios (imagem) das obras. Fica restrito à pasta privada do app, sem exigir permissão do sistema.',
    requiresPermission: false,
  },
  {
    key: 'share',
    label: 'Compartilhamento Nativo',
    description: 'Abre o menu nativo do Android (WhatsApp, E-mail, Drive etc.) para compartilhar relatórios das obras.',
    requiresPermission: false,
  },
] as const;
