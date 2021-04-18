export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable ${name}`);
  }

  return value;
}

export function getOptionalEnvVar(name: string): string | undefined {
  const value = process.env[name];
  return value;
}

export function getOptionalEnvNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const num = Number(value);
  return isNaN(num) ? undefined : num;
}
