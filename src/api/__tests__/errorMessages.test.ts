import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorCode, getErrorMessage } from '@/src/api/client';

function httpError(status: number, data: unknown) {
  const headers = new AxiosHeaders();
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', { headers }, {}, {
    status,
    statusText: '',
    headers,
    config: { headers },
    data,
  });
}

describe('getErrorMessage', () => {
  it('never shows an HTML page as the message (the old Google sign-in failure)', () => {
    const page = '<!doctype html><html><head><title>COBILDS</title></head><body><app-root></app-root></body></html>';
    expect(getErrorMessage(httpError(405, page), 'Something went wrong.')).toBe('Something went wrong.');
  });

  it('never shows a wall of text', () => {
    expect(getErrorMessage(httpError(500, 'x'.repeat(500)), 'Fallback')).toBe('Fallback');
  });

  it('shows a short server message', () => {
    expect(getErrorMessage(httpError(404, { code: 'USER_NOT_FOUND', message: 'User not found. Please sign up first.' }))).toBe(
      'User not found. Please sign up first.',
    );
  });
});

describe('getErrorCode', () => {
  it('reads the backend error code', () => {
    expect(getErrorCode(httpError(404, { code: 'USER_NOT_FOUND', message: 'x' }))).toBe('USER_NOT_FOUND');
    expect(getErrorCode(httpError(500, 'oops'))).toBeUndefined();
    expect(getErrorCode(new Error('x'))).toBeUndefined();
  });
});
