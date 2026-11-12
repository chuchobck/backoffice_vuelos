/** Un dato grande del resultado del escaneo (asiento, grupo, posición…). Va dentro de un `<dl>`. */
export function ResultFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm font-bold">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
