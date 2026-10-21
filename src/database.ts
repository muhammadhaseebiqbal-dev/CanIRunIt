import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRecord } from './types.js';

/**
 * Resolves the path to the games database file.
 * Prioritizes `data/games_database.min.json` packaged with the npm module,
 * resolving relative to the package installation directory (`fileURLToPath(import.meta.url)`)
 * rather than process.cwd(), ensuring global or npx execution works seamlessly.
 */
export function resolveDatabasePath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidateRoots = [
    path.resolve(currentDir, '..'),    // dist/ or src/ -> package root
    path.resolve(currentDir, '../..'), // Deeper nesting fallback
    currentDir,                        // Root-level bundled fallback
  ];

  for (const root of candidateRoots) {
    const minPath = path.join(root, 'data', 'games_database.min.json');
    if (fs.existsSync(minPath)) {
      return minPath;
    }
    const fullPath = path.join(root, 'data', 'games_database.json');
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Fallback to default expected path relative to package root
  return path.join(path.resolve(currentDir, '..'), 'data', 'games_database.min.json');
}

// Common gamer shorthand, acronyms, and franchise aliases
export const GAME_ALIASES: Record<string, string> = {
  'gta': 'grand theft auto',
  'gta 6': 'grand theft auto vi',
  'gta vi': 'grand theft auto vi',
  'gta 5': 'grand theft auto v',
  'gta v': 'grand theft auto v',
  'gta 4': 'grand theft auto iv',
  'gta iv': 'grand theft auto iv',
  'gta sa': 'grand theft auto san andreas',
  'rdr': 'red dead redemption',
  'rdr2': 'red dead redemption 2',
  'rdr 2': 'red dead redemption 2',
  'cp2077': 'cyberpunk 2077',
  'cp 2077': 'cyberpunk 2077',
  'cyberpunk': 'cyberpunk 2077',
  'cs': 'counter-strike',
  'cs2': 'counter-strike 2',
  'cs 2': 'counter-strike 2',
  'csgo': 'counter-strike: global offensive',
  'cs:go': 'counter-strike: global offensive',
  'cod': 'call of duty',
  'cod mw': 'call of duty modern warfare',
  'cod mw2': 'call of duty modern warfare ii',
  'cod mw3': 'call of duty modern warfare iii',
  'warzone': 'call of duty warzone',
  'bg3': "baldur's gate 3",
  'bg 3': "baldur's gate 3",
  'gow': 'god of war',
  'gow ragnarok': 'god of war ragnarok',
  're4': 'resident evil 4',
  're 4': 'resident evil 4',
  're2': 'resident evil 2',
  're 2': 'resident evil 2',
  're3': 'resident evil 3',
  're7': 'resident evil 7',
  're8': 'resident evil village',
  'tlou': 'the last of us',
  'tlou1': 'the last of us part i',
  'tlou2': 'the last of us part ii',
  'elden': 'elden ring',
  'tarkov': 'escape from tarkov',
  'civ 6': 'civilization vi',
  'civ 7': 'civilization vii',
  'civ': 'civilization',
  'pubg': 'pubg: battlegrounds',
  'tf2': 'team fortress 2',
  'mhw': 'monster hunter: world',
  'ff7': 'final fantasy vii',
  'ff14': 'final fantasy xiv',
  'ffxiv': 'final fantasy xiv',
  'ff16': 'final fantasy xvi',
  'witcher 3': 'the witcher 3',
  'witcher': 'the witcher',
};

// Normalize string for fuzzy and token comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\bvi\b/g, '6')
    .replace(/\bv\b/g, '5')
    .replace(/\biv\b/g, '4')
    .replace(/\biii\b/g, '3')
    .replace(/\bii\b/g, '2')
    .replace(/\bi\b/g, '1')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTokens(text: string): string[] {
  return normalizeText(text).split(' ').filter(t => t.length > 0);
}

export class GameDatabase {
  private static instance: GameDatabase;
  private games: GameRecord[] = [];
  private isLoaded = false;

  private constructor() {}

  public static getInstance(): GameDatabase {
    if (!GameDatabase.instance) {
      GameDatabase.instance = new GameDatabase();
    }
    return GameDatabase.instance;
  }

  public async load(): Promise<GameRecord[]> {
    if (this.isLoaded) return this.games;

    const targetPath = resolveDatabasePath();
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Games database not found at ${targetPath}. Please verify the installation or run: npm run fetch-data`);
    }

    const raw = fs.readFileSync(targetPath, 'utf-8');
    this.games = JSON.parse(raw);
    this.isLoaded = true;
    return this.games;
  }

  public getAll(): GameRecord[] {
    return this.games;
  }

  public search(query: string): GameRecord[] {
    const rawQ = query.toLowerCase().trim();
    if (!rawQ) return this.games;

    const aliasTarget = GAME_ALIASES[rawQ];
    const qTokens = extractTokens(rawQ);
    const aliasTokens = aliasTarget ? extractTokens(aliasTarget) : [];

    return this.games.filter(g => {
      const nameLower = g.name.toLowerCase();
      const idLower = g.id.toLowerCase();

      // Direct substring match
      if (nameLower.includes(rawQ) || idLower.includes(rawQ)) return true;

      // Alias substring match
      if (aliasTarget && (nameLower.includes(aliasTarget) || idLower.includes(aliasTarget))) return true;

      // Tag match
      if (g.tags.some(t => t.toLowerCase().includes(rawQ) || (aliasTarget && t.toLowerCase().includes(aliasTarget)))) {
        return true;
      }

      // Token matching: all query tokens present in title or tags
      const normTitle = normalizeText(g.name);
      if (qTokens.length > 0 && qTokens.every(tok => normTitle.includes(tok))) return true;
      if (aliasTokens.length > 0 && aliasTokens.every(tok => normTitle.includes(tok))) return true;

      return false;
    });
  }

  public getComingSoon(): GameRecord[] {
    return this.games.filter(g => g.status === 'Coming Soon');
  }

  public getById(id: string): GameRecord | undefined {
    return this.games.find(g => g.id === id || g.steam_appid?.toString() === id);
  }

  public findBestMatch(query: string): GameRecord | undefined {
    const rawQ = query.toLowerCase().trim();
    if (!rawQ) return undefined;

    const aliasTarget = GAME_ALIASES[rawQ];
    const normQ = normalizeText(rawQ);
    const normAlias = aliasTarget ? normalizeText(aliasTarget) : '';
    const qTokens = extractTokens(rawQ);
    const aliasTokens = aliasTarget ? extractTokens(aliasTarget) : [];

    let bestGame: GameRecord | undefined = undefined;
    let highestScore = -1;

    for (const g of this.games) {
      let score = 0;
      const nameLower = g.name.toLowerCase();
      const idLower = g.id.toLowerCase();
      const normTitle = normalizeText(g.name);

      // 1. Exact name or ID match
      if (nameLower === rawQ || idLower === rawQ) {
        score = 1000;
      } else if (aliasTarget && (nameLower === aliasTarget || idLower === aliasTarget)) {
        score = 950;
      } else if (normTitle === normQ || (normAlias && normTitle === normAlias)) {
        score = 920;
      }
      // 2. Starts with match
      else if (nameLower.startsWith(rawQ) || (aliasTarget && nameLower.startsWith(aliasTarget))) {
        score = 800 - Math.min(100, Math.abs(nameLower.length - rawQ.length));
      }
      // 3. Substring match
      else if (nameLower.includes(rawQ) || (aliasTarget && nameLower.includes(aliasTarget))) {
        score = 700 - Math.min(100, Math.abs(nameLower.length - rawQ.length));
      }
      // 4. Token match (all query tokens in game title)
      else if (qTokens.length > 0 && qTokens.every(tok => normTitle.includes(tok))) {
        const matchedRatio = qTokens.length / (extractTokens(g.name).length || 1);
        score = 500 + Math.round(matchedRatio * 100);
      }
      // 5. Alias token match
      else if (aliasTokens.length > 0 && aliasTokens.every(tok => normTitle.includes(tok))) {
        const matchedRatio = aliasTokens.length / (extractTokens(g.name).length || 1);
        score = 480 + Math.round(matchedRatio * 100);
      }
      // 6. Tag match
      else if (g.tags.some(t => t.toLowerCase() === rawQ || (aliasTarget && t.toLowerCase() === aliasTarget))) {
        score = 400;
      }

      if (score > highestScore) {
        highestScore = score;
        bestGame = g;
      }
    }

    return highestScore >= 400 ? bestGame : undefined;
  }
}
