import { createContext, useContext } from 'react';

export const LocationContext = createContext('');

LocationContext.displayName = 'VisitorLocation';

export function useLocation() {
  return useContext(LocationContext);
}
