import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useState } from 'react';

export function useAppState() {
  const [isForeground, setIsForeground] = useState(true);

  useEffect(() => {
    const handler = (state: AppStateStatus) => setIsForeground(state === 'active');
    const sub = AppState.addEventListener('change', handler);
    // initialize once
    handler(AppState.currentState as AppStateStatus);
    return () => sub.remove();
  }, []);

  return isForeground;
}
