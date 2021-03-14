export function getIdProjection(): Record<string, unknown> {
  return {
    id: { $convert: { input: '$_id', to: 'string' } },
    _id: 0,
  };
}
