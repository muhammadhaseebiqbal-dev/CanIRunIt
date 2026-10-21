import { GameRecord } from './types.js';
/**
 * Resolves the path to the games database file.
 * Prioritizes `data/games_database.min.json` packaged with the npm module,
 * resolving relative to the package installation directory (`fileURLToPath(import.meta.url)`)
 * rather than process.cwd(), ensuring global or npx execution works seamlessly.
 */
export declare function resolveDatabasePath(): string;
export declare const GAME_ALIASES: Record<string, string>;
export declare class GameDatabase {
    private static instance;
    private games;
    private isLoaded;
    private constructor();
    static getInstance(): GameDatabase;
    load(): Promise<GameRecord[]>;
    getAll(): GameRecord[];
    search(query: string): GameRecord[];
    getComingSoon(): GameRecord[];
    getById(id: string): GameRecord | undefined;
    findBestMatch(query: string): GameRecord | undefined;
}
