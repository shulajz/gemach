import { createContext, useState, useEffect, useRef, useMemo } from 'react';
import { subscribeToAuthState } from '../firebase/auth.js';

export const AuthContext = createContext(null);

/** Wait before accepting logout (avoids flicker on transient null during token refresh). */
const AUTH_LOGOUT_SETTLEMENT_MS = 1200;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pendingUserRef = useRef(null);
  const commitTimeoutRef = useRef(null);
  const lastCommittedUidRef = useRef(undefined);

  useEffect(() => {
    const commitAuthState = () => {
      const next = pendingUserRef.current;
      const nextUid = next?.uid ?? null;
      if (nextUid !== lastCommittedUidRef.current) {
        lastCommittedUidRef.current = nextUid;
        setUser(next);
      }
      setLoading(false);
      commitTimeoutRef.current = null;
    };

    const unsubscribe = subscribeToAuthState((u) => {
      pendingUserRef.current = u;
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
        commitTimeoutRef.current = null;
      }

      const isLogoutWhileSignedIn = u === null && lastCommittedUidRef.current != null;
      if (isLogoutWhileSignedIn) {
        commitTimeoutRef.current = setTimeout(commitAuthState, AUTH_LOGOUT_SETTLEMENT_MS);
        return;
      }

      commitAuthState();
    });

    return () => {
      unsubscribe();
      if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
