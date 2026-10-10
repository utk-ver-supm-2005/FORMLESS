import { createContext, useContext } from 'react';

export const ApplicationContext = createContext(null);

export function useApplication() {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplication must be used within an <ApplicationProvider>.');
  }
  return context;
}
