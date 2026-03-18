export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null, success: true };
}

export function err(message: string): ApiResponse<never> {
  return { data: null, error: message, success: false };
}
