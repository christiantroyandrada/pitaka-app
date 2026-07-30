import { DEV_ORIGIN } from './devHost'

/**
 * Where H5 pages live. In dev they come off the Expo dev server, addressed by
 * the host the device actually reached it on. Remote Config supplies this in
 * production once the Firebase step lands.
 */
export const H5_BASE_URL = __DEV__ ? DEV_ORIGIN : 'https://fintech.ctaprojects.xyz'
