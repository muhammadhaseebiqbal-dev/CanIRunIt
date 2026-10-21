import React from 'react';
import { HardwareProfile, GameCompatibility } from '../types.js';
interface DashboardProps {
    hardware: HardwareProfile;
    compatibilities: GameCompatibility[];
    onClearScreen?: () => void;
}
export declare const Dashboard: React.FC<DashboardProps>;
export {};
