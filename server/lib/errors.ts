export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'error') {
    super(message);
  }
}
export const badRequest = (m: string, code = 'bad_request') => new ApiError(400, m, code);
export const unauthorized = (m = 'Sign in required') => new ApiError(401, m, 'unauthorized');
export const forbidden = (m = 'Not allowed') => new ApiError(403, m, 'forbidden');
export const notFound = (m = 'Not found') => new ApiError(404, m, 'not_found');
