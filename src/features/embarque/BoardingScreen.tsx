import { useState } from 'react';
import { es } from '@/shared/i18n';
import { BoardingGate } from './BoardingGate';
import { DeparturePicker } from './DeparturePicker';

/** Puerta de embarque: se elige la salida y todo lo demás trabaja sobre ella (cambiarla reinicia el escaneo). */
export function BoardingScreen() {
  const [departureId, setDepartureId] = useState('');
  return (
    <div className="flex flex-col gap-6">
      <DeparturePicker value={departureId} onChange={setDepartureId} />
      {departureId ? <BoardingGate key={departureId} departureId={departureId} /> : <p className="text-muted">{es.boarding.picker.choose}</p>}
    </div>
  );
}
