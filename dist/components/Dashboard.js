import React, { useState, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { terminalLink, renderGaugeBar } from '../ui.js';
import { GameDatabase } from '../database.js';
export const Dashboard = ({ hardware, compatibilities, onClearScreen }) => {
    const { exit } = useApp();
    const [filter, setFilter] = useState('ALL');
    const [sortMode, setSortMode] = useState('FPS_DESC');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showScorecard, setShowScorecard] = useState(false);
    // Dedicated clear screen helper that purges console, scrollback buffer, and resets cursor
    const clearScreen = () => {
        try {
            console.clear();
            process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
        }
        catch (_) { }
        onClearScreen?.();
    };
    // Compute counts per category for the filter tabs (respecting active search alias / tokens)
    const tabCounts = useMemo(() => {
        let base = compatibilities;
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            const db = GameDatabase.getInstance();
            const matchedRecordIds = new Set(db.search(q).map(g => g.id));
            base = base.filter(item => matchedRecordIds.has(item.game.id) ||
                item.game.name.toLowerCase().includes(q) ||
                item.game.tags.some(t => t.toLowerCase().includes(q)));
        }
        return {
            ALL: base.length,
            HIGH: base.filter(c => c.tier === 'High Performance').length,
            MEDIUM: base.filter(c => c.tier === 'Medium Settings').length,
            LOW: base.filter(c => c.tier === 'Low Settings').length,
            BOTTLENECK: base.filter(c => c.tier === 'Bottlenecked').length,
            COMING_SOON: base.filter(c => c.game.status === 'Coming Soon').length,
        };
    }, [compatibilities, searchTerm]);
    // Filtered and sorted games (uses GameDatabase alias matching for GTA, RDR2, etc.)
    const filtered = useMemo(() => {
        let list = compatibilities;
        // Search filter using GameDatabase search (supports aliases and acronyms)
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            const db = GameDatabase.getInstance();
            const matchedRecordIds = new Set(db.search(q).map(g => g.id));
            list = list.filter(item => matchedRecordIds.has(item.game.id) ||
                item.game.name.toLowerCase().includes(q) ||
                item.game.tags.some(t => t.toLowerCase().includes(q)));
        }
        // Tier filter
        if (filter === 'HIGH')
            list = list.filter(c => c.tier === 'High Performance');
        else if (filter === 'MEDIUM')
            list = list.filter(c => c.tier === 'Medium Settings');
        else if (filter === 'LOW')
            list = list.filter(c => c.tier === 'Low Settings');
        else if (filter === 'BOTTLENECK')
            list = list.filter(c => c.tier === 'Bottlenecked');
        else if (filter === 'COMING_SOON')
            list = list.filter(c => c.game.status === 'Coming Soon');
        // Deterministic sorting with secondary tie-breakers
        list = [...list].sort((a, b) => {
            switch (sortMode) {
                case 'NAME_ASC':
                    return a.game.name.localeCompare(b.game.name);
                case 'STORAGE_DESC':
                    return (b.game.storage_gb - a.game.storage_gb) || a.game.name.localeCompare(b.game.name);
                case 'YEAR_DESC':
                    return (b.game.release_year - a.game.release_year) || a.game.name.localeCompare(b.game.name);
                case 'FPS_DESC':
                default:
                    return (b.estimatedFps - a.estimatedFps) || (b.game.release_year - a.game.release_year) || a.game.name.localeCompare(b.game.name);
            }
        });
        return list;
    }, [compatibilities, filter, searchTerm, sortMode]);
    // Terminal dimensions & responsive layout calculation
    const terminalCols = process.stdout.columns || 80;
    const isNarrow = terminalCols < 102;
    const containerWidth = Math.max(76, Math.min(terminalCols - 2, 140));
    // Dynamic column allocation for wide terminals (>=102 cols)
    const leftColWidth = isNarrow ? containerWidth : Math.max(42, Math.min(50, Math.floor(containerWidth * 0.42)));
    const rightColWidth = containerWidth - leftColWidth - 1;
    // Window sizing: 4 games in narrow stacked mode, 6 games in wide side-by-side mode
    const windowSize = isNarrow ? 4 : 6;
    const safeSelectedIndex = filtered.length > 0 ? Math.max(0, Math.min(selectedIndex, filtered.length - 1)) : 0;
    const selectedItem = filtered[safeSelectedIndex];
    const startIdx = Math.max(0, Math.min(safeSelectedIndex - Math.floor(windowSize / 2), Math.max(0, filtered.length - windowSize)));
    const visibleGames = filtered.slice(startIdx, startIdx + windowSize);
    const emptySlots = Math.max(0, windowSize - visibleGames.length);
    // Handle keyboard inputs
    useInput((input, key) => {
        // If currently typing in search mode
        if (isSearching) {
            if (key.return) {
                clearScreen();
                setIsSearching(false);
            }
            else if (key.escape) {
                clearScreen();
                setIsSearching(false);
                setSearchTerm('');
                setSelectedIndex(0);
            }
            else if (key.backspace || key.delete) {
                setSearchTerm(prev => prev.slice(0, -1));
                setSelectedIndex(0);
            }
            else if (input && !key.ctrl && !key.meta) {
                setSearchTerm(prev => prev + input);
                setSelectedIndex(0);
            }
            return;
        }
        // Quit actions
        if (input === 'q' || input === 'Q' || (key.ctrl && input === 'c')) {
            exit();
            return;
        }
        // Escape handling
        if (key.escape) {
            if (showScorecard) {
                clearScreen();
                setShowScorecard(false);
                return;
            }
            if (searchTerm) {
                clearScreen();
                setSearchTerm('');
                setSelectedIndex(0);
            }
            else {
                exit();
            }
            return;
        }
        // Toggle full compatibility scorecard modal
        if (key.return || input === ' ') {
            if (selectedItem) {
                clearScreen();
                setShowScorecard(prev => !prev);
                return;
            }
        }
        // Activate search
        if (input === '/') {
            clearScreen();
            setShowScorecard(false);
            setIsSearching(true);
            return;
        }
        // Ctrl+L force clear screen
        if (key.ctrl && input === 'l') {
            clearScreen();
            return;
        }
        // If viewing scorecard modal, only allow returning to list or quitting
        if (showScorecard) {
            if (key.upArrow || key.leftArrow) {
                setSelectedIndex(prev => Math.max(0, prev - 1));
            }
            else if (key.downArrow || key.rightArrow) {
                setSelectedIndex(prev => Math.max(0, Math.min(Math.max(0, filtered.length - 1), prev + 1)));
            }
            return;
        }
        // Cycle through filter tabs
        if (key.tab) {
            const filters = ['ALL', 'HIGH', 'MEDIUM', 'LOW', 'BOTTLENECK', 'COMING_SOON'];
            const nextIndex = (filters.indexOf(filter) + 1) % filters.length;
            setFilter(filters[nextIndex]);
            setSelectedIndex(0);
            return;
        }
        // Toggle sort mode
        if (input === 's' || input === 'S') {
            const sorts = ['FPS_DESC', 'NAME_ASC', 'STORAGE_DESC', 'YEAR_DESC'];
            const nextSort = (sorts.indexOf(sortMode) + 1) % sorts.length;
            setSortMode(sorts[nextSort]);
            setSelectedIndex(0);
            return;
        }
        // Quick Coming Soon toggle
        if (input === 'c' || input === 'C') {
            setFilter(prev => (prev === 'COMING_SOON' ? 'ALL' : 'COMING_SOON'));
            setSelectedIndex(0);
            return;
        }
        // List navigation with guaranteed non-negative bounds
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        else if (key.downArrow) {
            setSelectedIndex(prev => Math.max(0, Math.min(Math.max(0, filtered.length - 1), prev + 1)));
        }
        else if (key.pageUp) {
            setSelectedIndex(prev => Math.max(0, prev - windowSize));
        }
        else if (key.pageDown) {
            setSelectedIndex(prev => Math.max(0, Math.min(Math.max(0, filtered.length - 1), prev + windowSize)));
        }
    });
    // Clean CPU brand string for display (removes redundant vendor prefix if repeated)
    const displayCpuBrand = hardware.cpu.brand.startsWith('Gen ')
        ? `13th ${hardware.cpu.brand}`
        : hardware.cpu.brand;
    return (React.createElement(Box, { flexDirection: "column", width: containerWidth },
        React.createElement(Box, { borderStyle: "single", borderColor: "cyan", flexDirection: "column", paddingX: 1 },
            React.createElement(Box, { justifyContent: "space-between" },
                React.createElement(Text, { bold: true, color: "cyan" },
                    "\u25C6 PC GAME SCOUT ",
                    React.createElement(Text, { color: "gray" }, "| Windows Hardware & Game Compatibility Engine")),
                React.createElement(Text, { color: "gray" }, "v1.1.0 \u2022 TUI")),
            React.createElement(Box, { flexDirection: "row", justifyContent: "space-between" },
                React.createElement(Text, null,
                    React.createElement(Text, { bold: true, color: "white" }, "CPU: "),
                    React.createElement(Text, { color: "gray" },
                        displayCpuBrand,
                        " (",
                        hardware.cpu.physicalCores,
                        "C/",
                        hardware.cpu.threads,
                        "T @ ",
                        hardware.cpu.speedGhz,
                        " GHz)"))),
            React.createElement(Box, { flexDirection: "row", justifyContent: "space-between" },
                React.createElement(Text, null,
                    React.createElement(Text, { bold: true, color: "white" }, "GPU: "),
                    React.createElement(Text, { color: hardware.gpu.isIntegrated ? 'magenta' : 'green', bold: true },
                        hardware.gpu.model,
                        " (",
                        hardware.gpu.isIntegrated ? 'Integrated iGPU' : 'Dedicated dGPU',
                        " \u2022 ",
                        hardware.gpu.vramGb,
                        " GB VRAM \u2022 ~",
                        hardware.gpu.estimatedG3d,
                        " G3D)"))),
            React.createElement(Box, { flexDirection: "row", justifyContent: "space-between" },
                React.createElement(Text, null,
                    React.createElement(Text, { bold: true, color: "white" }, "RAM: "),
                    React.createElement(Text, { color: hardware.ram.channels === 'Dual-Channel' ? 'green' : 'yellow', bold: true },
                        hardware.ram.totalGb,
                        " GB ",
                        hardware.ram.generation,
                        "-",
                        hardware.ram.speedMhz,
                        " (",
                        hardware.ram.channels === 'Single-Channel' ? 'Single-Channel ⚠️ throttles iGPU' : 'Dual-Channel',
                        ")")),
                React.createElement(Text, null,
                    React.createElement(Text, { bold: true, color: "white" }, "Storage: "),
                    React.createElement(Text, { color: "green" },
                        hardware.storage.primaryMount.mount,
                        " ",
                        hardware.storage.primaryMount.freeGb,
                        " GB free / ",
                        hardware.storage.primaryMount.totalGb,
                        " GB (",
                        hardware.storage.primaryMount.isSsd ? 'SSD' : 'HDD',
                        ")")))),
        React.createElement(Box, { flexDirection: "column", marginY: 0 },
            React.createElement(Box, { justifyContent: "space-between" },
                React.createElement(Box, null,
                    React.createElement(Text, { color: filter === 'ALL' ? 'cyan' : 'gray', bold: filter === 'ALL' },
                        "All(",
                        tabCounts.ALL,
                        ")",
                        ' '),
                    React.createElement(Text, { color: filter === 'HIGH' ? 'green' : 'gray', bold: filter === 'HIGH' },
                        "High(",
                        tabCounts.HIGH,
                        ")",
                        ' '),
                    React.createElement(Text, { color: filter === 'MEDIUM' ? 'blue' : 'gray', bold: filter === 'MEDIUM' },
                        "Med(",
                        tabCounts.MEDIUM,
                        ")",
                        ' '),
                    React.createElement(Text, { color: filter === 'LOW' ? 'yellow' : 'gray', bold: filter === 'LOW' },
                        "Low(",
                        tabCounts.LOW,
                        ")",
                        ' '),
                    React.createElement(Text, { color: filter === 'BOTTLENECK' ? 'red' : 'gray', bold: filter === 'BOTTLENECK' },
                        "B-Neck(",
                        tabCounts.BOTTLENECK,
                        ")",
                        ' '),
                    React.createElement(Text, { color: filter === 'COMING_SOON' ? 'magenta' : 'gray', bold: filter === 'COMING_SOON' },
                        "Soon(",
                        tabCounts.COMING_SOON,
                        ")")),
                React.createElement(Text, { color: "gray" }, "[Tab: tier]")),
            React.createElement(Box, { justifyContent: "space-between" },
                isSearching ? (React.createElement(Text, null,
                    React.createElement(Text, { bold: true, color: "green" }, "\uD83D\uDD0D Search: "),
                    React.createElement(Text, { bold: true, color: "white" },
                        searchTerm,
                        "_"),
                    React.createElement(Text, { color: "gray" }, " [Enter: apply, Esc: cancel]"))) : (React.createElement(Text, null,
                    React.createElement(Text, { bold: true, color: searchTerm ? 'cyan' : 'gray' }, searchTerm ? `🔍 Filter: "${searchTerm}"` : '🔍 Search: [/] Press / to search'),
                    searchTerm ? React.createElement(Text, { color: "gray" }, " [/ to edit, Esc to clear]") : null)),
                React.createElement(Text, { color: "gray" },
                    "Sort: ",
                    React.createElement(Text, { color: "cyan" }, sortMode === 'FPS_DESC' ? 'FPS ↓' : sortMode === 'NAME_ASC' ? 'A-Z' : sortMode === 'STORAGE_DESC' ? 'Size' : 'Year'),
                    " [s]",
                    ' ',
                    React.createElement(Text, { color: "yellow" }, "[Enter: Full Scorecard]")))),
        showScorecard && selectedItem ? (
        /* Full Screen Game Compatibility Scorecard Modal */
        React.createElement(Box, { flexDirection: "column", borderStyle: "single", borderColor: "cyan", paddingX: 1 },
            React.createElement(Box, { justifyContent: "space-between" },
                React.createElement(Text, { bold: true, color: "cyan" },
                    "\u25C6 COMPATIBILITY SCORECARD: ",
                    React.createElement(Text, { color: "white" }, selectedItem.game.name),
                    ' ',
                    React.createElement(Text, { color: "gray" },
                        "(",
                        selectedItem.game.release_year,
                        ")")),
                selectedItem.game.status === 'Coming Soon' ? (React.createElement(Text, { color: "magenta", bold: true }, "[COMING SOON]")) : (React.createElement(Text, { color: "gray" },
                    "ID: ",
                    selectedItem.game.id))),
            React.createElement(Box, { justifyContent: "space-between" },
                React.createElement(Text, null,
                    React.createElement(Text, { bold: true, color: "white" }, "Verdict: "),
                    React.createElement(Text, { color: selectedItem.tier === 'High Performance' ? 'green' :
                            selectedItem.tier === 'Medium Settings' ? 'blue' :
                                selectedItem.tier === 'Low Settings' ? 'yellow' : 'red', bold: true }, selectedItem.tier),
                    React.createElement(Text, { color: "gray" },
                        " (~",
                        selectedItem.estimatedFps,
                        " FPS estimated)")),
                React.createElement(Text, null,
                    renderGaugeBar(selectedItem.estimatedFps, 100, 14),
                    ' ',
                    React.createElement(Text, { color: "cyan", bold: true },
                        selectedItem.estimatedFps,
                        " FPS"))),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "Technologies: "),
                selectedItem.game.directx && React.createElement(Text, { color: "cyan" },
                    "[",
                    selectedItem.game.directx,
                    "] "),
                selectedItem.game.supports_fsr && React.createElement(Text, { color: "green" }, "[AMD FSR] "),
                selectedItem.game.supports_xess && React.createElement(Text, { color: "blue" }, "[Intel XeSS] "),
                selectedItem.game.supports_dlss && React.createElement(Text, { color: "cyan" }, "[NVIDIA DLSS] "),
                !selectedItem.game.supports_fsr && !selectedItem.game.supports_xess && !selectedItem.game.supports_dlss && (React.createElement(Text, { color: "gray" }, "[Native 1080p]"))),
            React.createElement(Box, { marginY: 0 },
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")),
            React.createElement(Text, { bold: true, color: "cyan" }, "HARDWARE EVALUATION BREAKDOWN:"),
            selectedItem.specCheck && (React.createElement(React.Fragment, null,
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, null,
                        "CPU: ",
                        selectedItem.specCheck.cpu.passed ? React.createElement(Text, { color: "green", bold: true }, "\u2714 PASSED ") : React.createElement(Text, { color: "red", bold: true }, "\u2716 DEFICIT "),
                        React.createElement(Text, { color: "white" }, selectedItem.specCheck.cpu.detected)),
                    React.createElement(Text, { color: "gray" },
                        "Min: ",
                        selectedItem.specCheck.cpu.required)),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, null,
                        "GPU: ",
                        selectedItem.specCheck.gpu.passed ? React.createElement(Text, { color: "green", bold: true }, "\u2714 PASSED ") : React.createElement(Text, { color: "red", bold: true }, "\u2716 DEFICIT "),
                        React.createElement(Text, { color: "white" }, selectedItem.specCheck.gpu.detected)),
                    React.createElement(Text, { color: "gray" },
                        "~",
                        selectedItem.specCheck.gpu.effectiveG3d,
                        " vs Min ",
                        selectedItem.specCheck.gpu.minG3d,
                        " G3D")),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, null,
                        "RAM: ",
                        selectedItem.specCheck.ram.passed ? React.createElement(Text, { color: "green", bold: true }, "\u2714 PASSED ") : React.createElement(Text, { color: "red", bold: true }, "\u2716 DEFICIT "),
                        React.createElement(Text, { color: "white" }, selectedItem.specCheck.ram.message)),
                    React.createElement(Text, { color: "gray" },
                        "Min: ",
                        selectedItem.game.min_ram_gb,
                        " GB")),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, null,
                        "Disk: ",
                        selectedItem.specCheck.storage.passed ? React.createElement(Text, { color: "green", bold: true }, "\u2714 PASSED ") : React.createElement(Text, { color: "red", bold: true }, "\u2716 DEFICIT "),
                        React.createElement(Text, { color: selectedItem.specCheck.storage.passed ? 'white' : 'yellow' }, selectedItem.specCheck.storage.message)),
                    React.createElement(Text, { color: "gray" },
                        "Requires: ",
                        selectedItem.game.storage_gb,
                        " GB")))),
            React.createElement(Box, { marginY: 0 },
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")),
            React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { bold: true, color: "magenta" }, "COMMUNITY & iGPU INSIGHTS (r/lowspecgamer):"),
                React.createElement(Text, { color: "white" },
                    "\u2728 ",
                    selectedItem.communityNote || selectedItem.game.community_notes || selectedItem.communityBadge || 'Plays smoothly on modern hardware with recommended in-game settings.'),
                selectedItem.bottlenecks.length > 0 && (React.createElement(Text, { color: "yellow" },
                    "\u26A0\uFE0F Bottleneck: ",
                    selectedItem.bottlenecks.join(' • ')))),
            React.createElement(Box, { marginY: 0 },
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")),
            React.createElement(Box, { justifyContent: "space-between" },
                React.createElement(Text, null,
                    "Store Links:",
                    ' ',
                    selectedItem.game.steam_appid ? (React.createElement(Text, { color: "blue" },
                        "Steam: ",
                        terminalLink(selectedItem.game.steam_url, selectedItem.game.steam_url),
                        " ")) : (React.createElement(Text, { color: "gray" }, "No Steam ")),
                    selectedItem.game.epic_url ? (React.createElement(Text, { color: "magenta" },
                        "\u2022 Epic: ",
                        terminalLink(selectedItem.game.epic_url, selectedItem.game.epic_url))) : null),
                React.createElement(Text, { color: "yellow", bold: true }, "[Enter / Esc: Back to List]")))) : isNarrow ? (
        /* NARROW STACKED VIEW (<102 cols, e.g. standard 80x24 CMD): Stacked List and Details to prevent any truncation */
        React.createElement(Box, { flexDirection: "column" },
            React.createElement(Box, { flexDirection: "column", borderStyle: "single", borderColor: "gray", paddingX: 1 },
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { bold: true, color: "white" },
                        "Games (",
                        filtered.length,
                        ")"),
                    React.createElement(Text, { color: "gray" }, filtered.length > 0 ? `${safeSelectedIndex + 1}/${filtered.length}` : '0/0')),
                visibleGames.length === 0 ? (React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" }, "No games match query. Press [/] to search."))) : (visibleGames.map((item, idx) => {
                    const actualIdx = startIdx + idx;
                    const isSelected = actualIdx === safeSelectedIndex;
                    let tierBadge = 'High';
                    let tierColor = 'green';
                    if (item.tier === 'Medium Settings') {
                        tierBadge = 'Med';
                        tierColor = 'blue';
                    }
                    else if (item.tier === 'Low Settings') {
                        tierBadge = 'Low';
                        tierColor = 'yellow';
                    }
                    else if (item.tier === 'Bottlenecked') {
                        tierBadge = 'B-Neck';
                        tierColor = 'red';
                    }
                    return (React.createElement(Box, { key: item.game.id, justifyContent: "space-between" },
                        React.createElement(Text, { color: isSelected ? 'cyan' : 'white', bold: isSelected },
                            isSelected ? '▶ ' : '  ',
                            item.game.name,
                            React.createElement(Text, { color: "gray" },
                                " (",
                                item.game.release_year,
                                ")"),
                            item.game.status === 'Coming Soon' ? React.createElement(Text, { color: "magenta", bold: true }, " \u2605 Soon") : null),
                        React.createElement(Text, { color: tierColor, bold: isSelected },
                            "[",
                            tierBadge,
                            " \u2022 ",
                            item.estimatedFps,
                            " FPS \u2022 ",
                            item.game.storage_gb,
                            " GB]")));
                })),
                Array.from({ length: emptySlots }).map((_, idx) => (React.createElement(Box, { key: `pad-n-${idx}` },
                    React.createElement(Text, null, " "))))),
            React.createElement(Box, { flexDirection: "column", borderStyle: "single", borderColor: "cyan", paddingX: 1, marginTop: 0 }, selectedItem ? (React.createElement(React.Fragment, null,
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { bold: true, color: "white" },
                        selectedItem.game.name,
                        " ",
                        React.createElement(Text, { color: "gray" },
                            "(",
                            selectedItem.game.release_year,
                            ")")),
                    selectedItem.game.status === 'Coming Soon' ? (React.createElement(Text, { color: "magenta", bold: true }, "[COMING SOON]")) : (React.createElement(Text, { color: "gray" },
                        "ID: ",
                        selectedItem.game.id))),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { bold: true, color: "white" },
                        "Verdict: ",
                        React.createElement(Text, { color: selectedItem.tier === 'High Performance' ? 'green' :
                                selectedItem.tier === 'Medium Settings' ? 'blue' :
                                    selectedItem.tier === 'Low Settings' ? 'yellow' : 'red', bold: true }, selectedItem.tier),
                        React.createElement(Text, { color: "gray" },
                            " (~",
                            selectedItem.estimatedFps,
                            " FPS)")),
                    React.createElement(Text, null,
                        renderGaugeBar(selectedItem.estimatedFps, 100, 10),
                        ' ',
                        React.createElement(Text, { color: "gray" },
                            selectedItem.estimatedFps,
                            " FPS"))),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "cyan", bold: true }, "\u2728 "),
                    React.createElement(Text, { color: "white" }, selectedItem.communityNote || selectedItem.game.community_notes || selectedItem.communityBadge || 'Playable on modern hardware')),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" },
                        "Min: RAM ",
                        selectedItem.game.min_ram_gb,
                        " GB \u2022 GPU: ",
                        selectedItem.game.min_gpu,
                        " \u2022 ",
                        selectedItem.game.directx || 'DX11')),
                React.createElement(Box, null, selectedItem.storageWarning ? (React.createElement(Text, { color: "yellow", bold: true },
                    "\u26A0\uFE0F Storage: ",
                    selectedItem.storageWarning)) : (React.createElement(Text, { color: "green" },
                    "\u2714 Storage: ",
                    selectedItem.game.storage_gb,
                    " GB OK (",
                    hardware.storage.primaryMount.mount,
                    " ",
                    hardware.storage.primaryMount.freeGb,
                    " GB free)",
                    selectedItem.game.requires_ssd ? (hardware.storage.primaryMount.isSsd ? ' • SSD OK' : ' • ⚠️ SSD Required') : ''))),
                React.createElement(Box, null, selectedItem.bottlenecks.length > 0 ? (React.createElement(Text, { color: "yellow" },
                    "\u26A0\uFE0F Bottleneck: ",
                    selectedItem.bottlenecks[0])) : (React.createElement(Text, { color: "green" }, "\u2714 Specs meet or exceed minimum hardware requirements"))),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { color: "white" },
                        "Store:",
                        ' ',
                        selectedItem.game.steam_appid ? (React.createElement(Text, { color: "blue" },
                            "Steam: ",
                            terminalLink('Store Page', selectedItem.game.steam_url),
                            " ")) : (React.createElement(Text, { color: "gray" }, "No Steam ")),
                        selectedItem.game.epic_url ? (React.createElement(Text, { color: "magenta" },
                            "\u2022 Epic: ",
                            terminalLink('Epic Store', selectedItem.game.epic_url))) : null),
                    React.createElement(Text, { color: "yellow" }, "[Enter: Full Scorecard]")))) : (React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "No game selected.")))))) : (
        /* WIDE VIEW (>=102 cols): Side-by-Side Panels with generous column widths */
        React.createElement(Box, { flexDirection: "row" },
            React.createElement(Box, { flexDirection: "column", width: leftColWidth, borderStyle: "single", borderColor: "gray", paddingX: 1 },
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { bold: true, color: "white" },
                        "Games (",
                        filtered.length,
                        ")"),
                    React.createElement(Text, { color: "gray" }, filtered.length > 0 ? `${safeSelectedIndex + 1}/${filtered.length}` : '0/0')),
                visibleGames.length === 0 ? (React.createElement(React.Fragment, null,
                    React.createElement(Box, null,
                        React.createElement(Text, { color: "gray" }, "No games match query.")),
                    React.createElement(Box, null,
                        React.createElement(Text, { color: "cyan" }, "Press [/] to change search")),
                    React.createElement(Box, null,
                        React.createElement(Text, null, " ")),
                    React.createElement(Box, null,
                        React.createElement(Text, null, " ")),
                    React.createElement(Box, null,
                        React.createElement(Text, null, " ")),
                    React.createElement(Box, null,
                        React.createElement(Text, null, " ")))) : (React.createElement(React.Fragment, null,
                    visibleGames.map((item, idx) => {
                        const actualIdx = startIdx + idx;
                        const isSelected = actualIdx === safeSelectedIndex;
                        let tierBadge = 'High';
                        let tierColor = 'green';
                        if (item.tier === 'Medium Settings') {
                            tierBadge = 'Med';
                            tierColor = 'blue';
                        }
                        else if (item.tier === 'Low Settings') {
                            tierBadge = 'Low';
                            tierColor = 'yellow';
                        }
                        else if (item.tier === 'Bottlenecked') {
                            tierBadge = 'B-Neck';
                            tierColor = 'red';
                        }
                        return (React.createElement(Box, { key: item.game.id, justifyContent: "space-between" },
                            React.createElement(Text, { color: isSelected ? 'cyan' : 'white', bold: isSelected },
                                isSelected ? '▶ ' : '  ',
                                item.game.name,
                                item.game.status === 'Coming Soon' ? React.createElement(Text, { color: "magenta" }, " \u2605") : ''),
                            React.createElement(Text, { color: tierColor, bold: isSelected },
                                "[",
                                tierBadge,
                                " ",
                                item.estimatedFps,
                                "f]")));
                    }),
                    Array.from({ length: emptySlots }).map((_, idx) => (React.createElement(Box, { key: `pad-w-${idx}` },
                        React.createElement(Text, null, " ")))))),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { color: "gray" }, "\u25B2/\u25BC Nav"),
                    React.createElement(Text, { color: "gray" },
                        "[PgUp/Dn: \u00B1",
                        windowSize,
                        "]"))),
            React.createElement(Box, { flexDirection: "column", width: rightColWidth, borderStyle: "single", borderColor: "cyan", paddingX: 1, marginLeft: 1 }, selectedItem ? (React.createElement(React.Fragment, null,
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { bold: true, color: "white" },
                        selectedItem.game.name,
                        ' ',
                        React.createElement(Text, { color: "gray" },
                            "(",
                            selectedItem.game.release_year,
                            ")")),
                    selectedItem.game.status === 'Coming Soon' ? (React.createElement(Text, { color: "magenta", bold: true }, "[COMING SOON]")) : (React.createElement(Text, { color: "gray" },
                        "ID: ",
                        selectedItem.game.id))),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { bold: true, color: "white" },
                        "Verdict: ",
                        React.createElement(Text, { color: selectedItem.tier === 'High Performance' ? 'green' :
                                selectedItem.tier === 'Medium Settings' ? 'blue' :
                                    selectedItem.tier === 'Low Settings' ? 'yellow' : 'red', bold: true }, selectedItem.tier)),
                    React.createElement(Text, null,
                        renderGaugeBar(selectedItem.estimatedFps, 100, Math.max(8, Math.min(14, rightColWidth - 45))),
                        ' ',
                        React.createElement(Text, { color: "gray" },
                            selectedItem.estimatedFps,
                            " FPS"))),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "cyan", bold: true }, "\u2728 "),
                    React.createElement(Text, { color: "white" }, selectedItem.communityNote || selectedItem.game.community_notes || selectedItem.communityBadge || 'Playable on modern hardware')),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" },
                        "Min: RAM ",
                        selectedItem.game.min_ram_gb,
                        " GB \u2022 GPU: ",
                        selectedItem.game.min_gpu,
                        " \u2022 ",
                        selectedItem.game.directx || 'DX11')),
                React.createElement(Box, null, selectedItem.storageWarning ? (React.createElement(Text, { color: "yellow", bold: true },
                    "\u26A0\uFE0F ",
                    selectedItem.storageWarning)) : (React.createElement(Text, { color: "green" },
                    "\u2714 Storage: ",
                    selectedItem.game.storage_gb,
                    " GB OK (",
                    hardware.storage.primaryMount.mount,
                    " ",
                    hardware.storage.primaryMount.freeGb,
                    " GB free)",
                    selectedItem.game.requires_ssd ? (hardware.storage.primaryMount.isSsd ? ' • SSD OK' : ' • ⚠️ SSD Req') : ''))),
                React.createElement(Box, null, selectedItem.bottlenecks.length > 0 ? (React.createElement(Text, { color: "yellow" },
                    "\u26A0\uFE0F ",
                    selectedItem.bottlenecks[0])) : (React.createElement(Text, { color: "green" }, "\u2714 Specs meet or exceed minimum requirements"))),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { color: "white" },
                        "Tech:",
                        ' ',
                        selectedItem.game.supports_fsr && React.createElement(Text, { color: "green" }, "[FSR] "),
                        selectedItem.game.supports_xess && React.createElement(Text, { color: "blue" }, "[XeSS] "),
                        selectedItem.game.supports_dlss && React.createElement(Text, { color: "cyan" }, "[DLSS] "),
                        !selectedItem.game.supports_fsr && !selectedItem.game.supports_xess && !selectedItem.game.supports_dlss && (React.createElement(Text, { color: "gray" }, "Native 1080p "))),
                    React.createElement(Text, { color: "gray" },
                        "Min: ~",
                        selectedItem.game.min_gpu_g3d || 'N/A',
                        " G3D")),
                React.createElement(Box, { justifyContent: "space-between" },
                    React.createElement(Text, { color: "white" },
                        "Store:",
                        ' ',
                        selectedItem.game.steam_appid ? (React.createElement(Text, { color: "blue" },
                            "Steam: ",
                            terminalLink('Store Page', selectedItem.game.steam_url),
                            " ")) : (React.createElement(Text, { color: "gray" }, "No Steam ")),
                        selectedItem.game.epic_url ? (React.createElement(Text, { color: "magenta" },
                            "\u2022 Epic: ",
                            terminalLink('Epic Store', selectedItem.game.epic_url))) : null),
                    React.createElement(Text, { color: "yellow" }, "[Enter: Full Scorecard]")))) : (React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "No game selected.")))))),
        React.createElement(Box, { justifyContent: "space-between", marginY: 0 },
            React.createElement(Text, { color: "gray" }, "[\u2191/\u2193] Select \u2022 [Tab] Tier \u2022 [/] Search \u2022 [s] Sort \u2022 [Enter] Full Scorecard \u2022 [q] Quit"),
            React.createElement(Text, { color: "gray" },
                compatibilities.length,
                " Curated Games"))));
};
