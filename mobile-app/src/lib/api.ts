const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
export const API_URL = (configuredBaseUrl || "http://localhost:3000").replace(
  /\/+$/,
  "",
);

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field: string; message: string }>;
  };
  code?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Array<{ field: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

function headersFor(init: ApiInit): Headers {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = init.token === undefined ? authToken : init.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function readFailure(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }
  return new ApiError(
    response.status,
    payload?.error?.code ?? payload?.code ?? `HTTP_${response.status}`,
    payload?.error?.message ??
      payload?.message ??
      "Permintaan ke server gagal.",
    payload?.error?.details,
  );
}

export async function apiFetch<T>(
  path: string,
  init: ApiInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: headersFor(init),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (response.status === 401) unauthorizedHandler?.();
  if (!response.ok) throw await readFailure(response);

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export async function apiBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: headersFor({}),
  });
  if (response.status === 401) unauthorizedHandler?.();
  if (!response.ok) throw await readFailure(response);
  return response.blob();
}

// Better Auth responses put the session token in a response header rather than
// the JSON body. This helper keeps that header available to the auth provider.
export async function authRequest<T>(
  path: string,
  body: unknown,
): Promise<{ data: T; token: string | null }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) throw await readFailure(response);
  const data = (await response.json()) as T;
  return {
    data,
    token: response.headers.get("set-auth-token"),
  };
}
