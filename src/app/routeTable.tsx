import { Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { AircraftModelsPage } from '@/pages/AircraftModelsPage';
import { AirlinesPage } from '@/pages/AirlinesPage';
import { AirportsPage } from '@/pages/AirportsPage';
import { CitiesPage } from '@/pages/CitiesPage';
import { CountriesPage } from '@/pages/CountriesPage';
import { CreateFlightPage } from '@/pages/CreateFlightPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DeparturesPage } from '@/pages/DeparturesPage';
import { FareFamiliesPage } from '@/pages/FareFamiliesPage';
import { FaresPage } from '@/pages/FaresPage';
import { FlightNumbersPage } from '@/pages/FlightNumbersPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminsPage } from '@/pages/AdminsPage';
import { AuditPage } from '@/pages/AuditPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { RoutesPage } from '@/pages/RoutesPage';
import { SeatMapsPage } from '@/pages/SeatMapsPage';
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
                { path: paths.createFlight, element: <CreateFlightPage /> },
                { path: paths.departures, element: <DeparturesPage /> },
                { path: paths.flightNumbers, element: <FlightNumbersPage /> },
                { path: paths.routes, element: <RoutesPage /> },
                { path: paths.fares, element: <FaresPage /> },
                { path: paths.airports, element: <AirportsPage /> },
                { path: paths.airlines, element: <AirlinesPage /> },
                { path: paths.aircraftModels, element: <AircraftModelsPage /> },
                { path: paths.fareFamilies, element: <FareFamiliesPage /> },
                { path: paths.seatMaps, element: <SeatMapsPage /> },
                { path: paths.cities, element: <CitiesPage /> },
                { path: paths.countries, element: <CountriesPage /> },
                { path: paths.bookings, element: <BookingsPage /> },
                { path: paths.audit, element: <AuditPage /> },
                { path: paths.admins, element: <AdminsPage /> },
                { path: '*', element: <NotFoundPage /> },
              ],
            },
          ],
        },
      ],
    },
  ];
}
