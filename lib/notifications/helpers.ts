import { useMemo, useRef } from 'react';
import { useAppState } from './useAppState';

export function useIsForegroundGetter() {
  const isFg = useAppState();
  const ref = useRef(isFg);
  ref.current = isFg;
  return useMemo(() => () => ref.current, []);
}
