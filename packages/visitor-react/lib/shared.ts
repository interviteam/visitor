import { createContext, useContext } from 'react';

export const SharedContext = createContext<Record<string, any>>({});

SharedContext.displayName = 'VisitorShared';

export function useShared() {
  return useContext(SharedContext);
}
