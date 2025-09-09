import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useState } from 'react';


export function useAppState() {
  const [isForeground, setIsForeground] = useState(true);

  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      const isActive = state === 'active';
      setIsForeground(isActive);
      
      console.log({
        message: 'App state changed',
        level: 'info',
        category: 'app_state',
        data: {
          newState: state,
          isForeground: isActive
        }
      });
    };
    
    const sub = AppState.addEventListener('change', handler);
    // initialize once
    handler(AppState.currentState as AppStateStatus);
    return () => sub.remove();
  }, []);

  return isForeground;
}
