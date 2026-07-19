import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import html2canvas from 'html2canvas';

/**
 * Renderiza um elemento HTML como imagem PNG e abre o menu nativo de
 * compartilhamento do Android (mesmo diálogo que aparece ao compartilhar
 * uma foto para o WhatsApp, Google, etc).
 *
 * Em ambiente web (fora do app instalado), tenta usar a Web Share API
 * do navegador e, se não estiver disponível, baixa a imagem.
 */
export async function shareElementAsImage(
  element: HTMLElement,
  fileName: string,
  shareTitle: string,
  shareText?: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const dataUrl = canvas.toDataURL('image/png');

  // App instalado (Android via Capacitor): salva no cache e abre o
  // diálogo nativo de compartilhamento do sistema.
  if (Capacitor.isNativePlatform()) {
    const base64Data = dataUrl.split(',')[1];

    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: shareTitle,
      text: shareText,
      files: [writeResult.uri],
      dialogTitle: 'Compartilhar relatório',
    });
    return;
  }

  // Fallback para navegador (preview web / testes fora do apk)
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], fileName, { type: 'image/png' });

  const nav = navigator as Navigator & {
    canShare?: (data?: { files?: File[] }) => boolean;
    share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
  };

  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    await nav.share({ title: shareTitle, text: shareText, files: [file] });
    return;
  }

  // Último recurso: baixa a imagem para o dispositivo
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
