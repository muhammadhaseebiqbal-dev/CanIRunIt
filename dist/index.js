#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import chalk from 'chalk';
import { detectHardware } from './hardware.js';
import { GameDatabase } from './database.js';
import { CompatibilityEngine } from './engine.js';
import { printHardwareBanner, renderGamesTable, renderGameCard, printSummaryCard } from './ui.js';
import { Dashboard } from './components/Dashboard.js';
const program = new Command();
// Output formatted error for humans or AI agents
function outputError(err, isJson, command = 'error') {
    try {
        process.stdout.write('\x1b[?1049l\x1b[?25h');
    }
    catch (_) { }
    if (isJson) {
        const errorJson = {
            schema_version: '1.1.0',
            status: 'error',
            command,
            timestamp: new Date().toISOString(),
            error: {
                code: err.code || 'EXECUTION_ERROR',
                message: err.message || String(err),
                hint: err.hint || undefined,
            },
        };
        console.log(JSON.stringify(errorJson, null, 2));
    }
    else {
        console.error(chalk.red.bold('\n✖ Error: ') + (err.message || String(err)));
        if (err.hint) {
            console.error(chalk.yellow('💡 Hint: ') + err.hint);
        }
    }
    process.exit(1);
}
// Filter and sort games list
function applyFiltersAndSort(compatibilities, searchQuery, tier, minFps, igpuOnly, sortBy = 'fps', sortOrder = 'desc') {
    let list = compatibilities;
    if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const db = GameDatabase.getInstance();
        const matchedRecordIds = new Set(db.search(q).map(g => g.id));
        list = list.filter(c => matchedRecordIds.has(c.game.id) ||
            c.game.name.toLowerCase().includes(q) ||
            c.game.tags.some(t => t.toLowerCase().includes(q)));
    }
    if (tier) {
        const t = tier.toLowerCase().trim();
        if (t === 'high' || t === 'high performance') {
            list = list.filter(c => c.tier === 'High Performance');
        }
        else if (t === 'medium' || t === 'med' || t === 'medium settings') {
            list = list.filter(c => c.tier === 'Medium Settings');
        }
        else if (t === 'low' || t === 'low settings') {
            list = list.filter(c => c.tier === 'Low Settings');
        }
        else if (t === 'bottleneck' || t === 'bottlenecked') {
            list = list.filter(c => c.tier === 'Bottlenecked');
        }
        else if (t === 'coming-soon' || t === 'upcoming' || t === 'soon') {
            list = list.filter(c => c.game.status === 'Coming Soon');
        }
    }
    if (minFps && !isNaN(minFps)) {
        list = list.filter(c => c.estimatedFps >= minFps);
    }
    if (igpuOnly) {
        list = list.filter(c => c.communityPlayable || c.tier !== 'Bottlenecked');
    }
    list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'name') {
            cmp = a.game.name.localeCompare(b.game.name);
        }
        else if (sortBy === 'year') {
            cmp = (a.game.release_year - b.game.release_year) || a.game.name.localeCompare(b.game.name);
        }
        else if (sortBy === 'storage') {
            cmp = (a.game.storage_gb - b.game.storage_gb) || a.game.name.localeCompare(b.game.name);
        }
        else {
            cmp = (a.estimatedFps - b.estimatedFps) || (b.game.release_year - a.game.release_year) || a.game.name.localeCompare(b.game.name);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
}
// Consistent JSON Output Generator for AI Agents & Automation
function formatAndPrintJson(command, hardware, allGames, filtered, options, queryMeta) {
    const summary = {
        total_games_scanned: allGames.length,
        matched_games: filtered.length,
        returned_games: 0,
        high_performance: filtered.filter(c => c.tier === 'High Performance').length,
        medium_settings: filtered.filter(c => c.tier === 'Medium Settings').length,
        low_settings: filtered.filter(c => c.tier === 'Low Settings').length,
        bottlenecked: filtered.filter(c => c.tier === 'Bottlenecked').length,
        coming_soon: filtered.filter(c => c.game.status === 'Coming Soon').length,
        igpu_friendly_count: filtered.filter(c => c.communityPlayable).length,
        storage_warnings_count: filtered.filter(c => !!c.storageWarning).length,
    };
    // If agent requested summary-only, omit massive array to preserve tokens
    if (options.summaryOnly || options.stats) {
        const output = {
            schema_version: '1.1.0',
            status: 'success',
            command,
            timestamp: new Date().toISOString(),
            query: queryMeta,
            hardware,
            summary,
        };
        console.log(JSON.stringify(output, null, 2));
        process.exit(0);
    }
    // Token-conscious pagination: default to 50 unless --all or explicit --limit
    const parsedLimit = parseInt(options.limit, 10);
    const limit = options.all
        ? filtered.length
        : (!isNaN(parsedLimit) ? parsedLimit : (queryMeta.search || queryMeta.game ? 25 : 50));
    const offset = parseInt(options.offset, 10) || 0;
    const sliced = filtered.slice(offset, offset + limit);
    summary.returned_games = sliced.length;
    const targetMount = options.drive
        ? hardware.storage.mounts.find(m => m.mount.toUpperCase().startsWith(options.drive.toUpperCase())) || hardware.storage.primaryMount
        : hardware.storage.primaryMount;
    const output = {
        schema_version: '1.1.0',
        status: 'success',
        command,
        timestamp: new Date().toISOString(),
        query: queryMeta,
        hardware,
        summary,
        pagination: {
            limit,
            offset,
            total: filtered.length,
            has_more: offset + limit < filtered.length,
        },
        results: sliced.map(c => ({
            id: c.game.id,
            name: c.game.name,
            release_year: c.game.release_year,
            status: c.game.status,
            tier: c.tier,
            estimated_fps: c.estimatedFps,
            playable: c.tier !== 'Bottlenecked',
            community_playable: c.communityPlayable,
            community_badge: c.communityBadge || null,
            community_notes: c.communityNote || c.game.community_notes,
            storage: {
                required_gb: c.game.storage_gb,
                free_gb: targetMount.freeGb,
                drive: targetMount.mount,
                sufficient: !c.storageWarning,
                warning: c.storageWarning || null,
                requires_ssd: c.game.requires_ssd,
                drive_is_ssd: targetMount.isSsd,
                ssd_warning: c.ssdWarning || null,
            },
            spec_check: c.specCheck,
            bottlenecks: c.bottlenecks,
            min_requirements: {
                cpu: c.game.min_cpu,
                gpu: c.game.min_gpu,
                ram_gb: c.game.min_ram_gb,
                vram_gb: c.game.min_vram_gb,
                gpu_g3d: c.game.min_gpu_g3d,
            },
            rec_requirements: {
                cpu: c.game.rec_cpu,
                gpu: c.game.rec_gpu,
                ram_gb: c.game.rec_ram_gb,
                vram_gb: c.game.rec_vram_gb,
                gpu_g3d: c.game.rec_gpu_g3d,
            },
            technologies: {
                fsr: c.game.supports_fsr,
                xess: c.game.supports_xess,
                dlss: c.game.supports_dlss,
                directx: c.game.directx,
            },
            store_links: {
                steam: c.game.steam_url,
                epic: c.game.epic_url,
            },
        })),
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
}
// Main CLI setup
program
    .name('canirunit')
    .description('PC Game Scout: Windows Hardware Scanner & 5,000+ Game Compatibility Engine with Real-World Community & iGPU Feasibility')
    .version('1.1.0')
    .argument('[game]', 'Game title to quickly search and evaluate (supports abbreviations like GTA VI, RDR2, CP2077, CS2)')
    .option('-j, --json', 'Output machine-readable JSON for AI agents, automations, and scripts')
    .option('-s, --search <query>', 'Search for specific games by title, acronym, or tag')
    .option('-t, --tier <tier>', 'Filter by tier: high, medium, low, bottleneck, or coming-soon')
    .option('-l, --limit <number>', 'Number of games to display in results (default 25, or 50 in --json mode)', '25')
    .option('--offset <number>', 'Number of games to skip in results for pagination', '0')
    .option('--all', 'Return all matching games without pagination/limit truncation')
    .option('-d, --drive <letter>', 'Drive letter to evaluate free storage against (e.g., C, D)')
    .option('-i, --interactive', 'Launch interactive Ink terminal dashboard')
    .option('--table', 'Force formatted table view instead of interactive dashboard')
    .option('--card', 'Force detailed spec scorecard view')
    .option('--summary-only', 'Output only hardware diagnostic summary and tier statistics')
    .option('--stats', 'Alias for --summary-only')
    .option('--sort <field>', 'Sort games by: fps, name, year, or storage', 'fps')
    .option('--order <direction>', 'Sort order: desc or asc', 'desc')
    .option('--min-fps <number>', 'Filter games achieving at least N estimated FPS')
    .option('--igpu-only', 'Filter only games verified playable on integrated graphics')
    .action(async (gameArg, options) => {
    const isJson = !!options.json;
    try {
        // 1. Scan Hardware
        const hardware = await detectHardware();
        // 2. Load Curated 5,000+ Games Database
        const db = GameDatabase.getInstance();
        const allGames = await db.load();
        // 3. Run Compatibility Engine
        const engine = new CompatibilityEngine(hardware);
        const allCompatibilities = engine.evaluateBatch(allGames, options.drive);
        // Search query can come from positional argument or -s option
        const searchQuery = gameArg || options.search;
        // 4. Apply Filters and Sorting
        const minFps = options.minFps ? parseFloat(options.minFps) : undefined;
        const filtered = applyFiltersAndSort(allCompatibilities, searchQuery, options.tier, minFps, options.igpuOnly, options.sort, options.order);
        // 5. JSON Output Mode
        if (isJson) {
            formatAndPrintJson('evaluate', hardware, allGames, filtered, options, {
                game_arg: gameArg || null,
                search: searchQuery || null,
                tier: options.tier || null,
                drive: options.drive || null,
                sort: options.sort || 'fps',
                order: options.order || 'desc',
            });
            return;
        }
        // 6. Summary-only human view
        if (options.summaryOnly || options.stats) {
            printHardwareBanner(hardware);
            const summary = {
                total_games_scanned: allGames.length,
                matched_games: filtered.length,
                high_performance: filtered.filter(c => c.tier === 'High Performance').length,
                medium_settings: filtered.filter(c => c.tier === 'Medium Settings').length,
                low_settings: filtered.filter(c => c.tier === 'Low Settings').length,
                bottlenecked: filtered.filter(c => c.tier === 'Bottlenecked').length,
                coming_soon: filtered.filter(c => c.game.status === 'Coming Soon').length,
            };
            printSummaryCard(summary, hardware);
            return;
        }
        // 7. Interactive Ink Mode vs Non-interactive Views
        const hasSpecificQuery = Boolean(searchQuery || options.tier || options.table || options.card || options.summaryOnly || options.all);
        const isInteractive = options.interactive || (process.stdout.isTTY && !hasSpecificQuery);
        if (isInteractive) {
            // Enter alternate screen buffer & clear screen & hide cursor
            process.stdout.write('\x1b[?1049h\x1b[H\x1b[2J');
            let cleanedUp = false;
            const cleanup = () => {
                if (!cleanedUp) {
                    cleanedUp = true;
                    try {
                        process.stdout.write('\x1b[?1049l\x1b[?25h');
                    }
                    catch (_) { }
                }
            };
            process.on('exit', cleanup);
            process.on('SIGINT', () => { cleanup(); process.exit(0); });
            process.on('SIGTERM', () => { cleanup(); process.exit(0); });
            process.on('uncaughtException', (err) => {
                cleanup();
                console.error(err);
                process.exit(1);
            });
            let appInstance;
            const triggerClear = () => {
                try {
                    if (appInstance && typeof appInstance.clear === 'function') {
                        appInstance.clear();
                    }
                }
                catch (_) { }
                try {
                    console.clear();
                    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
                }
                catch (_) { }
            };
            // Explicitly clear screen on interactive startup to purge previous terminal output
            triggerClear();
            try {
                appInstance = render(React.createElement(Dashboard, {
                    hardware,
                    compatibilities: allCompatibilities,
                    onClearScreen: triggerClear,
                }));
                await appInstance.waitUntilExit();
            }
            finally {
                cleanup();
            }
            return;
        }
        // Non-interactive Mode (Human Readability)
        printHardwareBanner(hardware);
        if (filtered.length === 0) {
            console.log(chalk.yellow.bold(`\n⚠️  No games found matching: "${searchQuery}"`));
            console.log(chalk.gray(`Tip: Try searching by acronyms (e.g. 'gta', 'rdr2', 'cp2077') or list by tier with: canirunit -t high\n`));
            return;
        }
        // If single game queried or --card requested with <= 3 matches, render detailed Spec Scorecards!
        if (options.card || (searchQuery && filtered.length <= 2 && !options.table)) {
            const displayCards = filtered.slice(0, 3);
            for (const item of displayCards) {
                renderGameCard(item, hardware);
            }
            if (filtered.length > displayCards.length) {
                console.log(chalk.gray(`Showing ${displayCards.length} of ${filtered.length} matches. Use --table to view as compact table.`));
            }
        }
        else {
            const limit = options.all ? filtered.length : (parseInt(options.limit, 10) || 25);
            const displayList = filtered.slice(0, limit);
            renderGamesTable(displayList);
            console.log(`\nShowing ${chalk.bold.cyan(displayList.length)} of ${chalk.bold.white(filtered.length)} matching games (Total database: ${allGames.length} games).`);
            console.log(chalk.gray(`Tips: Use --json for AI agents, canirunit check "<name>" for full scorecard, or -i for interactive TUI.`));
        }
    }
    catch (err) {
        outputError(err, isJson, 'evaluate');
    }
});
// Dedicated Subcommand: canirunit scan
program
    .command('scan')
    .description('Deeply scan and inspect local Windows hardware, iGPU memory bandwidth, and storage mounts')
    .option('-j, --json', 'Output hardware profile as machine-readable JSON')
    .action(async (options) => {
    const isJson = !!options.json;
    try {
        const hardware = await detectHardware();
        if (isJson) {
            const output = {
                schema_version: '1.1.0',
                status: 'success',
                command: 'scan',
                timestamp: new Date().toISOString(),
                hardware,
            };
            console.log(JSON.stringify(output, null, 2));
        }
        else {
            printHardwareBanner(hardware);
        }
    }
    catch (err) {
        outputError(err, isJson, 'scan');
    }
});
// Dedicated Subcommand: canirunit check <game>
program
    .command('check <game>')
    .description('Perform a detailed component-by-component compatibility check for a specific game')
    .option('-j, --json', 'Output detailed evaluation as machine-readable JSON')
    .option('-d, --drive <letter>', 'Storage drive to evaluate free space against (e.g. C, D)')
    .option('--table', 'Render as compact table row instead of detailed card')
    .action(async (gameTitle, options) => {
    const isJson = !!options.json;
    try {
        const hardware = await detectHardware();
        const db = GameDatabase.getInstance();
        await db.load();
        const game = db.findBestMatch(gameTitle);
        if (!game) {
            const notFoundErr = new Error(`Game "${gameTitle}" not found in database.`);
            notFoundErr.code = 'GAME_NOT_FOUND';
            notFoundErr.hint = `Try searching for partial titles like 'canirunit -s "${gameTitle.slice(0, 4)}"' or aliases like 'gta', 'rdr2', 'cp2077'`;
            outputError(notFoundErr, isJson, 'check');
            return;
        }
        const engine = new CompatibilityEngine(hardware);
        const compat = engine.evaluateGame(game, options.drive);
        if (isJson) {
            const allGames = db.getAll();
            formatAndPrintJson('check', hardware, allGames, [compat], options, { game: gameTitle });
        }
        else {
            printHardwareBanner(hardware);
            if (options.table) {
                renderGamesTable([compat]);
            }
            else {
                renderGameCard(compat, hardware);
            }
        }
    }
    catch (err) {
        outputError(err, isJson, 'check');
    }
});
// Dedicated Subcommand: canirunit list
program
    .command('list')
    .description('List and filter curated games database')
    .option('-j, --json', 'Output machine-readable JSON')
    .option('-s, --search <query>', 'Search games by title, acronym, or tag')
    .option('-t, --tier <tier>', 'Filter by tier: high, medium, low, bottleneck, or coming-soon')
    .option('-l, --limit <number>', 'Number of games to show', '25')
    .option('--offset <number>', 'Number of games to skip in results for pagination', '0')
    .option('--all', 'Show all games without limit')
    .option('-d, --drive <letter>', 'Storage drive to evaluate')
    .option('--sort <field>', 'Sort by: fps, name, year, or storage', 'fps')
    .option('--order <direction>', 'Sort order: desc or asc', 'desc')
    .action(async (options) => {
    const isJson = !!options.json;
    try {
        const hardware = await detectHardware();
        const db = GameDatabase.getInstance();
        const allGames = await db.load();
        const engine = new CompatibilityEngine(hardware);
        const compatibilities = engine.evaluateBatch(allGames, options.drive);
        const filtered = applyFiltersAndSort(compatibilities, options.search, options.tier, undefined, undefined, options.sort, options.order);
        if (isJson) {
            formatAndPrintJson('list', hardware, allGames, filtered, options, {
                tier: options.tier || null,
                search: options.search || null,
            });
        }
        else {
            printHardwareBanner(hardware);
            const limit = options.all ? filtered.length : (parseInt(options.limit, 10) || 25);
            const offset = parseInt(options.offset, 10) || 0;
            renderGamesTable(filtered.slice(offset, offset + limit));
        }
    }
    catch (err) {
        outputError(err, isJson, 'list');
    }
});
program.parse(process.argv);
