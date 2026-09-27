// Read-only context from the app's existing data: the city median home value (ACS 2020–24) for the Market-led test.
import { meta } from '../data';

const v = meta?.city_medians?.med_home_value;
export const CITY_MEDIAN_HOME_VALUE: number | null = typeof v === 'number' && Number.isFinite(v) ? v : null;
