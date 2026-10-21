import chalk from 'chalk';
import Table from 'cli-table3';
import { GameCompatibility, HardwareProfile, PerformanceTier } from './types.js';

// OSC 8 terminal clickable hyperlink
export function terminalLink(text: string, url: string): string {
  if (!url) return text;
  return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;
}

// Strip ANSI color codes and OSC 8 sequences to measure visible character length
export function stripAnsi(str: string): string {
  return str
    .replace(/\u001B\]8;;.*?\u0007(.*?)\u001B\]8;;\u0007/g, '$1')
    .replace(/\u001B\[[0-9;]*[a-zA-Z]/g, '');
}

export function visibleWidth(str: string): number {
  return stripAnsi(str).length;
}

// Safely obtain terminal columns clamped to readable boundaries
export function getTerminalWidth(): number {
  const cols = process.stdout.columns || 100;
  return Math.max(72, Math.min(cols, 140));
}

// Visual ASCII gauge bar for FPS and percentages
export function renderGaugeBar(current: number, max: number = 100, width: number = 12): string {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filledCount = Math.round(ratio * width);
  const emptyCount = width - filledCount;

  let colorFn = chalk.green;
  if (current < 30) colorFn = chalk.red;
  else if (current < 45) colorFn = chalk.yellow;
  else if (current < 60) colorFn = chalk.cyan;
  else colorFn = chalk.green;

  const filledStr = '█'.repeat(filledCount);
  const emptyStr = '░'.repeat(emptyCount);
  return colorFn(filledStr) + chalk.gray(emptyStr);
}

// Visual Tier Badge
export function formatTierBadge(tier: PerformanceTier): string {
  switch (tier) {
    case 'High Performance':
      return chalk.green.bold('✔ High (60+ FPS)');
    case 'Medium Settings':
      return chalk.cyan.bold('● Medium (45-60 FPS)');
    case 'Low Settings':
      return chalk.yellow.bold('▲ Low (30-45 FPS)');
    case 'Bottlenecked':
    default:
      return chalk.red.bold('✖ Bottlenecked (<30 FPS)');
  }
}

// Formats a line inside a card box ensuring exact padding and matching right border
export function formatBoxRow(content: string, cardWidth: number, borderFn = chalk.cyan): string {
  const innerWidth = cardWidth - 4; // 2 for left '│ ', 2 for right ' │'
  const vLen = visibleWidth(content);

  if (vLen > innerWidth) {
    const lines = wrapTextToWidth(content, innerWidth);
    return lines.map(line => {
      const lineLen = visibleWidth(line);
      const pad = ' '.repeat(Math.max(0, innerWidth - lineLen));
      return borderFn('│ ') + line + pad + borderFn(' │');
    }).join('\n');
  }

  const pad = ' '.repeat(Math.max(0, innerWidth - vLen));
  return borderFn('│ ') + content + pad + borderFn(' │');
}

// Wrap text neatly for boxes without truncating or losing words
export function wrapTextToWidth(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (visibleWidth(candidate) <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) lines.push(currentLine);
      if (visibleWidth(word) > maxWidth) {
        let remaining = word;
        while (visibleWidth(remaining) > maxWidth) {
          lines.push(remaining.slice(0, maxWidth));
          remaining = remaining.slice(maxWidth);
        }
        currentLine = remaining;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Modern Hardware Profile Banner (Responsive, Closed Box)
export function printHardwareBanner(hw: HardwareProfile): void {
  const cardWidth = Math.min(getTerminalWidth(), 98);

  const topBorder = chalk.cyan('╭' + '─'.repeat(cardWidth - 2) + '╮');
  const midDivider = chalk.cyan('├' + '─'.repeat(cardWidth - 2) + '┤');
  const botBorder = chalk.cyan('╰' + '─'.repeat(cardWidth - 2) + '╯');

  const titleLine = `◆ ${chalk.bold.white('PC GAME SCOUT')} ${chalk.gray('|')} ${chalk.cyan('Hardware Diagnostic & Game Engine')}`;

  const osInfo = `${hw.os.distro} ${chalk.gray(`(Build ${hw.os.build || 'N/A'}, ${hw.os.arch})`)}`;
  const cpuInfo = `${hw.cpu.brand} ${chalk.gray(`(${hw.cpu.physicalCores}C / ${hw.cpu.threads}T @ ${hw.cpu.speedGhz} GHz)`)}`;

  const ramChanBadge = hw.ram.channels === 'Dual-Channel'
    ? chalk.bgGreen.black.bold(' DUAL-CHANNEL ')
    : chalk.bgYellow.black.bold(' SINGLE-CHANNEL ');
  const ramInfo = `${hw.ram.totalGb} GB ${hw.ram.generation}-${hw.ram.speedMhz} MHz  ${ramChanBadge}`;

  const gpuTypeBadge = hw.gpu.isIntegrated
    ? chalk.bgMagenta.white.bold(' INTEGRATED iGPU ')
    : chalk.bgGreen.black.bold(' DEDICATED dGPU ');
  const gpuInfo = `${hw.gpu.model} ${chalk.gray(`(${hw.gpu.vramGb} GB VRAM, ~${hw.gpu.estimatedG3d} G3D)`)}  ${gpuTypeBadge}`;

  const primary = hw.storage.primaryMount;
  const ssdBadge = primary.isSsd
    ? chalk.bgGreen.black.bold(' NVMe/SSD ')
    : chalk.bgYellow.black.bold(' HDD ');
  const storageInfo = `${primary.mount} ${primary.freeGb} GB free of ${primary.totalGb} GB  ${ssdBadge}`;

  console.log('\n' + topBorder);
  console.log(formatBoxRow(titleLine, cardWidth));
  console.log(midDivider);
  console.log(formatBoxRow(`${chalk.bold.cyan('OS'.padEnd(9))}: ${osInfo}`, cardWidth));
  console.log(formatBoxRow(`${chalk.bold.cyan('CPU'.padEnd(9))}: ${cpuInfo}`, cardWidth));
  console.log(formatBoxRow(`${chalk.bold.cyan('RAM'.padEnd(9))}: ${ramInfo}`, cardWidth));
  console.log(formatBoxRow(`${chalk.bold.cyan('GPU'.padEnd(9))}: ${gpuInfo}`, cardWidth));
  console.log(formatBoxRow(`${chalk.bold.cyan('STORAGE'.padEnd(9))}: ${storageInfo}`, cardWidth));
  console.log(botBorder);

  // iGPU Bandwidth Warning Notice
  if (hw.gpu.isIntegrated && hw.ram.channels === 'Single-Channel') {
    const warnTop = chalk.yellow('╭─ ⚠️  HARDWARE NOTICE ' + '─'.repeat(cardWidth - 24) + '╮');
    const warnBot = chalk.yellow('╰' + '─'.repeat(cardWidth - 2) + '╯');
    console.log(warnTop);
    console.log(formatBoxRow(`${chalk.bold.yellow('Single-channel RAM detected!')} Shared memory throttles iGPU FPS by ~40%.`, cardWidth, chalk.yellow));
    console.log(formatBoxRow(chalk.white('Recommendation: Add a 2nd matching RAM stick to activate Dual-Channel bandwidth.'), cardWidth, chalk.yellow));
    console.log(warnBot);
  }
  console.log('');
}

// Render responsive, modern games table with zero horizontal wrapping
export function renderGamesTable(results: GameCompatibility[]): void {
  const termWidth = getTerminalWidth();

  // 1. Wide View (>= 115 cols): 6 full columns
  if (termWidth >= 115) {
    const borders = 7;
    const avail = termWidth - borders;
    const wGame = Math.max(24, Math.floor(avail * 0.24));
    const wTier = 18;
    const wFps = 10;
    const wComm = Math.max(26, Math.floor(avail * 0.28));
    const wStorage = 18;
    const wStore = Math.max(14, avail - (wGame + wTier + wFps + wComm + wStorage));

    const table = new Table({
      head: [
        chalk.cyan.bold('Game / Release'),
        chalk.cyan.bold('Tier'),
        chalk.cyan.bold('FPS'),
        chalk.cyan.bold('Community / iGPU Notes'),
        chalk.cyan.bold('Storage'),
        chalk.cyan.bold('Store Links'),
      ],
      colWidths: [wGame, wTier, wFps, wComm, wStorage, wStore],
      wordWrap: true,
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│'
      },
      style: { head: [], border: ['gray'] },
    });

    for (const r of results) {
      let nameCol = chalk.bold.white(r.game.name);
      if (r.game.status === 'Coming Soon') {
        nameCol += ' ' + chalk.bgMagenta.white.bold(' COMING SOON ');
      }
      nameCol += `\n${chalk.gray(`${r.game.release_year} • ${r.game.storage_gb} GB`)}`;

      const tierCol = formatTierBadge(r.tier);
      const fpsCol = `${chalk.bold(r.estimatedFps)} ${chalk.gray('FPS')}\n${renderGaugeBar(r.estimatedFps, 100, 6)}`;

      let commCol = '';
      if (r.communityBadge) commCol += `${chalk.cyan.bold(r.communityBadge)}\n`;
      if (r.communityNote) commCol += chalk.white(r.communityNote);
      else if (r.bottlenecks.length > 0) commCol += chalk.red(r.bottlenecks[0]);
      else commCol += chalk.gray('Meets official specs.');

      let storageCol = chalk.green(`✔ ${r.game.storage_gb} GB OK`);
      if (r.storageWarning) storageCol = chalk.yellow.bold(`⚠️ ${r.storageWarning}`);
      if (r.ssdWarning) storageCol += `\n${chalk.red('⚠️ SSD Req')}`;

      const steamText = r.game.steam_appid
        ? terminalLink(chalk.blue.underline('Steam'), r.game.steam_url)
        : chalk.gray('No Steam');
      const epicText = r.game.epic_url
        ? terminalLink(chalk.magenta.underline('Epic'), r.game.epic_url)
        : chalk.gray('No Epic');
      const storeCol = `${steamText}\n${epicText}`;

      table.push([nameCol, tierCol, fpsCol, commCol, storageCol, storeCol]);
    }
    console.log(table.toString());
    return;
  }

  // 2. Medium View (92 - 114 cols): 5 columns (store link embedded in title)
  if (termWidth >= 92) {
    const borders = 6;
    const avail = termWidth - borders;
    const wGame = Math.max(22, Math.floor(avail * 0.28));
    const wTier = 16;
    const wFps = 10;
    const wComm = Math.max(22, Math.floor(avail * 0.32));
    const wStorage = Math.max(14, avail - (wGame + wTier + wFps + wComm));

    const table = new Table({
      head: [
        chalk.cyan.bold('Game / Store Link'),
        chalk.cyan.bold('Tier'),
        chalk.cyan.bold('FPS'),
        chalk.cyan.bold('Community / iGPU Notes'),
        chalk.cyan.bold('Storage'),
      ],
      colWidths: [wGame, wTier, wFps, wComm, wStorage],
      wordWrap: true,
      chars: {
        'top': '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
        'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
        'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
        'right': '│', 'right-mid': '┤', 'middle': '│'
      },
      style: { head: [], border: ['gray'] },
    });

    for (const r of results) {
      const linkedTitle = terminalLink(chalk.bold.white(r.game.name), r.game.steam_url || r.game.epic_url);
      let nameCol = linkedTitle;
      if (r.game.status === 'Coming Soon') {
        nameCol += ' ' + chalk.bgMagenta.white.bold(' SOON ');
      }
      nameCol += `\n${chalk.gray(`${r.game.release_year} • ${r.game.storage_gb} GB`)}`;

      const tierCol = formatTierBadge(r.tier);
      const fpsCol = `${chalk.bold(r.estimatedFps)} ${chalk.gray('FPS')}\n${renderGaugeBar(r.estimatedFps, 100, 6)}`;

      let commCol = '';
      if (r.communityBadge) commCol += `${chalk.cyan.bold(r.communityBadge)}\n`;
      if (r.communityNote) commCol += chalk.white(r.communityNote);
      else if (r.bottlenecks.length > 0) commCol += chalk.red(r.bottlenecks[0]);
      else commCol += chalk.gray('Meets official specs.');

      let storageCol = chalk.green(`✔ ${r.game.storage_gb} GB`);
      if (r.storageWarning) storageCol = chalk.yellow(`⚠️ Need space`);
      if (r.ssdWarning) storageCol += `\n${chalk.red('⚠️ SSD')}`;

      table.push([nameCol, tierCol, fpsCol, commCol, storageCol]);
    }
    console.log(table.toString());
    return;
  }

  // 3. Compact View (< 92 cols, down to 72 cols): 4 columns
  const borders = 5;
  const avail = termWidth - borders;
  const wGame = Math.max(20, Math.floor(avail * 0.32));
  const wVerdict = 18;
  const wComm = Math.max(18, Math.floor(avail * 0.28));
  const wStorage = Math.max(12, avail - (wGame + wVerdict + wComm));

  const table = new Table({
    head: [
      chalk.cyan.bold('Game'),
      chalk.cyan.bold('Verdict'),
      chalk.cyan.bold('Community / iGPU'),
      chalk.cyan.bold('Storage'),
    ],
    colWidths: [wGame, wVerdict, wComm, wStorage],
    wordWrap: true,
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│'
    },
    style: { head: [], border: ['gray'] },
  });

  for (const r of results) {
    const linkedTitle = terminalLink(chalk.bold.white(r.game.name), r.game.steam_url || r.game.epic_url);
    let nameCol = linkedTitle + `\n${chalk.gray(`${r.game.release_year}`)}`;

    const verdictCol = `${formatTierBadge(r.tier)}\n${chalk.bold(r.estimatedFps)} FPS ${renderGaugeBar(r.estimatedFps, 100, 5)}`;

    let commCol = r.communityBadge ? chalk.cyan(r.communityBadge) : (r.communityNote ? chalk.white(r.communityNote) : chalk.gray('Meets spec'));
    let storageCol = r.storageWarning ? chalk.yellow('⚠️ Short') : chalk.green(`✔ ${r.game.storage_gb}GB`);

    table.push([nameCol, verdictCol, commCol, storageCol]);
  }
  console.log(table.toString());
}

// Detailed Game Compatibility Scorecard for single lookup or --card mode
export function renderGameCard(r: GameCompatibility, hw: HardwareProfile): void {
  const cardWidth = Math.min(getTerminalWidth(), 96);
  const innerWidth = cardWidth - 4;

  const topBorder = chalk.cyan('╭' + '─'.repeat(cardWidth - 2) + '╮');
  const midDivider = chalk.cyan('├' + '─'.repeat(cardWidth - 2) + '┤');
  const botBorder = chalk.cyan('╰' + '─'.repeat(cardWidth - 2) + '╯');

  console.log('\n' + topBorder);

  // Header: Game Title, Release, Status
  const statusBadge = r.game.status === 'Coming Soon'
    ? chalk.bgMagenta.white.bold(' COMING SOON ')
    : chalk.bgGreen.black.bold(' RELEASED ');
  const headerLine = `◆ ${chalk.bold.white(r.game.name)} ${chalk.gray(`(${r.game.release_year})`)}  ${statusBadge}`;
  console.log(formatBoxRow(headerLine, cardWidth));
  console.log(midDivider);

  // Verdict & FPS
  const fpsGauge = renderGaugeBar(r.estimatedFps, 100, 16);
  console.log(formatBoxRow(`${chalk.bold('Verdict:')}       ${formatTierBadge(r.tier)} (~${chalk.bold(r.estimatedFps)} FPS)`, cardWidth));
  console.log(formatBoxRow(`${chalk.bold('FPS Gauge:')}     ${fpsGauge} ${chalk.gray(`[${r.estimatedFps} FPS estimated]`)}`, cardWidth));

  // Technology Tags
  const techPills = [];
  if (r.game.directx) techPills.push(chalk.cyan(`[${r.game.directx}]`));
  if (r.game.supports_fsr) techPills.push(chalk.green('[AMD FSR]'));
  if (r.game.supports_xess) techPills.push(chalk.blue('[Intel XeSS]'));
  if (r.game.supports_dlss) techPills.push(chalk.green('[NVIDIA DLSS]'));
  if (techPills.length > 0) {
    console.log(formatBoxRow(`${chalk.bold('Technologies:')}  ${techPills.join(' ')}`, cardWidth));
  }

  console.log(midDivider);
  console.log(formatBoxRow(chalk.bold.cyan('HARDWARE SPECIFICATION EVALUATION'), cardWidth));

  // Component Checklist
  const check = r.specCheck;
  if (check) {
    const mark = (passed: boolean) => (passed ? chalk.green.bold('✔ PASSED ') : chalk.red.bold('✖ DEFICIT'));
    console.log(formatBoxRow(`  ${chalk.bold('CPU:')}     ${mark(check.cpu.passed)}  ${chalk.white(check.cpu.detected)} ${chalk.gray(`(Min: ${check.cpu.required})`)}`, cardWidth));
    console.log(formatBoxRow(`  ${chalk.bold('GPU:')}     ${mark(check.gpu.passed)}  ${chalk.white(check.gpu.detected)} ${chalk.gray(`(~${check.gpu.effectiveG3d} vs Min ${check.gpu.minG3d} G3D)`)}`, cardWidth));
    console.log(formatBoxRow(`  ${chalk.bold('RAM:')}     ${mark(check.ram.passed)}  ${chalk.white(check.ram.message)}`, cardWidth));
    console.log(formatBoxRow(`  ${chalk.bold('VRAM:')}    ${mark(check.vram.passed)}  ${chalk.white(check.vram.message)}`, cardWidth));
    console.log(formatBoxRow(`  ${chalk.bold('Storage:')} ${mark(check.storage.passed)}  ${chalk.white(check.storage.message)}`, cardWidth));
    console.log(formatBoxRow(`  ${chalk.bold('Media:')}   ${mark(check.ssd.passed)}  ${chalk.white(check.ssd.message)}`, cardWidth));
  }

  // Community & iGPU Wisdom
  if (r.communityBadge || r.communityNote || r.game.community_notes) {
    console.log(midDivider);
    console.log(formatBoxRow(`${chalk.bold.magenta('COMMUNITY & iGPU VERDICT')} ${chalk.gray('(r/lowspecgamer insights)')}`, cardWidth));
    if (r.communityBadge) {
      console.log(formatBoxRow(`  ${chalk.cyan.bold(r.communityBadge)}`, cardWidth));
    }
    const note = r.communityNote || r.game.community_notes;
    if (note) {
      const wrapped = wrapTextToWidth(note, innerWidth - 4);
      for (const line of wrapped) {
        console.log(formatBoxRow(`  ${chalk.white(line)}`, cardWidth));
      }
    }
  }

  // Bottlenecks & Fixes
  if (r.bottlenecks.length > 0) {
    console.log(midDivider);
    console.log(formatBoxRow(chalk.bold.red('⚠️  DETECTED HARDWARE BOTTLENECKS'), cardWidth));
    for (const b of r.bottlenecks) {
      const wrapped = wrapTextToWidth(`• ${b}`, innerWidth - 4);
      for (const line of wrapped) {
        console.log(formatBoxRow(`  ${chalk.yellow(line)}`, cardWidth));
      }
    }
  }

  // Store Links
  console.log(midDivider);
  console.log(formatBoxRow(chalk.bold('STORE & INSTALLATION LINKS'), cardWidth));
  if (r.game.steam_appid) {
    console.log(formatBoxRow(`  ${chalk.blue.bold('Steam:')} ${terminalLink(chalk.blue.underline(r.game.steam_url), r.game.steam_url)}`, cardWidth));
  } else {
    console.log(formatBoxRow(`  ${chalk.gray('Steam: Not listed on Steam')}`, cardWidth));
  }
  if (r.game.epic_url) {
    console.log(formatBoxRow(`  ${chalk.magenta.bold('Epic:')}  ${terminalLink(chalk.magenta.underline(r.game.epic_url), r.game.epic_url)}`, cardWidth));
  }

  console.log(botBorder + '\n');
}

// Summary Card for quick statistics
export function printSummaryCard(summary: any, hw: HardwareProfile): void {
  const cardWidth = Math.min(getTerminalWidth(), 96);

  const topBorder = chalk.cyan('╭' + '─'.repeat(cardWidth - 2) + '╮');
  const midDivider = chalk.cyan('├' + '─'.repeat(cardWidth - 2) + '┤');
  const botBorder = chalk.cyan('╰' + '─'.repeat(cardWidth - 2) + '╯');

  console.log('\n' + topBorder);
  console.log(formatBoxRow(`📊 ${chalk.bold.white('PC GAME SCOUT | Compatibility Summary')}`, cardWidth));
  console.log(midDivider);
  console.log(formatBoxRow(`Total Games Evaluated:  ${chalk.bold.white(summary.total_games_scanned || summary.total_scanned)}`, cardWidth));
  console.log(formatBoxRow(`Matching Search Query:  ${chalk.bold.cyan(summary.matched_games || summary.total_matched)}`, cardWidth));
  console.log(midDivider);
  console.log(formatBoxRow(`${chalk.green.bold('✔ High Performance (60+ FPS):')}  ${summary.high_performance}`, cardWidth));
  console.log(formatBoxRow(`${chalk.cyan.bold('● Medium Settings (45-60 FPS):')} ${summary.medium_settings}`, cardWidth));
  console.log(formatBoxRow(`${chalk.yellow.bold('▲ Low Settings (30-45 FPS):')}    ${summary.low_settings}`, cardWidth));
  console.log(formatBoxRow(`${chalk.red.bold('✖ Bottlenecked (<30 FPS):')}      ${summary.bottlenecked}`, cardWidth));
  console.log(formatBoxRow(`${chalk.magenta.bold('★ Upcoming Blockbusters:')}       ${summary.coming_soon}`, cardWidth));
  console.log(botBorder + '\n');
}
