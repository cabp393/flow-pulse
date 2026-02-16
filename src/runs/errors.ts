export type RunBuildContext = {
  stage?: string;
  palletId?: string;
  palletIndex?: number;
  sku?: string;
  locationId?: string;
};

export type RunBuildError = {
  kind: 'validation' | 'data' | 'routing' | 'unexpected';
  message: string;
  details?: string[];
  context?: RunBuildContext;
  stack?: string;
};

export const createRunBuildError = (
  kind: RunBuildError['kind'],
  message: string,
  details?: string[],
  context?: RunBuildContext,
  stack?: string,
): RunBuildError => ({ kind, message, details, context, stack });

export const isRunBuildError = (error: unknown): error is RunBuildError => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as Partial<RunBuildError>;
  return typeof candidate.kind === 'string' && typeof candidate.message === 'string';
};

export const normalizeRunBuildError = (
  error: unknown,
  fallbackMessage = 'Ocurrió un error inesperado al generar la run.',
  context?: RunBuildContext,
): RunBuildError => {
  if (isRunBuildError(error)) return error;

  if (error instanceof Error) {
    const stack = import.meta.env.DEV ? error.stack : undefined;
    return createRunBuildError('unexpected', error.message || fallbackMessage, [error.name], {
      ...context,
    }, stack);
  }

  return createRunBuildError('unexpected', fallbackMessage, undefined, context);
};

export const runBuildErrorToClipboard = (error: RunBuildError): string => {
  const sections = [
    `kind: ${error.kind}`,
    `message: ${error.message}`,
    error.details?.length ? `details:\n- ${error.details.join('\n- ')}` : undefined,
    error.context ? `context:\n${JSON.stringify(error.context, null, 2)}` : undefined,
    error.stack ? `stack:\n${error.stack}` : undefined,
  ].filter(Boolean);

  return sections.join('\n\n');
};
