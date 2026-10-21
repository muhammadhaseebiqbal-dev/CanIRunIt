import { HardwareProfile } from './types.js';
export declare function detectHardware(): Promise<HardwareProfile>;
export declare function estimateGpuG3d(model: string, isIntegrated: boolean): number;
