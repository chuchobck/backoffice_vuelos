import { ResourceScreen } from '@/shared/crud';
import { citiesConfig } from './config';

export function CitiesScreen() {
  return <ResourceScreen config={citiesConfig} />;
}
