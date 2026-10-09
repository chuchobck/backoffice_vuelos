import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PendingPage } from '@/pages/PendingPage';
import { RootLayout } from './layout/RootLayout';
import { RouteErrorPage } from './layout/RouteErrorPage';
import { RequireAuth } from './RequireAuth';
import { paths } from './routes';

/**
 * Tabla de rutas. Todo lo que está bajo `RequireAuth` exige sesión; /ingresar es público.
 * Cada ruta usa su patrón de `paths`, nunca un texto suelto.
 */
export function buildRoutes(): RouteObject[] {
  return [
    {
      element: <Outlet />,
      errorElement: <RouteErrorPage />,
      children: [
        { path: paths.login, element: <LoginPage /> },
        {
          element: <RequireAuth />,
          children: [
            {
              element: <RootLayout />,
              children: [
                { path: paths.home, element: <Navigate to={paths.dashboard} replace /> },
                { path: paths.dashboard, element: <DashboardPage /> },
                { path: paths.bookings, element: <PendingPage kind="bookings" /> },
                { path: paths.audit, element: <PendingPage kind="audit" /> },
                { path: paths.admins, element: <PendingPage kind="admins" /> },
                { path: '*', element: <NotFoundPage /> },
              ],
            },
          ],
        },
      ],
    },
  ];
}
