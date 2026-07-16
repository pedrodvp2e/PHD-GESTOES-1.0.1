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
