import React, { useEffect, useState } from 'react';
import { Fingerprint, ShieldCheck, Loader2 } from 'lucide-react';
import { verifyDeviceSecurity } from './lib/appLock';
import appIcon from './assets/images/icon.png';

interface AppLockScreenProps {
  userName?: string;
  onUnlock: () => void;
}

export default function AppLockScreen({ userName, onUnlock }: AppLockScreenProps) {
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryUnlock = async () => {
    setChecking(true);
    setFailed(false);
    const result = await verifyDeviceSecurity('Confirme sua identidade para acessar o PHD Gestões');
    setChecking(false);
    if (result.success) onUnlock();
    else setFailed(true);
  };

  useEffect(() => {
    tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-sidebar text-white flex flex-col items-center justify-center px-6 safe-area-top safe-area-bottom">
      <div className="mx-auto h-16 w-16 rounded-2xl overflow-hidden shadow-lg shadow-primary/30 border border-primary/30 mb-4">
        <img src={appIcon} alt="PHD Gestões" className="w-full h-full object-cover" />
      </div>

      <div className="flex items-center gap-1.5 text-accent mb-1">
        <ShieldCheck size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest">App Bloqueado</span>
      </div>
      <h2 className="text-lg font-bold font-display mb-1">Olá{userName ? `, ${userName.split(' ')[0]}` : ''}</h2>
      <p className="text-xs text-text-light mb-8 text-center max-w-xs">
        Use a digital, rosto, PIN ou padrão do seu Android para continuar
      </p>

      <button
        onClick={tryUnlock}
        disabled={checking}
        className="w-16 h-16 rounded-full bg-sidebar-light hover:bg-primary/30 transition flex items-center justify-center disabled:opacity-60"
        title="Desbloquear"
      >
        {checking ? <Loader2 size={26} className="animate-spin" /> : <Fingerprint size={28} />}
      </button>

      <p className="text-[11px] text-text-light mt-4">
        {checking ? 'Aguardando confirmação...' : 'Toque para desbloquear'}
      </p>

      {failed && (
        <p className="text-[11px] font-semibold text-error mt-3">Não foi possível confirmar. Tente novamente.</p>
      )}
    </div>
  );
}
