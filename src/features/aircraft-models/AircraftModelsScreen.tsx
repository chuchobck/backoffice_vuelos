import { ResourceScreen } from '@/shared/crud';
import { aircraftModelsConfig } from './config';

export function AircraftModelsScreen() {
  return <ResourceScreen config={aircraftModelsConfig} />;
}
