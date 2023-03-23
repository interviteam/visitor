import { createContext, useContext } from 'react';
import { defaultSession, State } from '@interactivevision/visitor';

export const VisitorContext = createContext<Pick<State, 'session' | 'query' | 'location' | 'shared'>>({
  session: defaultSession,
  query: {},
  location: '',
  shared: {},
});

VisitorContext.displayName = 'VisitorContext';

export function useQuery() {
  return useContext(VisitorContext).query;
}

export function useLocation() {
  return useContext(VisitorContext).location;
}

export function useSession() {
  return useContext(VisitorContext).session;
}

export function useShared() {
  return useContext(VisitorContext).shared;
}
