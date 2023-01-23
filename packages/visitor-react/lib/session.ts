import { createContext, useContext } from 'react';
import { defaultSession, Session } from '@interactivevision/visitor';

export const SessionContext = createContext<Session>(defaultSession);

SessionContext.displayName = 'VisitorSession';

export function useSession() {
  return useContext(SessionContext);
}
