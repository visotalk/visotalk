/** Deterministic PRNG streams: the same key gives the same sequence on every machine, here and in every engine of @motionhub/runtime (its seededRandom). */
import {seededRandom} from '@motionhub/runtime';

export type Random = () => number;

export const randomFor = (key: string): Random => seededRandom(key);
