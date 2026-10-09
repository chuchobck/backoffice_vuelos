import { createBrowserRouter } from 'react-router-dom';
import { buildRoutes } from './routeTable';

export const router = createBrowserRouter(buildRoutes());
