export function env(name: string, fallback: string, strict: boolean): string {
  const value = process.env[name]
  if (value !== undefined && value !== '') return value
  if (strict) throw new Error(`${name} is required when PONDER_STRICT_ENV=true`)
  return fallback
}
