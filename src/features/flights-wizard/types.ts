import type { CabinClass } from '@/shared/api';
import type { PriceValues } from '@/shared/lib/farePrices';

/** Precios y datos de una familia tarifaria dentro del asistente. */
export interface FamilyForm extends PriceValues {
  on: boolean;
  extraBag: string;
  changeFee: string;
}

export interface CabinForm {
  on: boolean;
  /** Cupo a vender, como texto del campo. */
  seats: string;
}

export interface FamilyMeta {
  name: string;
  code: string;
  cabinClass: CabinClass;
  changeable: boolean;
  checkedBags: number;
}

export interface SeatMapChoice {
  id: string;
  name: string;
  cabins: { cabinClass: CabinClass; seats: number }[];
}

/** Lo ya creado en la API: permite reintentar solo lo pendiente si algo falla a medias. */
export interface DepartureResult {
  date: string;
  id: string | null;
  /** familia → id de la tarifa creada. */
  fares: Record<string, string>;
}

export interface ExecutionResult {
  flightCreated: boolean;
  departures: DepartureResult[];
  done: boolean;
}

export interface WizardState {
  step: number;
  origin: string;
  destination: string;
  airline: string;
  model: string;
  seatMap: SeatMapChoice | null;
  flightMode: 'new' | 'existing';
  number: string;
  existingFlight: string;
  startDate: string;
  endDate: string;
  /** Domingo = 0 … sábado = 6. */
  days: boolean[];
  depTime: string;
  arrTime: string;
  arrPlus: '0' | '1' | '2';
  depTerminal: string;
  arrTerminal: string;
  currency: string;
  cabins: Partial<Record<CabinClass, CabinForm>>;
  families: Record<string, FamilyForm>;
  familyMeta: Record<string, FamilyMeta>;
  result: ExecutionResult | null;
}

export const MAX_DEPARTURES = 31;

export function initialWizardState(): WizardState {
  return {
    step: 0,
    origin: '',
    destination: '',
    airline: '',
    model: '',
    seatMap: null,
    flightMode: 'new',
    number: '',
    existingFlight: '',
    startDate: '',
    endDate: '',
    days: [true, true, true, true, true, true, true],
    depTime: '',
    arrTime: '',
    arrPlus: '0',
    depTerminal: '',
    arrTerminal: '',
    currency: 'USD',
    cabins: {},
    families: {},
    familyMeta: {},
    result: null,
  };
}
