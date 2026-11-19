jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('../../i18n', () => ({ __esModule: true, default: { language: 'es', t: (k) => k } }));

const { api, setAuthToken, setUnauthorizedHandler, errorMessage } = require('../apiClient');

describe('errorMessage', () => {
  it('translates an invalid session but keeps the login error from the API', () => {
    const err = (status, message) => ({ response: { status, data: { message } } });
    expect(errorMessage(err(401, 'Unauthenticated.'))).toBe('auth.sessionExpired');
    expect(errorMessage(err(401, 'Credenciales inválidas'))).toBe('Credenciales inválidas');
  });
});

// Responde con el estado indicado sin salir a la red.
function respondWith(status) {
  api.defaults.adapter = async (config) => {
    const response = { status, data: {}, headers: {}, config };
    if (status >= 400) {
      const err = new Error(`HTTP ${status}`);
      err.config = config;
      err.response = response;
      throw err;
    }
    return response;
  };
}

describe('apiClient 401 handling', () => {
  let handler;

  beforeEach(() => {
    handler = jest.fn();
    setUnauthorizedHandler(handler);
  });

  it('closes the session when the API rejects the current token', async () => {
    setAuthToken('tok-1');
    respondWith(401);

    await expect(api.get('/user')).rejects.toThrow();
    await expect(api.get('/rutas')).rejects.toThrow();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a failed login (no token) or other errors', async () => {
    setAuthToken(null);
    respondWith(401);
    await expect(api.post('/login')).rejects.toThrow();

    setAuthToken('tok-2');
    respondWith(422);
    await expect(api.patch('/user')).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores a late 401 for an old token after signing in again', async () => {
    setAuthToken('old');
    let release;
    api.defaults.adapter = (config) => new Promise((_, reject) => {
      release = () => {
        const err = new Error('HTTP 401');
        err.config = config;
        err.response = { status: 401, data: {}, headers: {}, config };
        reject(err);
      };
    });
    const pending = api.get('/user');
    await new Promise((r) => setTimeout(r, 0));

    setAuthToken('new');
    release();
    await expect(pending).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
  });
});
