import React, { useState } from 'react';
import { ShieldCheck, Fingerprint, X, Loader2, AlertTriangle } from 'lucide-react';
import { DeviceSecurityResult } from './lib/appLock';
import appIcon from './assets/images/icon.png';

interface AppLockOfferScreenProps {
  onActivate: () => Promise<DeviceSecurityResult>;
  onDismiss: () => void;
}

export default function AppLockOfferScreen({ onActivate, onDismiss }: AppLockOfferScreenProps) {
  const [activating, setActivating] = useState(false);
  const [notEnrolled, setNotEnrolled] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    setNotEnrolled(false);
    const result = await onActivate();
    setActivating(false);
    if (!result.success && result.reason === 'not_enrolled') {
      setNotEnrolled(true);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-md p-6 text-center space-y-5 relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-text-light hover:text-text-secondary"
          title="Agora não"
        >
          <X size={18} />
        </button>

        <div className="mx-auto h-14 w-14 rounded-2xl overflow-hidden shadow-md shadow-primary/20 border border-primary/20">
          <img src={appIcon} alt="PHD Gestões" className="w-full h-full object-cover" />
        </div>

        <div className="h-12 w-12 rounded-full bg-primary-50 text-primary flex items-center justify-center mx-auto">
          <ShieldCheck size={24} />
        </div>

        <div>
          <h3 className="font-bold text-lg text-secondary font-display">Proteja seu app</h3>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            Ative o bloqueio de segurança e use a digital, rosto, PIN ou padrão já configurados no seu Android para abrir o PHD Gestões.
          </p>
        </div>

        {notEnrolled && (
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-left flex gap-2">
            <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Seu Android ainda não tem nenhuma digital, PIN ou padrão configurados. Vá em <strong>Configurações do Android → Segurança → Bloqueio de tela</strong>, configure uma trava e volte aqui para ativar.
            </p>
          </div>
        )}

        <button
          onClick={handleActivate}
          disabled={activating}
          className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-md shadow-primary/10 transition flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {activating ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
          <span>Ativar Bloqueio de Segurança</span>
        </button>

        <button
          onClick={onDismiss}
          className="w-full py-2.5 px-4 rounded-xl text-text-secondary hover:text-text font-semibold text-xs transition"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
