import { ResourceScreen } from '@/shared/crud';
import { flightNumbersConfig } from './config';

export function FlightNumbersScreen() {
  return <ResourceScreen config={flightNumbersConfig} />;
}
