import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Ativa o modo de tela infinita (edge-to-edge): o conteúdo do app ocupa
 * a tela inteira do celular, passando por trás da barra de status,
 * sem a faixa branca/colorida que normalmente aparece no topo.
 * Só faz algo dentro do app instalado no Android/iOS (não roda no navegador).
 */
export async function enableFullscreenMode() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Deixa o conteúdo do app se estender por trás da barra de status
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Fundo transparente, mostrando o conteúdo do app através da barra
    await StatusBar.setBackgroundColor({ color: '#00000000' });
    // Ícones da barra de status escuros (compatível com o tema claro/escuro do app)
    await syncStatusBarStyle();

    // Mantém a cor dos ícones sincronizada se o usuário trocar o tema do
    // sistema (claro/escuro) com o app já aberto
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      syncStatusBarStyle();
    });
  } catch (err) {
    console.warn('Não foi possível ativar o modo de tela infinita:', err);
  }
}

/**
 * Ajusta a cor dos ícones da barra de status (hora, bateria, sinal) de
 * acordo com o tema atual do dispositivo, para manter contraste e
 * legibilidade tanto no modo claro quanto no modo escuro.
 */
export async function syncStatusBarStyle() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    // Style.Dark = ícones escuros (fundo claro) | Style.Light = ícones claros (fundo escuro)
    await StatusBar.setStyle({ style: prefersDark ? Style.Light : Style.Dark });
  } catch (err) {
    console.warn('Não foi possível ajustar o estilo da barra de status:', err);
  }
}
