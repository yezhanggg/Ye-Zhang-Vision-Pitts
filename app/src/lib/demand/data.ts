// The demand file, loaded only by on-demand modules (it stays out of the offline single file).
import file from '../../data/lazy/demand.json';
import type { DemandFile, DemandUnit } from './types';

export const DEMAND = file as unknown as DemandFile;

export const demandTract = (geoid: string): DemandUnit | null => DEMAND.tracts[geoid] ?? null;
export const demandZip = (zip: string | null | undefined): DemandUnit | null => (zip ? DEMAND.zips[zip] ?? null : null);
export const demandCity = (): DemandUnit => DEMAND.city;
