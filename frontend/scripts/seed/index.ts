import * as raw from './mockup';
import type { SeedObject, SeedAlert, SeedContact, SeedCam } from './types';

export const TODAY = raw.TODAY as string;
export const OBJECTS = raw.OBJECTS as unknown as Record<string, SeedObject>;
export const OBJ_ORDER = raw.OBJ_ORDER as unknown as string[];
export const ALERTS = raw.ALERTS as unknown as SeedAlert[];
export const CONTACTS = raw.CONTACTS as unknown as Record<string, SeedContact>;
export const CAMS = raw.CAMS as unknown as Record<string, SeedCam>;
