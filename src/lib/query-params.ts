export function pickEnum<T extends string>(value: string | undefined, valid: readonly T[]): T | undefined {
  return value && (valid as readonly string[]).includes(value) ? (value as T) : undefined;
}
