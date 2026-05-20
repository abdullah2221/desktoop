import React from 'react';
import { ErpProvider } from './ErpContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErpProvider>
      {children}
    </ErpProvider>
  );
};
