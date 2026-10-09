import { RouterProvider } from 'react-router-dom';
import { AuthProvider, session } from '@/features/auth';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { router } from './router';

export function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider manager={session}>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
