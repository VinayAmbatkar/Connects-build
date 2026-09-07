import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/src/api/client';
import { useAuthStore } from '@/src/store/authStore';

type UseSSEOptions = {
  path: string;
  enabled?: boolean;
  onMessage?: (data: string) => void;
};

/**
 * Lightweight SSE helper. Auth token is passed as ?token= because
 * EventSource cannot set Authorization headers.
 */
export function useSSE({ path, enabled = true, onMessage }: UseSSEOptions) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !accessToken || typeof EventSource === 'undefined') {
      return;
    }

    let source: EventSource | null = null;
    let closed = false;
    let retryMs = 2000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const url = `${API_BASE_URL}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(accessToken)}`;
      source = new EventSource(url);

      source.onopen = () => {
        setConnected(true);
        setError(null);
        retryMs = 2000;
      };

      source.onmessage = (event) => {
        onMessageRef.current?.(event.data);
      };

      source.onerror = () => {
        setConnected(false);
        setError('Stream disconnected');
        source?.close();
        timer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 30000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      source?.close();
    };
  }, [accessToken, enabled, path]);

  return { connected, error };
}
