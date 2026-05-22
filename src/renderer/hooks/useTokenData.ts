import { useState, useEffect } from 'react';

export interface ServiceData {
  service: string;
  balance: number;
  tokensUsed: number;
  currentRate: number;
  recentRates: number[];
  estimatedMinutesLeft: number;
  tokensConsumed: number;
  error: string | null;
  lastUpdated: number;
}

export interface AlertData {
  level: 'normal' | 'reminder' | 'warning' | 'critical';
  message: string;
}

interface TokenPayload {
  data: ServiceData;
  alert: AlertData;
}

const defaultService = (service: string): ServiceData => ({
  service,
  balance: 0,
  tokensUsed: 0,
  currentRate: 0,
  recentRates: [],
  estimatedMinutesLeft: Infinity,
  tokensConsumed: 0,
  error: null,
  lastUpdated: 0,
});

export function useTokenData() {
  const [deepseek, setDeepseek] = useState<ServiceData>(() => defaultService('deepseek'));
  const [mimo, setMiMo] = useState<ServiceData>(() => defaultService('mimo'));
  const [deepseekAlert, setDeepseekAlert] = useState<AlertData>({ level: 'normal', message: '' });
  const [mimoAlert, setMiMoAlert] = useState<AlertData>({ level: 'normal', message: '' });

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubscribe = window.electronAPI.onTokenData((payload: unknown) => {
      const { data, alert } = payload as TokenPayload;
      if (data.service === 'deepseek') {
        setDeepseek(data);
        setDeepseekAlert(alert);
      } else if (data.service === 'mimo') {
        setMiMo(data);
        setMiMoAlert(alert);
      }
    });
    return unsubscribe;
  }, []);

  const refresh = () => window.electronAPI?.manualRefresh();

  const updateBalance = (service: string, newBalance: number) =>
    window.electronAPI?.updateBalance(service, newBalance);

  return { deepseek, mimo, deepseekAlert, mimoAlert, refresh, updateBalance };
}
