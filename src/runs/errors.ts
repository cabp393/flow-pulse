export type RunBuildError = {
  kind: 'validation' | 'data' | 'routing' | 'unexpected';
  message: string;
  details?: string[];
  context?: Record<string, unknown>;
};

export const createRunBuildError = (
  kind: RunBuildError['kind'],
  message: string,
  details?: string[],
  context?: Record<string, unknown>,
): RunBuildError => ({ kind, message, details, context });

export const isRunBuildError = (error: unknown): error is RunBuildError => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as Partial<RunBuildError>;
  return typeof candidate.kind === 'string' && typeof candidate.message === 'string';
};

export const normalizeRunBuildError = (
  error: unknown,
  fallbackMessage = 'Ocurrió un error inesperado al generar la run.',
  context?: Record<string, unknown>,
): RunBuildError => {
  if (isRunBuildError(error)) return error;

  if (error instanceof Error) {
    return createRunBuildError('unexpected', error.message || fallbackMessage, [error.name], {
      ...context,
      stack: error.stack,
    });
  }

  return createRunBuildError('unexpected', fallbackMessage, undefined, context);
};

export const runBuildErrorToClipboard = (error: RunBuildError): string => {
  const sections = [
    `kind: ${error.kind}`,
    `message: ${error.message}`,
    error.details?.length ? `details:\n- ${error.details.join('\n- ')}` : undefined,
    error.context ? `context:\n${JSON.stringify(error.context, null, 2)}` : undefined,
  ].filter(Boolean);

  return sections.join('\n\n');
};
