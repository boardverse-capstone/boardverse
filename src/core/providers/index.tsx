// src/core/providers/index.tsx
import type { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
      <Toaster richColors position="top-right" />
    </QueryProvider>
  );
}
