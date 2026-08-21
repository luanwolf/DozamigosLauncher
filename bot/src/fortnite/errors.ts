export type EpicAPIErrorData = {
  errorCode: string;
  errorMessage: string;
  messageVars?: unknown[];
  numericErrorCode?: number;
};

export class EpicAPIError extends Error implements EpicAPIErrorData {
  public errorCode: string;
  public errorMessage: string;
  public numericErrorCode: number;
  public messageVars: string[];

  constructor(error: EpicAPIErrorData) {
    super(error.errorMessage);
    this.name = 'EpicAPIError';
    this.errorCode = error.errorCode;
    this.errorMessage = error.errorMessage;
    this.numericErrorCode = error.numericErrorCode ?? 0;
    this.messageVars = (error.messageVars ?? []).map(String);
  }
}

export function isEpicAPIError(data: unknown): data is EpicAPIErrorData {
  return typeof data === 'object' && data !== null && 'errorCode' in data;
}

export function errorDetail(error: unknown): string {
  if (isEpicAPIError(error) && error.errorMessage) return error.errorMessage;
  if (error instanceof Error) return error.message;
  return String(error);
}
