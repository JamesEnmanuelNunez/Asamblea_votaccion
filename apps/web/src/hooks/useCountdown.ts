import { useCallback, useEffect, useState } from 'react';

function secondsUntil(endsAt: string | null | undefined): number {
  if (!endsAt) return 0;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.round(diff / 1000));
}

/**
 * Cuenta regresiva basada en un timestamp absoluto (`ends_at`).
 * Al calcular contra `Date.now()` en cada tick, todos los dispositivos ven
 * el mismo tiempo restante aunque sus relojes estén ligeramente desfasados.
 */
export function useCountdown(endsAt: string | null | undefined, active: boolean): number {
  const compute = useCallback(() => secondsUntil(endsAt), [endsAt]);
  const [remaining, setRemaining] = useState<number>(compute);

  useEffect(() => {
    setRemaining(compute());
    if (!active || !endsAt) return;
    const id = setInterval(() => setRemaining(compute()), 250);
    return () => clearInterval(id);
  }, [active, endsAt, compute]);

  return remaining;
}
