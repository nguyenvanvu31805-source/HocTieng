import { useEffect, useRef, useCallback } from 'react';
import studySessionService from '@/services/studySessionService';
import { StudySessionMode } from '@/types/studySession';

interface UseStudySessionProps {
  setId?: number | string | null;
  mode: StudySessionMode;
  enabled?: boolean;
}

export function useStudySession({ setId, mode, enabled = true }: UseStudySessionProps) {
  const sessionIdRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const cardsStudiedRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;

    const initSession = async () => {
      if (startedRef.current) return;
      startedRef.current = true;

      try {
        const parsedSetId = setId ? Number(setId) : null;
        const session = await studySessionService.startSession({
          set_id: parsedSetId && !isNaN(parsedSetId) ? parsedSetId : null,
          mode,
        });

        if (isMounted && session) {
          sessionIdRef.current = session.session_id;
        }
      } catch {
        // Xử lý an toàn khi mất mạng hoặc không có token
      }
    };

    initSession();

    return () => {
      isMounted = false;
      // Khi user thoát màn hình giữa chừng: nếu đã học được ít nhất 1 thẻ,
      // tự động hoàn thành phiên với số thẻ đã học để ghi nhận streak
      if (sessionIdRef.current && !completedRef.current) {
        if (cardsStudiedRef.current > 0) {
          completedRef.current = true;
          studySessionService
            .completeSession(sessionIdRef.current, {
              cards_studied: cardsStudiedRef.current,
            })
            .catch(() => {});
        }
      }
    };
  }, [setId, mode, enabled]);

  const recordCardStudied = useCallback((count?: number) => {
    if (typeof count === 'number') {
      cardsStudiedRef.current = Math.max(cardsStudiedRef.current, count);
    } else {
      cardsStudiedRef.current += 1;
    }
  }, []);

  const completeSession = useCallback(
    async (
      options: { score?: number | null; cardsStudied?: number } = {},
    ): Promise<number | null> => {
      if (!sessionIdRef.current || completedRef.current) return sessionIdRef.current;
      completedRef.current = true;
      const finalCards =
        options.cardsStudied !== undefined
          ? options.cardsStudied
          : cardsStudiedRef.current;

      try {
        const res = await studySessionService.completeSession(sessionIdRef.current, {
          score: options.score !== undefined ? options.score : null,
          cards_studied: finalCards,
        });
        return res?.session_id || sessionIdRef.current;
      } catch {
        return sessionIdRef.current;
      }
    },
    [],
  );

  return {
    sessionIdRef,
    getSessionId: () => sessionIdRef.current,
    recordCardStudied,
    completeSession,
  };
}

export default useStudySession;
