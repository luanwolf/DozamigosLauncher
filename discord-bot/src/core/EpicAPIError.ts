export type EpicAPIErrorData = {
  errorCode: string;
  errorMessage: string;
  messageVars: unknown[];
  numericErrorCode: number;
  continuation?: string;
  continuationUrl?: string;
  correctiveAction?: string;
};

export class EpicAPIError extends Error implements EpicAPIErrorData {
  public errorCode: string;
  public errorMessage: string;
  public numericErrorCode: number;
  public messageVars: string[];

  public continuation?: string;
  public continuationUrl?: string;
  public correctiveAction?: string;

  constructor(error: EpicAPIErrorData) {
    super(error.errorMessage);
    this.name = 'EpicAPIError';
    this.errorCode = error.errorCode;
    this.errorMessage = error.errorMessage;
    this.numericErrorCode = error.numericErrorCode;
    this.messageVars = (error.messageVars || []) as string[];
    this.continuation = error.continuation;
    this.continuationUrl = error.continuationUrl;
    this.correctiveAction = error.correctiveAction;
  }
}

export function isEpicAPIError(data: unknown): data is EpicAPIErrorData {
  return (data as EpicAPIErrorData)?.errorCode !== undefined;
}

export function formatEpicError(error: unknown): string {
  if (error instanceof EpicAPIError) return error.errorMessage;
  if (error instanceof Error) return error.message;
  return String(error);
}
