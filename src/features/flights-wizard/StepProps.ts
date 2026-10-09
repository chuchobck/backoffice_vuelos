import type { WizardState } from './types';

/** Lo que recibe cada paso: el estado acumulado y cómo avanzar o volver guardándolo. */
export interface StepProps {
  state: WizardState;
  /** Guarda los valores del paso y pasa al siguiente. */
  onNext: (patch: Partial<WizardState>) => void;
  /** Guarda lo escrito (sin validar) y vuelve al paso anterior. */
  onBack: (patch: Partial<WizardState>) => void;
}
