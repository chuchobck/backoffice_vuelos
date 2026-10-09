import { useSearchParams } from 'react-router-dom';
import { Page } from '@/app/layout/Page';
import { FLIGHT_PARAM } from '@/app/routes';
import { DeparturesScreen } from '@/features/departures';
import { es } from '@/shared/i18n';

export function DeparturesPage() {
  const [params] = useSearchParams();
  const flight = params.get(FLIGHT_PARAM)?.toUpperCase() ?? undefined;
  return (
    <Page title={es.entities.departures.title} lead={es.entities.departures.lead}>
      <DeparturesScreen key={flight ?? 'all'} initialFlight={flight} />
    </Page>
  );
}
