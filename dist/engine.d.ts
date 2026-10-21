import { GameRecord, HardwareProfile, GameCompatibility } from './types.js';
export declare class CompatibilityEngine {
    private hardware;
    constructor(hardware: HardwareProfile);
    evaluateGame(game: GameRecord, selectedMount?: string): GameCompatibility;
    evaluateBatch(games: GameRecord[], selectedMount?: string): GameCompatibility[];
}
