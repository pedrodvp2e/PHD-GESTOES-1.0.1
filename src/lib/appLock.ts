import { Capacitor } from '@capacitor/core';

/**
 * Bloqueio de segurança do app (estilo "app de banco"), usando 100% os
 * recursos nativos de segurança do próprio Android — digital, rosto, PIN,
 * padrão ou senha que o usuário já configurou no aparelho. O app não cria,
 * armazena nem valida nenhuma senha própria: ele apenas aciona o prompt
 * nativo do sistema (BiometricPrompt) e confia na resposta do Android.
 */

export type DeviceSecurityResult = {
  success: boolean;
  /** 'not_enrolled': aparelho não tem nenhuma trava de tela configurada */
  reason?: 'not_enrolled' | 'cancelled' | 'unavailable' | 'unknown';
};

const keyFor = (userId: string, suffix: string) => `phd_applock_${suffix}_${userId}`;

export function isAppLockEnabled(userId: string): boolean {
  return localStorage.getItem(keyFor(userId, 'enabled')) === 'true';
}

export function setAppLockEnabled(userId: string, enabled: boolean) {
  localStorage.setItem(keyFor(userId, 'enabled'), enabled ? 'true' : 'false');
}

/** Controla se já mostramos ao usuário a oferta de ativar o bloqueio (uma única vez). */
export function hasAskedAboutAppLock(userId: string): boolean {
  return localStorage.getItem(keyFor(userId, 'asked')) === 'true';
}

export function setAskedAboutAppLock(userId: string) {
  localStorage.setItem(keyFor(userId, 'asked'), 'true');
}

function isNotEnrolledError(err: any): boolean {
  const code = err?.code ? String(err.code) : '';
  const message = (err?.message ? String(err.message) : '').toLowerCase();
  return (
    code === '11' || // BIOMETRIC_ERROR_NONE_ENROLLED
    code === '12' || // BIOMETRIC_ERROR_NO_HARDWARE / sem trava de tela
    message.includes('none_enrolled') ||
    message.includes('not enrolled') ||
    message.includes('no lock screen') ||
    message.includes('nenhuma') ||
    message.includes('add a screen lock') ||
    message.includes('adicione uma')
  );
}

/**
 * Verifica se o aparelho TEM capacidade de segurança nativa (hardware).
 * Não garante que já exista uma digital/PIN/padrão configurados — isso só
 * é confirmado de fato quando o prompt de verificação é aberto.
 */
export async function isDeviceSecurityAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable({ useFallback: true });
    return !!result.isAvailable;
  } catch (err) {
    console.warn('Segurança nativa não disponível neste dispositivo:', err);
    return false;
  }
}

/**
 * Abre o prompt nativo de segurança do Android (digital, rosto e, se
 * necessário, o PIN/padrão/senha que o usuário já usa para desbloquear o
 * aparelho). Retorna um resultado detalhado: sucesso, cancelamento pelo
 * usuário, ou aparelho sem nenhuma trava de tela configurada.
 */
export async function verifyDeviceSecurity(reason: string): Promise<DeviceSecurityResult> {
  if (!Capacitor.isNativePlatform()) return { success: false, reason: 'unavailable' };
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Desbloquear PHD Gestões',
      subtitle: 'Use a segurança do seu Android',
      description: reason,
      useFallback: true, // permite cair no PIN/padrão/senha nativo do aparelho
    });
    return { success: true };
  } catch (err) {
    if (isNotEnrolledError(err)) {
      return { success: false, reason: 'not_enrolled' };
    }
    return { success: false, reason: 'cancelled' };
  }
}
