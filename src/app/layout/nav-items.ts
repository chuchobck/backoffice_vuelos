import {
  Building2, CalendarClock, ClipboardList, FileClock, Globe2, LayoutDashboard, Layers, Map, MapPin, Plane, PlaneTakeoff, Route, Tags, Ticket, UserCog,
  Users, type LucideIcon,
} from 'lucide-react';
import { es } from '@/shared/i18n';
import { paths } from '../routes';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Pantalla sin endpoint en la API: se muestra marcada "Pendiente". */
  pending?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const n = es.nav;

/** Navegación lateral: un solo lugar para el menú, las migas de pan y el estado activo. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: n.general,
    items: [
      { to: paths.dashboard, label: n.dashboard, icon: LayoutDashboard },
      { to: paths.createFlight, label: n.createFlight, icon: PlaneTakeoff },
    ],
  },
  {
    label: n.operation,
    items: [
      { to: paths.departures, label: n.departures, icon: CalendarClock },
      { to: paths.flightNumbers, label: n.flightNumbers, icon: Plane },
      { to: paths.routes, label: n.routes, icon: Route },
      { to: paths.fares, label: n.fares, icon: Tags },
      { to: paths.bookings, label: n.bookings, icon: Ticket, pending: true },
    ],
  },
  {
    label: n.catalog,
    items: [
      { to: paths.airports, label: n.airports, icon: MapPin },
      { to: paths.airlines, label: n.airlines, icon: Building2 },
      { to: paths.aircraftModels, label: n.aircraftModels, icon: ClipboardList },
      { to: paths.fareFamilies, label: n.fareFamilies, icon: Layers },
      { to: paths.seatMaps, label: n.seatMaps, icon: Map },
      { to: paths.cities, label: n.cities, icon: Globe2 },
      { to: paths.countries, label: n.countries, icon: Users },
    ],
  },
  {
    label: n.control,
    items: [
      { to: paths.admins, label: n.admins, icon: UserCog, pending: true },
      { to: paths.audit, label: n.audit, icon: FileClock, pending: true },
    ],
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.to || (item.to !== paths.dashboard && pathname.startsWith(`${item.to}/`));
}

/** Grupo y elemento de una ruta, para las migas de pan. */
export function findNav(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => isNavItemActive(i, pathname));
    if (item) return { group, item };
  }
  return null;
}
