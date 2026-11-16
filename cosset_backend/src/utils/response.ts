export const STATUS = {
  OK: 200,
  CREATED: 201,
  ERROR: 500,
  CONFLICT: 409,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
};

function serializeResponseData(data: string | Record<string, unknown>) {
  if (typeof data === 'string') {
    // Always return valid JSON so clients can read `.message` consistently.
    try {
      JSON.parse(data);
      return data;
    } catch {
      return JSON.stringify({ message: data });
    }
  }

  return JSON.stringify(data, (_key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

export function response(data: string | Record<string, unknown>, status: number): Response {
  const value = serializeResponseData(data);

  return new Response(value, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function handleError(message: string, error: Error): Response {
  console.error(`[${message}]: `, error);
  return response({ message: 'Internal server error' }, STATUS.ERROR);
}
