import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

let permissionRequested = false;

/**
 * Pede ao usuário a permissão para exibir notificações do sistema.
 * Só faz algo dentro do app instalado no Android/iOS (não roda no navegador).
 * No Android 13+ isso mostra o pop-up nativo de permissão na primeira vez
 * que o app é aberto após a instalação.
 */
export async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform() || permissionRequested) return;
  permissionRequested = true;

  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (err) {
    console.warn('Não foi possível solicitar permissão de notificações:', err);
  }
}

let notifIdCounter = 1;

/**
 * Exibe uma notificação real na barra de notificações do celular, com o
 * ícone do PHD Gestões e a cor da marca. No navegador (preview web) essa
 * função não faz nada — o app usa apenas o sino interno nesse caso.
 */
export async function sendNativeNotification(title: string, body: string) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifIdCounter++,
          title,
          body,
          smallIcon: 'ic_stat_notify',
          iconColor: '#0066ff',
          schedule: { at: new Date(Date.now() + 100) }
        }
      ]
    });
  } catch (err) {
    console.warn('Não foi possível exibir a notificação nativa:', err);
  }
}

/** Gera um id numérico estável (1 a 999999) a partir do id da obra, para agendar sem duplicar. */
function stableNotifId(projectId: string): number {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  return (hash % 900000) + 100000;
}

/**
 * Agenda um lembrete recorrente (todo dia 1º do mês) para gerar o
 * relatório PDF mensal da obra. Idempotente — reagendar com o mesmo id
 * apenas substitui o lembrete anterior, sem duplicar.
 */
export async function scheduleMonthlyReportReminder(projectId: string, projectName: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: stableNotifId(projectId),
          title: 'Relatório mensal da obra',
          body: `Já é um novo mês — gere e envie o relatório PDF de ${projectName}.`,
          smallIcon: 'ic_stat_notify',
          iconColor: '#0066ff',
          schedule: { on: { day: 1, hour: 9, minute: 0 }, allowWhileIdle: true },
        },
      ],
    });
  } catch (err) {
    console.warn('Não foi possível agendar o lembrete de relatório mensal:', err);
  }
}
