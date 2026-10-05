import { useEffect, useRef, useCallback } from "react";
import studySessionService from "../services/studySessionService";

export function useStudySession({ setId = null, mode, enabled = true }) {
  const sessionIdRef = useRef(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const cardsStudiedRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;

    const init = async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        const parsedSetId = setId ? Number(setId) : null;
        const session = await studySessionService.startSession({
          setId: parsedSetId && !isNaN(parsedSetId) ? parsedSetId : null,
          mode,
        });
        if (isMounted && session) {
          sessionIdRef.current = session.session_id;
        }
      } catch {
        // Fallback safely
      }
    };

    init();

    return () => {
      isMounted = false;
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

  const recordCardStudied = useCallback((count) => {
    if (typeof count === "number") {
      cardsStudiedRef.current = Math.max(cardsStudiedRef.current, count);
    } else {
      cardsStudiedRef.current += 1;
    }
  }, []);

  const completeSession = useCallback(
    async ({ score = null, cardsStudied } = {}) => {
      if (!sessionIdRef.current || completedRef.current) return sessionIdRef.current;
      completedRef.current = true;
      const finalCards =
        cardsStudied !== undefined ? cardsStudied : cardsStudiedRef.current;
      try {
        const res = await studySessionService.completeSession(sessionIdRef.current, {
          score,
          cards_studied: finalCards,
        });
        return res?.session_id || sessionIdRef.current;
      } catch {
        return sessionIdRef.current;
      }
    },
    []
  );

  return {
    sessionIdRef,
    getSessionId: () => sessionIdRef.current,
    recordCardStudied,
    completeSession,
  };
}

export default useStudySession;
