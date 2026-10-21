import React, { useState, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import chalk from 'chalk';
import { HardwareProfile, GameCompatibility } from '../types.js';
import { terminalLink, renderGaugeBar } from '../ui.js';
import { GameDatabase } from '../database.js';

interface DashboardProps {
  hardware: HardwareProfile;
  compatibilities: GameCompatibility[];
  onClearScreen?: () => void;
}

type FilterTier = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BOTTLENECK' | 'COMING_SOON';
type SortMode = 'FPS_DESC' | 'NAME_ASC' | 'STORAGE_DESC' | 'YEAR_DESC';

export const Dashboard: React.FC<DashboardProps> = ({ hardware, compatibilities, onClearScreen }) => {
  const { exit } = useApp();
  const [filter, setFilter] = useState<FilterTier>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('FPS_DESC');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);

  // Dedicated clear screen helper that purges console, scrollback buffer, and resets cursor
  const clearScreen = () => {
    try {
      console.clear();
      process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
    } catch (_) {}
    onClearScreen?.();
  };

  // Compute counts per category for the filter tabs (respecting active search alias / tokens)
  const tabCounts = useMemo(() => {
    let base = compatibilities;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const db = GameDatabase.getInstance();
      const matchedRecordIds = new Set(db.search(q).map(g => g.id));
      base = base.filter(item =>
        matchedRecordIds.has(item.game.id) ||
        item.game.name.toLowerCase().includes(q) ||
        item.game.tags.some(t => t.toLowerCase().includes(q))
      );
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
      list = list.filter(item =>
        matchedRecordIds.has(item.game.id) ||
        item.game.name.toLowerCase().includes(q) ||
        item.game.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Tier filter
    if (filter === 'HIGH') list = list.filter(c => c.tier === 'High Performance');
    else if (filter === 'MEDIUM') list = list.filter(c => c.tier === 'Medium Settings');
    else if (filter === 'LOW') list = list.filter(c => c.tier === 'Low Settings');
    else if (filter === 'BOTTLENECK') list = list.filter(c => c.tier === 'Bottlenecked');
    else if (filter === 'COMING_SOON') list = list.filter(c => c.game.status === 'Coming Soon');

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
      } else if (key.escape) {
        clearScreen();
        setIsSearching(false);
        setSearchTerm('');
        setSelectedIndex(0);
      } else if (key.backspace || key.delete) {
        setSearchTerm(prev => prev.slice(0, -1));
        setSelectedIndex(0);
      } else if (input && !key.ctrl && !key.meta) {
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
      } else {
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
      } else if (key.downArrow || key.rightArrow) {
        setSelectedIndex(prev => Math.max(0, Math.min(Math.max(0, filtered.length - 1), prev + 1)));
      }
      return;
    }

    // Cycle through filter tabs
    if (key.tab) {
      const filters: FilterTier[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW', 'BOTTLENECK', 'COMING_SOON'];
      const nextIndex = (filters.indexOf(filter) + 1) % filters.length;
      setFilter(filters[nextIndex]);
      setSelectedIndex(0);
      return;
    }

    // Toggle sort mode
    if (input === 's' || input === 'S') {
      const sorts: SortMode[] = ['FPS_DESC', 'NAME_ASC', 'STORAGE_DESC', 'YEAR_DESC'];
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
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.max(0, Math.min(Math.max(0, filtered.length - 1), prev + 1)));
    } else if (key.pageUp) {
      setSelectedIndex(prev => Math.max(0, prev - windowSize));
    } else if (key.pageDown) {
      setSelectedIndex(prev => Math.max(0, Math.min(Math.max(0, filtered.length - 1), prev + windowSize)));
    }
  });

  // Clean CPU brand string for display (removes redundant vendor prefix if repeated)
  const displayCpuBrand = hardware.cpu.brand.startsWith('Gen ')
    ? `13th ${hardware.cpu.brand}`
    : hardware.cpu.brand;

  return (
    <Box flexDirection="column" width={containerWidth}>
      {/* Hardware Profile Banner - Full Info, Zero Slicing */}
      <Box borderStyle="single" borderColor="cyan" flexDirection="column" paddingX={1}>
        <Box justifyContent="space-between">
          <Text bold color="cyan">
            ◆ PC GAME SCOUT <Text color="gray">| Windows Hardware & Game Compatibility Engine</Text>
          </Text>
          <Text color="gray">v1.1.0 • TUI</Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Text>
            <Text bold color="white">CPU: </Text>
            <Text color="gray">
              {displayCpuBrand} ({hardware.cpu.physicalCores}C/{hardware.cpu.threads}T @ {hardware.cpu.speedGhz} GHz)
            </Text>
          </Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Text>
            <Text bold color="white">GPU: </Text>
            <Text color={hardware.gpu.isIntegrated ? 'magenta' : 'green'} bold>
              {hardware.gpu.model} ({hardware.gpu.isIntegrated ? 'Integrated iGPU' : 'Dedicated dGPU'} • {hardware.gpu.vramGb} GB VRAM • ~{hardware.gpu.estimatedG3d} G3D)
            </Text>
          </Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Text>
            <Text bold color="white">RAM: </Text>
            <Text color={hardware.ram.channels === 'Dual-Channel' ? 'green' : 'yellow'} bold>
              {hardware.ram.totalGb} GB {hardware.ram.generation}-{hardware.ram.speedMhz} ({hardware.ram.channels === 'Single-Channel' ? 'Single-Channel ⚠️ throttles iGPU' : 'Dual-Channel'})
            </Text>
          </Text>
          <Text>
            <Text bold color="white">Storage: </Text>
            <Text color="green">
              {hardware.storage.primaryMount.mount} {hardware.storage.primaryMount.freeGb} GB free / {hardware.storage.primaryMount.totalGb} GB ({hardware.storage.primaryMount.isSsd ? 'SSD' : 'HDD'})
            </Text>
          </Text>
        </Box>
      </Box>

      {/* Filter Tabs & Search Controls */}
      <Box flexDirection="column" marginY={0}>
        <Box justifyContent="space-between">
          <Box>
            <Text color={filter === 'ALL' ? 'cyan' : 'gray'} bold={filter === 'ALL'}>
              All({tabCounts.ALL}){' '}
            </Text>
            <Text color={filter === 'HIGH' ? 'green' : 'gray'} bold={filter === 'HIGH'}>
              High({tabCounts.HIGH}){' '}
            </Text>
            <Text color={filter === 'MEDIUM' ? 'blue' : 'gray'} bold={filter === 'MEDIUM'}>
              Med({tabCounts.MEDIUM}){' '}
            </Text>
            <Text color={filter === 'LOW' ? 'yellow' : 'gray'} bold={filter === 'LOW'}>
              Low({tabCounts.LOW}){' '}
            </Text>
            <Text color={filter === 'BOTTLENECK' ? 'red' : 'gray'} bold={filter === 'BOTTLENECK'}>
              B-Neck({tabCounts.BOTTLENECK}){' '}
            </Text>
            <Text color={filter === 'COMING_SOON' ? 'magenta' : 'gray'} bold={filter === 'COMING_SOON'}>
              Soon({tabCounts.COMING_SOON})
            </Text>
          </Box>
          <Text color="gray">[Tab: tier]</Text>
        </Box>
        <Box justifyContent="space-between">
          {isSearching ? (
            <Text>
              <Text bold color="green">🔍 Search: </Text>
              <Text bold color="white">{searchTerm}_</Text>
              <Text color="gray"> [Enter: apply, Esc: cancel]</Text>
            </Text>
          ) : (
            <Text>
              <Text bold color={searchTerm ? 'cyan' : 'gray'}>
                {searchTerm ? `🔍 Filter: "${searchTerm}"` : '🔍 Search: [/] Press / to search'}
              </Text>
              {searchTerm ? <Text color="gray"> [/ to edit, Esc to clear]</Text> : null}
            </Text>
          )}
          <Text color="gray">
            Sort: <Text color="cyan">{sortMode === 'FPS_DESC' ? 'FPS ↓' : sortMode === 'NAME_ASC' ? 'A-Z' : sortMode === 'STORAGE_DESC' ? 'Size' : 'Year'}</Text> [s]{' '}
            <Text color="yellow">[Enter: Full Scorecard]</Text>
          </Text>
        </Box>
      </Box>

      {/* MAIN CONTENT AREA: Scorecard Modal OR Game Browser */}
      {showScorecard && selectedItem ? (
        /* Full Screen Game Compatibility Scorecard Modal */
        <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
          <Box justifyContent="space-between">
            <Text bold color="cyan">
              ◆ COMPATIBILITY SCORECARD: <Text color="white">{selectedItem.game.name}</Text>{' '}
              <Text color="gray">({selectedItem.game.release_year})</Text>
            </Text>
            {selectedItem.game.status === 'Coming Soon' ? (
              <Text color="magenta" bold>[COMING SOON]</Text>
            ) : (
              <Text color="gray">ID: {selectedItem.game.id}</Text>
            )}
          </Box>
          <Box justifyContent="space-between">
            <Text>
              <Text bold color="white">Verdict: </Text>
              <Text color={
                selectedItem.tier === 'High Performance' ? 'green' :
                selectedItem.tier === 'Medium Settings' ? 'blue' :
                selectedItem.tier === 'Low Settings' ? 'yellow' : 'red'
              } bold>{selectedItem.tier}</Text>
              <Text color="gray"> (~{selectedItem.estimatedFps} FPS estimated)</Text>
            </Text>
            <Text>
              {renderGaugeBar(selectedItem.estimatedFps, 100, 14)}{' '}
              <Text color="cyan" bold>{selectedItem.estimatedFps} FPS</Text>
            </Text>
          </Box>
          <Box>
            <Text color="gray">Technologies: </Text>
            {selectedItem.game.directx && <Text color="cyan">[{selectedItem.game.directx}] </Text>}
            {selectedItem.game.supports_fsr && <Text color="green">[AMD FSR] </Text>}
            {selectedItem.game.supports_xess && <Text color="blue">[Intel XeSS] </Text>}
            {selectedItem.game.supports_dlss && <Text color="cyan">[NVIDIA DLSS] </Text>}
            {!selectedItem.game.supports_fsr && !selectedItem.game.supports_xess && !selectedItem.game.supports_dlss && (
              <Text color="gray">[Native 1080p]</Text>
            )}
          </Box>
          <Box marginY={0}><Text color="gray">─────────────────────────────────────────────────────────────────────────────</Text></Box>
          <Text bold color="cyan">HARDWARE EVALUATION BREAKDOWN:</Text>
          {selectedItem.specCheck && (
            <>
              <Box justifyContent="space-between">
                <Text>
                  CPU: {selectedItem.specCheck.cpu.passed ? <Text color="green" bold>✔ PASSED </Text> : <Text color="red" bold>✖ DEFICIT </Text>}
                  <Text color="white">{selectedItem.specCheck.cpu.detected}</Text>
                </Text>
                <Text color="gray">Min: {selectedItem.specCheck.cpu.required}</Text>
              </Box>
              <Box justifyContent="space-between">
                <Text>
                  GPU: {selectedItem.specCheck.gpu.passed ? <Text color="green" bold>✔ PASSED </Text> : <Text color="red" bold>✖ DEFICIT </Text>}
                  <Text color="white">{selectedItem.specCheck.gpu.detected}</Text>
                </Text>
                <Text color="gray">~{selectedItem.specCheck.gpu.effectiveG3d} vs Min {selectedItem.specCheck.gpu.minG3d} G3D</Text>
              </Box>
              <Box justifyContent="space-between">
                <Text>
                  RAM: {selectedItem.specCheck.ram.passed ? <Text color="green" bold>✔ PASSED </Text> : <Text color="red" bold>✖ DEFICIT </Text>}
                  <Text color="white">{selectedItem.specCheck.ram.message}</Text>
                </Text>
                <Text color="gray">Min: {selectedItem.game.min_ram_gb} GB</Text>
              </Box>
              <Box justifyContent="space-between">
                <Text>
                  Disk: {selectedItem.specCheck.storage.passed ? <Text color="green" bold>✔ PASSED </Text> : <Text color="red" bold>✖ DEFICIT </Text>}
                  <Text color={selectedItem.specCheck.storage.passed ? 'white' : 'yellow'}>{selectedItem.specCheck.storage.message}</Text>
                </Text>
                <Text color="gray">Requires: {selectedItem.game.storage_gb} GB</Text>
              </Box>
            </>
          )}
          <Box marginY={0}><Text color="gray">─────────────────────────────────────────────────────────────────────────────</Text></Box>
          <Box flexDirection="column">
            <Text bold color="magenta">COMMUNITY & iGPU INSIGHTS (r/lowspecgamer):</Text>
            <Text color="white">
              ✨ {selectedItem.communityNote || selectedItem.game.community_notes || selectedItem.communityBadge || 'Plays smoothly on modern hardware with recommended in-game settings.'}
            </Text>
            {selectedItem.bottlenecks.length > 0 && (
              <Text color="yellow">
                ⚠️ Bottleneck: {selectedItem.bottlenecks.join(' • ')}
              </Text>
            )}
          </Box>
          <Box marginY={0}><Text color="gray">─────────────────────────────────────────────────────────────────────────────</Text></Box>
          <Box justifyContent="space-between">
            <Text>
              Store Links:{' '}
              {selectedItem.game.steam_appid ? (
                <Text color="blue">Steam: {terminalLink(selectedItem.game.steam_url, selectedItem.game.steam_url)} </Text>
              ) : (
                <Text color="gray">No Steam </Text>
              )}
              {selectedItem.game.epic_url ? (
                <Text color="magenta">• Epic: {terminalLink(selectedItem.game.epic_url, selectedItem.game.epic_url)}</Text>
              ) : null}
            </Text>
            <Text color="yellow" bold>[Enter / Esc: Back to List]</Text>
          </Box>
        </Box>
      ) : isNarrow ? (
        /* NARROW STACKED VIEW (<102 cols, e.g. standard 80x24 CMD): Stacked List and Details to prevent any truncation */
        <Box flexDirection="column">
          {/* Games List (Full Container Width) */}
          <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
            <Box justifyContent="space-between">
              <Text bold color="white">Games ({filtered.length})</Text>
              <Text color="gray">{filtered.length > 0 ? `${safeSelectedIndex + 1}/${filtered.length}` : '0/0'}</Text>
            </Box>
            {visibleGames.length === 0 ? (
              <Box><Text color="gray">No games match query. Press [/] to search.</Text></Box>
            ) : (
              visibleGames.map((item, idx) => {
                const actualIdx = startIdx + idx;
                const isSelected = actualIdx === safeSelectedIndex;
                let tierBadge = 'High';
                let tierColor: any = 'green';
                if (item.tier === 'Medium Settings') {
                  tierBadge = 'Med';
                  tierColor = 'blue';
                } else if (item.tier === 'Low Settings') {
                  tierBadge = 'Low';
                  tierColor = 'yellow';
                } else if (item.tier === 'Bottlenecked') {
                  tierBadge = 'B-Neck';
                  tierColor = 'red';
                }

                return (
                  <Box key={item.game.id} justifyContent="space-between">
                    <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                      {isSelected ? '▶ ' : '  '}
                      {item.game.name}
                      <Text color="gray"> ({item.game.release_year})</Text>
                      {item.game.status === 'Coming Soon' ? <Text color="magenta" bold> ★ Soon</Text> : null}
                    </Text>
                    <Text color={tierColor} bold={isSelected}>
                      [{tierBadge} • {item.estimatedFps} FPS • {item.game.storage_gb} GB]
                    </Text>
                  </Box>
                );
              })
            )}
            {/* Pad remaining slots */}
            {Array.from({ length: emptySlots }).map((_, idx) => (
              <Box key={`pad-n-${idx}`}><Text> </Text></Box>
            ))}
          </Box>

          {/* Selected Game Details Panel (Full Container Width) */}
          <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1} marginTop={0}>
            {selectedItem ? (
              <>
                {/* Line 1: Title, Status, ID */}
                <Box justifyContent="space-between">
                  <Text bold color="white">
                    {selectedItem.game.name} <Text color="gray">({selectedItem.game.release_year})</Text>
                  </Text>
                  {selectedItem.game.status === 'Coming Soon' ? (
                    <Text color="magenta" bold>[COMING SOON]</Text>
                  ) : (
                    <Text color="gray">ID: {selectedItem.game.id}</Text>
                  )}
                </Box>

                {/* Line 2: Verdict & Gauge & Tech */}
                <Box justifyContent="space-between">
                  <Text bold color="white">
                    Verdict: <Text color={
                      selectedItem.tier === 'High Performance' ? 'green' :
                      selectedItem.tier === 'Medium Settings' ? 'blue' :
                      selectedItem.tier === 'Low Settings' ? 'yellow' : 'red'
                    } bold>{selectedItem.tier}</Text>
                    <Text color="gray"> (~{selectedItem.estimatedFps} FPS)</Text>
                  </Text>
                  <Text>
                    {renderGaugeBar(selectedItem.estimatedFps, 100, 10)}{' '}
                    <Text color="gray">{selectedItem.estimatedFps} FPS</Text>
                  </Text>
                </Box>

                {/* Line 3: Community & iGPU Note */}
                <Box>
                  <Text color="cyan" bold>✨ </Text>
                  <Text color="white">
                    {selectedItem.communityNote || selectedItem.game.community_notes || selectedItem.communityBadge || 'Playable on modern hardware'}
                  </Text>
                </Box>

                {/* Line 4: Requirements */}
                <Box>
                  <Text color="gray">
                    Min: RAM {selectedItem.game.min_ram_gb} GB • GPU: {selectedItem.game.min_gpu} • {selectedItem.game.directx || 'DX11'}
                  </Text>
                </Box>

                {/* Line 5: Storage Warning / Status */}
                <Box>
                  {selectedItem.storageWarning ? (
                    <Text color="yellow" bold>
                      ⚠️ Storage: {selectedItem.storageWarning}
                    </Text>
                  ) : (
                    <Text color="green">
                      ✔ Storage: {selectedItem.game.storage_gb} GB OK ({hardware.storage.primaryMount.mount} {hardware.storage.primaryMount.freeGb} GB free)
                      {selectedItem.game.requires_ssd ? (hardware.storage.primaryMount.isSsd ? ' • SSD OK' : ' • ⚠️ SSD Required') : ''}
                    </Text>
                  )}
                </Box>

                {/* Line 6: Bottlenecks / Upgrade Notice */}
                <Box>
                  {selectedItem.bottlenecks.length > 0 ? (
                    <Text color="yellow">
                      ⚠️ Bottleneck: {selectedItem.bottlenecks[0]}
                    </Text>
                  ) : (
                    <Text color="green">
                      ✔ Specs meet or exceed minimum hardware requirements
                    </Text>
                  )}
                </Box>

                {/* Line 7: Store Links & Scorecard Hint */}
                <Box justifyContent="space-between">
                  <Text color="white">
                    Store:{' '}
                    {selectedItem.game.steam_appid ? (
                      <Text color="blue">Steam: {terminalLink('Store Page', selectedItem.game.steam_url)} </Text>
                    ) : (
                      <Text color="gray">No Steam </Text>
                    )}
                    {selectedItem.game.epic_url ? (
                      <Text color="magenta">• Epic: {terminalLink('Epic Store', selectedItem.game.epic_url)}</Text>
                    ) : null}
                  </Text>
                  <Text color="yellow">[Enter: Full Scorecard]</Text>
                </Box>
              </>
            ) : (
              <Box><Text color="gray">No game selected.</Text></Box>
            )}
          </Box>
        </Box>
      ) : (
        /* WIDE VIEW (>=102 cols): Side-by-Side Panels with generous column widths */
        <Box flexDirection="row">
          {/* Game List Panel */}
          <Box flexDirection="column" width={leftColWidth} borderStyle="single" borderColor="gray" paddingX={1}>
            <Box justifyContent="space-between">
              <Text bold color="white">Games ({filtered.length})</Text>
              <Text color="gray">{filtered.length > 0 ? `${safeSelectedIndex + 1}/${filtered.length}` : '0/0'}</Text>
            </Box>
            {visibleGames.length === 0 ? (
              <>
                <Box><Text color="gray">No games match query.</Text></Box>
                <Box><Text color="cyan">Press [/] to change search</Text></Box>
                <Box><Text> </Text></Box>
                <Box><Text> </Text></Box>
                <Box><Text> </Text></Box>
                <Box><Text> </Text></Box>
              </>
            ) : (
              <>
                {visibleGames.map((item, idx) => {
                  const actualIdx = startIdx + idx;
                  const isSelected = actualIdx === safeSelectedIndex;
                  let tierBadge = 'High';
                  let tierColor: any = 'green';
                  if (item.tier === 'Medium Settings') {
                    tierBadge = 'Med';
                    tierColor = 'blue';
                  } else if (item.tier === 'Low Settings') {
                    tierBadge = 'Low';
                    tierColor = 'yellow';
                  } else if (item.tier === 'Bottlenecked') {
                    tierBadge = 'B-Neck';
                    tierColor = 'red';
                  }

                  return (
                    <Box key={item.game.id} justifyContent="space-between">
                      <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                        {isSelected ? '▶ ' : '  '}
                        {item.game.name}
                        {item.game.status === 'Coming Soon' ? <Text color="magenta"> ★</Text> : ''}
                      </Text>
                      <Text color={tierColor} bold={isSelected}>
                        [{tierBadge} {item.estimatedFps}f]
                      </Text>
                    </Box>
                  );
                })}
                {/* Pad remaining slots */}
                {Array.from({ length: emptySlots }).map((_, idx) => (
                  <Box key={`pad-w-${idx}`}><Text> </Text></Box>
                ))}
              </>
            )}
            <Box justifyContent="space-between">
              <Text color="gray">▲/▼ Nav</Text>
              <Text color="gray">[PgUp/Dn: ±{windowSize}]</Text>
            </Box>
          </Box>

          {/* Selected Game Details Panel */}
          <Box flexDirection="column" width={rightColWidth} borderStyle="single" borderColor="cyan" paddingX={1} marginLeft={1}>
            {selectedItem ? (
              <>
                {/* Line 1: Title & Status */}
                <Box justifyContent="space-between">
                  <Text bold color="white">
                    {selectedItem.game.name}{' '}
                    <Text color="gray">({selectedItem.game.release_year})</Text>
                  </Text>
                  {selectedItem.game.status === 'Coming Soon' ? (
                    <Text color="magenta" bold>[COMING SOON]</Text>
                  ) : (
                    <Text color="gray">ID: {selectedItem.game.id}</Text>
                  )}
                </Box>

                {/* Line 2: Verdict & Gauge */}
                <Box justifyContent="space-between">
                  <Text bold color="white">
                    Verdict: <Text color={
                      selectedItem.tier === 'High Performance' ? 'green' :
                      selectedItem.tier === 'Medium Settings' ? 'blue' :
                      selectedItem.tier === 'Low Settings' ? 'yellow' : 'red'
                    } bold>{selectedItem.tier}</Text>
                  </Text>
                  <Text>
                    {renderGaugeBar(selectedItem.estimatedFps, 100, Math.max(8, Math.min(14, rightColWidth - 45)))}{' '}
                    <Text color="gray">{selectedItem.estimatedFps} FPS</Text>
                  </Text>
                </Box>

                {/* Line 3: Community & iGPU Feasibility */}
                <Box>
                  <Text color="cyan" bold>✨ </Text>
                  <Text color="white">
                    {selectedItem.communityNote || selectedItem.game.community_notes || selectedItem.communityBadge || 'Playable on modern hardware'}
                  </Text>
                </Box>

                {/* Line 4: Requirements Breakdown */}
                <Box>
                  <Text color="gray">
                    Min: RAM {selectedItem.game.min_ram_gb} GB • GPU: {selectedItem.game.min_gpu} • {selectedItem.game.directx || 'DX11'}
                  </Text>
                </Box>

                {/* Line 5: Storage & Media */}
                <Box>
                  {selectedItem.storageWarning ? (
                    <Text color="yellow" bold>
                      ⚠️ {selectedItem.storageWarning}
                    </Text>
                  ) : (
                    <Text color="green">
                      ✔ Storage: {selectedItem.game.storage_gb} GB OK ({hardware.storage.primaryMount.mount} {hardware.storage.primaryMount.freeGb} GB free)
                      {selectedItem.game.requires_ssd ? (hardware.storage.primaryMount.isSsd ? ' • SSD OK' : ' • ⚠️ SSD Req') : ''}
                    </Text>
                  )}
                </Box>

                {/* Line 6: Bottlenecks or Status */}
                <Box>
                  {selectedItem.bottlenecks.length > 0 ? (
                    <Text color="yellow">
                      ⚠️ {selectedItem.bottlenecks[0]}
                    </Text>
                  ) : (
                    <Text color="green">
                      ✔ Specs meet or exceed minimum requirements
                    </Text>
                  )}
                </Box>

                {/* Line 7: Upscalers / Tech */}
                <Box justifyContent="space-between">
                  <Text color="white">
                    Tech:{' '}
                    {selectedItem.game.supports_fsr && <Text color="green">[FSR] </Text>}
                    {selectedItem.game.supports_xess && <Text color="blue">[XeSS] </Text>}
                    {selectedItem.game.supports_dlss && <Text color="cyan">[DLSS] </Text>}
                    {!selectedItem.game.supports_fsr && !selectedItem.game.supports_xess && !selectedItem.game.supports_dlss && (
                      <Text color="gray">Native 1080p </Text>
                    )}
                  </Text>
                  <Text color="gray">Min: ~{selectedItem.game.min_gpu_g3d || 'N/A'} G3D</Text>
                </Box>

                {/* Line 8: Store Links */}
                <Box justifyContent="space-between">
                  <Text color="white">
                    Store:{' '}
                    {selectedItem.game.steam_appid ? (
                      <Text color="blue">Steam: {terminalLink('Store Page', selectedItem.game.steam_url)} </Text>
                    ) : (
                      <Text color="gray">No Steam </Text>
                    )}
                    {selectedItem.game.epic_url ? (
                      <Text color="magenta">• Epic: {terminalLink('Epic Store', selectedItem.game.epic_url)}</Text>
                    ) : null}
                  </Text>
                  <Text color="yellow">[Enter: Full Scorecard]</Text>
                </Box>
              </>
            ) : (
              <Box><Text color="gray">No game selected.</Text></Box>
            )}
          </Box>
        </Box>
      )}

      {/* Navigation Footer */}
      <Box justifyContent="space-between" marginY={0}>
        <Text color="gray">
          [↑/↓] Select • [Tab] Tier • [/] Search • [s] Sort • [Enter] Full Scorecard • [q] Quit
        </Text>
        <Text color="gray">{compatibilities.length} Curated Games</Text>
      </Box>
    </Box>
  );
};
