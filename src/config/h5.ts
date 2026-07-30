/**
 * Where H5 pages live. Development serves them from the Expo web server;
 * Remote Config supplies this in production once the Firebase step lands.
 */
export const H5_BASE_URL = __DEV__
  ? 'http://localhost:8081'
  : 'https://fintech.ctaprojects.xyz'
