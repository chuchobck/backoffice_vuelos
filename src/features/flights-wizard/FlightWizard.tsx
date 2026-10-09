import { useState } from 'react';
import { flightNumberOf } from './plan';
import { StepAirline } from './StepAirline';
import { StepCabins } from './StepCabins';
import { StepReview } from './StepReview';
import { StepRoute } from './StepRoute';
import { StepSchedule } from './StepSchedule';
import { initialWizardState, type ExecutionResult, type WizardState } from './types';
import { WizardProgress } from './WizardProgress';
import { WizardSuccess } from './WizardSuccess';

const LAST_STEP = 4;

/**
 * Asistente "Crear vuelo" de 5 pasos. El estado vive aquí: cada paso guarda lo suyo al avanzar o al
 * volver (sin perder lo escrito). El paso 5 crea todo con las llamadas reales de /admin.
 */
export function FlightWizard() {
  const [state, setState] = useState<WizardState>(initialWizardState);

  const go = (patch: Partial<WizardState>, delta: 1 | -1) =>
    setState((s) => ({ ...s, ...patch, step: Math.min(LAST_STEP, Math.max(0, s.step + delta)) }));
  const props = { state, onNext: (patch: Partial<WizardState>) => go(patch, 1), onBack: (patch: Partial<WizardState>) => go(patch, -1) };

  if (state.result?.done) {
    return <WizardSuccess flightNumber={flightNumberOf(state)} result={state.result} onAnother={() => setState(initialWizardState())} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <WizardProgress current={state.step} />
      {state.step === 0 ? <StepRoute {...props} /> : null}
      {state.step === 1 ? <StepAirline {...props} /> : null}
      {state.step === 2 ? <StepSchedule {...props} /> : null}
      {state.step === 3 ? <StepCabins {...props} /> : null}
      {state.step === 4 ? <StepReview {...props} onDone={(result: ExecutionResult) => setState((s) => ({ ...s, result }))} /> : null}
    </div>
  );
}
