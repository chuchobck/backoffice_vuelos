import { ResourceScreen } from '@/shared/crud';
import { countriesConfig } from './config';

export function CountriesScreen() {
  return <ResourceScreen config={countriesConfig} />;
}
