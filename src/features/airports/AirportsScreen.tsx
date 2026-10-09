import { ResourceScreen } from '@/shared/crud';
import { airportsConfig } from './config';

export function AirportsScreen() {
  return <ResourceScreen config={airportsConfig} />;
}
