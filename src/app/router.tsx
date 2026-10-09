import { createBrowserRouter } from 'react-router-dom';
import { buildRoutes } from './routeTable';

export const router = createBrowserRouter(buildRoutes(), { future: { v7_relativeSplatPath: true } });
