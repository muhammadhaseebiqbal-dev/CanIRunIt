# 🎮 PC Game Scout (CanIRunIt CLI)

> **Free, Open-Source Terminal CLI Application** for Windows gamers and automated pipelines. Deeply scans your hardware and matches it against a curated library of **5,500+ popular, latest, and upcoming games**—powered by a **Real-World Community & iGPU Feasibility Engine** inspired by benchmarks from Reddit and `r/lowspecgamer`.

---

## 🌟 Key Features

1. **Deep Windows Hardware Diagnostics**:
   - **OS**: Windows Build detection, version, and architecture.
   - **CPU**: Model, physical cores, logical threads, base & current clock speeds.
   - **GPU**: Dedicated vs. Integrated (iGPU) classification, dedicated VRAM, and PassMark G3D benchmark score.
   - **RAM**: Total capacity, **DDR4 vs. DDR5 generation**, clock speed in MHz, and channel configuration (**Dual-Channel vs. Single-Channel**).
   - **Storage**: Real-time mount inspection (C:, D:, E:), NVMe/SSD vs HDD detection, and exact available free space in GB.

2. **Vast Curated Library (5,500+ Games)**:
   - Sourced from SteamSpy Top 5,000 + PCGameBenchmarks database + Steam Storefront API.
   - **Upcoming Blockbusters Tagged with `[Coming Soon]`**:
     - *Grand Theft Auto VI (GTA 6)*
     - *DOOM: The Dark Ages*
     - *Borderlands 4*
     - *Monster Hunter Wilds*
     - *Sid Meier's Civilization VII*
     - *Mafia: The Old Country*
     - *Death Stranding 2: On the Beach*
     - *The Witcher 4 (Polaris)*
     - *The Elder Scrolls VI*
     - *Fable*, *Subnautica 2*, *Judas*, *Metal Gear Solid Delta*, *Crimson Desert*, and more!

3. **Real-World Community & iGPU Feasibility Algorithm (`r/lowspecgamer`)**:
   - Overrides lazy publisher spec rejections (e.g. games claiming dGPU minimum when modern iGPUs run them smoothly).
   - **Memory Bandwidth Scaling**: iGPUs share system memory bandwidth. The engine dynamically scales effective graphics performance:
     - **Dual-Channel DDR5 @ 6000+ MHz**: +20% memory bandwidth boost.
     - **Dual-Channel DDR5 @ 4800–5600 MHz**: +10% boost.
     - **Single-Channel DDR5**: -20% bandwidth penalty.
     - **Dual-Channel DDR4 @ 3200+ MHz**: 1.0x baseline.
     - **Single-Channel DDR4**: -40% severe memory starvation penalty + hardware bottleneck warning!
   - **Upscaler Scaling (AMD FSR & Intel XeSS)**: Incorporates 720p/900p Balanced upscaler multipliers for modern titles, surfacing actionable tags like `[Playable on iGPU with FSR/720p]`.

4. **Real-Time Storage Warnings**:
   - Detects if a game requires more disk space than the user currently has free:
     `⚠️ Requires 150 GB, only 4.9 GB available on C: (Need 145.1 GB more)`
   - Detects games requiring high-speed SSDs vs. legacy spinning HDDs.

5. **Direct Clickable Store Links**:
   - Direct OSC 8 terminal clickable hyperlinks for **Steam Store** and **Epic Games Store**.

6. **Dual-Mode Architecture & Senior CLI Ergonomics**:
   - **Interactive Ink Dashboard**: Color-rich React terminal dashboard with flexbox boxes, tier tabs, live search, and keyboard navigation.
   - **Machine-Readable `--json` Mode**: Pure structured JSON output adhering to schema `v1.1.0` with token-conscious pagination, spec breakdown, and error codes for AI agents and scripts.
   - **Detailed Spec Scorecards (`--card`)**: Visual component-by-component pass/fail inspection and ASCII FPS gauge bars.

---

## 🚀 Quick Start

### 1. Run Instantly with `npx` (Zero Installation)
```bash
# Launch interactive dashboard
npx pc-game-scout

# Or test any game instantly
npx canirunit "Cyberpunk 2077"
npx canirunit "GTA VI"
npx canirunit scan
```

### 2. Global Installation
```bash
npm install -g pc-game-scout

# Run anywhere from any terminal directory:
canirunit
pc-game-scout
```

### 3. Local Development Setup
```bash
# Clone the repository
git clone https://github.com/mhaseeb/pc-game-scout.git
cd pc-game-scout

# Install dependencies
npm install

# Build the TypeScript project
npm run build
```

---

## 🕹️ Usage & Examples

### 1. Interactive Dashboard (Default TTY mode)
Launch the interactive React Ink dashboard with full navigation, tier tabs, and live search:
```bash
node dist/index.js
# Or with npm start
npm start
```
- **Controls**: `[↑/↓]` Navigate • `[PgUp/Dn]` Jump 10 • `[Tab]` Cycle Tiers • `[s]` Cycle Sort • `[/]` Live Search • `[Esc]` Clear Search / Back • `[q]` Quit

### 2. Instant Game Check (Spec Scorecard & Acronym Resolution)
Check any game directly with detailed component verification and intelligent gaming alias resolution (e.g. GTA VI, RDR2, CP2077, CS2, BG3, GOW):
```bash
# Natural gaming acronyms (resolves to Grand Theft Auto VI, Red Dead Redemption 2, etc.)
node dist/index.js "GTA VI"
node dist/index.js "RDR2"
node dist/index.js "CP2077"

# Or with dedicated check subcommand
node dist/index.js check "GTA 6"
node dist/index.js check "Baldur's Gate 3"
node dist/index.js check "Elden Ring"
```

### 3. Hardware Diagnostic Scan
Deeply inspect CPU cores, GPU architecture, RAM channel bandwidth, and NVMe mounts:
```bash
node dist/index.js scan
```

### 4. Search and Filter Library
```bash
# Search games in modern table view
node dist/index.js -s "Witcher" --table

# Filter by tier (high, medium, low, bottleneck, coming-soon)
node dist/index.js -t high --limit 20
node dist/index.js -t coming-soon

# Filter by minimum FPS and sort by FPS or release year
node dist/index.js --min-fps 60 --sort fps --order desc
node dist/index.js -t low --igpu-only

# Target a specific storage drive (e.g. Drive D:)
node dist/index.js check "Black Myth: Wukong" --drive D
```

### 5. AI Agent & Automation Friendly Mode (`--json`)
Consumable by AI agents (e.g., Antigravity, AutoGPT, Claude, OpenAI), headless scripts, and CI/CD:
```bash
# Evaluates game with detailed spec_check JSON output
node dist/index.js check "Cyberpunk 2077" --json

# Retrieve hardware scan in pure JSON
node dist/index.js scan --json

# Compact summary statistics only (token-efficient for LLMs)
node dist/index.js --json --summary-only

# Controlled pagination to avoid token overflow
node dist/index.js --json -s "rpg" --limit 10 --offset 0

# Filter by tier (accepts short or full name: high, 'High Performance', medium, low, bottleneck, coming-soon)
node dist/index.js --json -t "High Performance" --limit 5
```

---

## 📂 Project Structure

```
CanIRunIt/
├── data/
│   ├── raw/
│   │   ├── pcgamebenchmarks_games.csv   # 17,400+ games dataset with FPS benchmarks
│   │   ├── pcgamebenchmarks_gpus.csv    # GPU G3D benchmark scores
│   │   └── steamspy_top5000.json        # SteamSpy Top 5,000 games
│   ├── games_database.json              # Curated 5,500 games library
│   └── games_database.min.json          # Minified 5,500 games database
├── scripts/
│   ├── fetch_datasets.py                # Automated data download pipeline
│   ├── build_curated_game_library.py    # Merging, enrichment & curation pipeline
│   └── verify_library.py                # Database validation & inspection
├── src/
│   ├── components/
│   │   └── Dashboard.tsx                # React Ink interactive terminal dashboard
│   ├── cli.ts                           # CLI command configuration
│   ├── database.ts                      # Fast in-memory game database loader
│   ├── engine.ts                        # Real-World Community & iGPU Feasibility Engine
│   ├── hardware.ts                      # Deep Windows hardware scanner
│   ├── types.ts                         # TypeScript data contracts & interfaces
│   ├── ui.ts                            # CLI tables, formatting & OSC 8 links
│   └── index.tsx                        # Main CLI entry point
├── LICENSE
├── package.json
└── tsconfig.json
```

---

## 📜 License
MIT License. Free and open source for all gamers and developers.
