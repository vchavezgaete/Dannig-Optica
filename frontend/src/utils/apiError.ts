import axios from "axios";

type ApiErrorData = {
  error?: string;
  message?: string;
  issues?: unknown;
  detalles?: unknown;
  citasAsociadas?: number;
};

export function getApiErrorData(error: unknown): ApiErrorData | undefined {
  if (axios.isAxiosError<ApiErrorData>(error)) {
    return error.response?.data;
  }
  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const data = getApiErrorData(error);
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.message === "string") return data.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getApiStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}
