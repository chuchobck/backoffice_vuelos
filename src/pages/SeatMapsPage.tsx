import { Page } from '@/app/layout/Page';
import { SeatMapsScreen } from '@/features/seat-maps';
import { es } from '@/shared/i18n';

export function SeatMapsPage() {
  return (
    <Page title={es.entities.seatMaps.title} lead={es.entities.seatMaps.lead}>
      <SeatMapsScreen />
    </Page>
  );
}
