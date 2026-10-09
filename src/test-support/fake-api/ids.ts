/** UUID deterministas para pruebas: los resultados son reproducibles. */
let counter = 0;

export function resetIds(): void {
  counter = 0;
}

export function nextUuid(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, '0')}`;
}
