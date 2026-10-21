import os
import subprocess

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\EdgeCore\155.0.4283.62\msedge.exe"

DASHBOARD_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #06090e;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 24px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    -webkit-font-smoothing: antialiased;
  }
  .window {
    width: 1080px;
    background: #0b0f17;
    border-radius: 12px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85), 0 0 0 1px #30363d;
    overflow: hidden;
  }
  .titlebar {
    background: #161b22;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #21262d;
  }
  .dots {
    display: flex;
    gap: 8px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .dot.red { background: #ff5f56; }
  .dot.yellow { background: #ffbd2e; }
  .dot.green { background: #27c93f; }
  .title {
    flex: 1;
    text-align: center;
    color: #8b949e;
    font-size: 13px;
    font-weight: 600;
    margin-right: 48px;
    letter-spacing: 0.5px;
  }
  .terminal-body {
    padding: 22px 26px;
    color: #c9d1d9;
    font-size: 14px;
    line-height: 1.5;
  }
  .prompt {
    color: #58a6ff;
    margin-bottom: 14px;
    font-weight: bold;
    font-size: 14.5px;
  }
  .prompt span.cmd { color: #58a6ff; }
  .prompt span.white { color: #f0f6fc; }

  .card-cyan {
    border: 1px solid #00d8d6;
    border-radius: 8px;
    padding: 12px 18px;
    background: rgba(0, 216, 214, 0.02);
    margin-bottom: 10px;
  }
  .card-gray {
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 10px 18px;
    background: rgba(255, 255, 255, 0.01);
    margin-bottom: 10px;
  }

  .row-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .divider {
    height: 1px;
    background: #21262d;
    margin: 8px 0;
  }
  .divider-cyan {
    height: 1px;
    background: rgba(0, 216, 214, 0.25);
    margin: 8px 0;
  }

  .cyan { color: #00d8d6; }
  .green { color: #2ecc71; font-weight: bold; }
  .yellow { color: #f1c40f; font-weight: bold; }
  .magenta { color: #a29bfe; font-weight: bold; }
  .red { color: #ff7675; font-weight: bold; }
  .gray { color: #8b949e; }
  .white { color: #f0f6fc; }
  .bold { font-weight: bold; }

  .badge-single {
    background: #d29922;
    color: #000000;
    padding: 1px 7px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  .badge-ssd {
    background: #238636;
    color: #ffffff;
    padding: 1px 7px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 11px;
  }
  .badge-igpu {
    background: #8957e5;
    color: #ffffff;
    padding: 1px 7px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 11px;
  }
  .gauge-fill { color: #2ecc71; }
  .gauge-empty { color: #30363d; }
  .active-item {
    background: rgba(0, 216, 214, 0.08);
    border-radius: 4px;
    padding: 2px 6px;
    margin: -2px -6px;
  }
</style>
</head>
<body>

<div class="window">
  <div class="titlebar">
    <div class="dots">
      <div class="dot red"></div>
      <div class="dot yellow"></div>
      <div class="dot green"></div>
    </div>
    <div class="title">PowerShell 7 — canirunit (Interactive Hardware &amp; Game Scout TUI)</div>
  </div>

  <div class="terminal-body">
    <div class="prompt">PS C:\\Users\\Gamer&gt; <span class="white">canirunit</span></div>

    <!-- Hardware Header Banner -->
    <div class="card-cyan">
      <div class="row-between">
        <div><span class="cyan bold">◆ PC GAME SCOUT</span> <span class="gray">| Windows Hardware &amp; Compatibility Engine</span></div>
        <div class="gray">v1.1.0 • TUI</div>
      </div>
      <div class="divider-cyan"></div>
      <div class="row-between">
        <div><span class="white bold">CPU: </span><span class="gray">Gen Intel® Core™ i7-1355U (10 Cores, 12 Threads @ 1.70 GHz)</span></div>
      </div>
      <div class="row-between" style="margin-top: 2px;">
        <div><span class="white bold">GPU: </span><span class="magenta">Intel(R) UHD Graphics (Integrated iGPU • 2.0 GB VRAM • ~1800 G3D)</span></div>
      </div>
      <div class="row-between" style="margin-top: 2px;">
        <div>
          <span class="white bold">RAM: </span>
          <span class="yellow">7.5 GB DDR5-5200</span>&nbsp;
          <span class="badge-single">SINGLE-CHANNEL ⚠️ throttles iGPU</span>
        </div>
        <div>
          <span class="white bold">Storage: </span>
          <span class="green">C: 3.5 GB free of 279.4 GB</span>&nbsp;
          <span class="badge-ssd">NVMe/SSD</span>
        </div>
      </div>
    </div>

    <!-- Filter Tabs & Search Controls -->
    <div class="row-between" style="margin: 8px 2px 4px 2px;">
      <div>
        <span class="cyan bold">All(5500)</span>&nbsp;&nbsp;
        <span class="green">High(1420)</span>&nbsp;&nbsp;
        <span class="cyan">Med(980)</span>&nbsp;&nbsp;
        <span class="yellow">Low(640)</span>&nbsp;&nbsp;
        <span class="red">B-Neck(2460)</span>&nbsp;&nbsp;
        <span class="magenta">Soon(12)</span>
      </div>
      <div class="gray">[Tab: tier]</div>
    </div>
    <div class="row-between" style="margin: 0 2px 8px 2px;">
      <div><span class="cyan bold">🔍 Filter: "black myth"</span> <span class="gray">[/ to edit, Esc to clear]</span></div>
      <div><span class="gray">Sort: </span><span class="cyan">FPS ↓</span> <span class="gray">[s]</span>&nbsp;&nbsp;<span class="yellow">[Enter: Full Scorecard]</span></div>
    </div>

    <!-- Games List Box -->
    <div class="card-gray">
      <div class="row-between" style="margin-bottom: 6px;">
        <span class="white bold">Games (3 matches)</span>
        <span class="gray">1/3</span>
      </div>
      <div class="row-between active-item" style="margin-bottom: 4px;">
        <div><span class="cyan bold">▶ Black Myth: Wukong Benchmark Tool (2020)</span></div>
        <div><span class="yellow bold">[Low • 43 FPS • 35 GB]</span></div>
      </div>
      <div class="row-between" style="margin-bottom: 4px; padding: 2px 0;">
        <div><span class="white">  My Lands: Black Mountain (2018)</span></div>
        <div><span class="green">[High • 60 FPS • 4 GB]</span></div>
      </div>
      <div class="row-between" style="padding: 2px 0;">
        <div><span class="white">  Black Myth: Wukong (2024)</span></div>
        <div><span class="red">[B-Neck • 15 FPS • 130 GB]</span></div>
      </div>
    </div>

    <!-- Selected Game Details Panel -->
    <div class="card-cyan">
      <div class="row-between">
        <div>
          <span class="white bold" style="font-size: 15px;">Selected Game: Black Myth: Wukong Benchmark Tool</span>
          <span class="gray"> (2020)</span>
        </div>
        <div class="gray">ID: black-myth-wukong-benchmark</div>
      </div>
      <div class="divider-cyan"></div>
      <div class="row-between">
        <div>
          <span class="white bold">Verdict: </span>
          <span class="yellow bold">Low Settings</span>
          <span class="gray"> (~43 FPS estimated)</span>
        </div>
        <div>
          <span class="gauge-fill">████████</span><span class="gauge-empty">░░░░░░░░</span>
          <span class="white bold"> 43 FPS</span>&nbsp;&nbsp;
          <span class="cyan">[DX11]</span> <span class="green">[AMD FSR]</span> <span class="magenta">[XeSS]</span>
        </div>
      </div>
      <div style="margin-top: 4px;">
        <span class="cyan bold">✨ Community: </span>
        <span class="white">[Playable on Iris Xe &amp; Vega] Achieves 45-60 FPS with FSR Quality @ 720p</span>
      </div>
      <div style="margin-top: 3px;">
        <span class="gray">Requirements: Min RAM: 4 GB • Min GPU: DirectX 11 compatible Graphics Card • 35 GB Storage</span>
      </div>
      <div style="margin-top: 3px;">
        <span class="yellow bold">⚠️ Storage: Requires 35 GB, only 3.5 GB available on C: (Need 31.5 GB more)</span>
      </div>
      <div style="margin-top: 3px;">
        <span class="yellow">⚠️ Bottleneck: Single-Channel DDR5 throttles iGPU memory bandwidth (-20% FPS on iGPU)</span>
      </div>
      <div class="row-between" style="margin-top: 5px;">
        <div>
          <span class="white">Store: </span>
          <span class="cyan">Steam: Store Page</span> <span class="gray">•</span> <span class="magenta">Epic: Epic Games Store</span>
        </div>
        <div class="yellow bold">[Enter: Full Scorecard]</div>
      </div>
    </div>

    <!-- Navigation Footer -->
    <div class="row-between" style="margin-top: 4px; padding: 0 4px;">
      <span class="gray">[↑/↓] Select • [Tab] Tier • [/] Search • [s] Sort • [Enter] Scorecard • [q] Quit</span>
      <span class="gray">5500 Curated Games</span>
    </div>
  </div>
</div>

</body>
</html>
"""

SCORECARD_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #06090e;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 24px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    -webkit-font-smoothing: antialiased;
  }
  .window {
    width: 1080px;
    background: #0b0f17;
    border-radius: 12px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.85), 0 0 0 1px #30363d;
    overflow: hidden;
  }
  .titlebar {
    background: #161b22;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #21262d;
  }
  .dots {
    display: flex;
    gap: 8px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .dot.red { background: #ff5f56; }
  .dot.yellow { background: #ffbd2e; }
  .dot.green { background: #27c93f; }
  .title {
    flex: 1;
    text-align: center;
    color: #8b949e;
    font-size: 13px;
    font-weight: 600;
    margin-right: 48px;
    letter-spacing: 0.5px;
  }
  .terminal-body {
    padding: 22px 26px;
    color: #c9d1d9;
    font-size: 14px;
    line-height: 1.5;
  }
  .prompt {
    color: #58a6ff;
    margin-bottom: 14px;
    font-weight: bold;
    font-size: 14.5px;
  }
  .prompt span.white { color: #f0f6fc; }

  .card-cyan {
    border: 1px solid #00d8d6;
    border-radius: 8px;
    padding: 12px 18px;
    background: rgba(0, 216, 214, 0.02);
    margin-bottom: 10px;
  }
  .card-yellow {
    border: 1px solid #f1c40f;
    border-radius: 8px;
    padding: 10px 18px;
    background: rgba(241, 196, 15, 0.03);
    margin-bottom: 10px;
  }

  .row-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .divider {
    height: 1px;
    background: #21262d;
    margin: 8px 0;
  }
  .divider-cyan {
    height: 1px;
    background: rgba(0, 216, 214, 0.25);
    margin: 8px 0;
  }

  .cyan { color: #00d8d6; }
  .green { color: #2ecc71; font-weight: bold; }
  .yellow { color: #f1c40f; font-weight: bold; }
  .magenta { color: #a29bfe; font-weight: bold; }
  .red { color: #ff7675; font-weight: bold; }
  .gray { color: #8b949e; }
  .white { color: #f0f6fc; }
  .bold { font-weight: bold; }

  .badge-released {
    background: #238636;
    color: #ffffff;
    padding: 1px 8px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 11px;
  }
  .badge-single {
    background: #d29922;
    color: #000000;
    padding: 1px 8px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 11px;
  }
  .badge-igpu {
    background: #8957e5;
    color: #ffffff;
    padding: 1px 8px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 11px;
  }
  .badge-ssd {
    background: #238636;
    color: #ffffff;
    padding: 1px 8px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 11px;
  }
  .gauge-fill { color: #2ecc71; }
  .gauge-empty { color: #30363d; }
</style>
</head>
<body>

<div class="window">
  <div class="titlebar">
    <div class="dots">
      <div class="dot red"></div>
      <div class="dot yellow"></div>
      <div class="dot green"></div>
    </div>
    <div class="title">PowerShell 7 — canirunit check "Cyberpunk 2077" (Game Scorecard)</div>
  </div>

  <div class="terminal-body">
    <div class="prompt">PS C:\\Users\\Gamer&gt; <span class="white">canirunit check "Cyberpunk 2077"</span></div>

    <!-- Hardware Header Banner -->
    <div class="card-cyan">
      <div class="row-between">
        <div><span class="cyan bold">◆ PC GAME SCOUT</span> <span class="gray">| Hardware Diagnostic &amp; Game Engine</span></div>
      </div>
      <div class="divider-cyan"></div>
      <div style="display: grid; grid-template-columns: 90px 1fr; row-gap: 3px;">
        <span class="cyan bold">OS</span><span>: <span class="white">Microsoft Windows 11 Enterprise</span> <span class="gray">(Build 26200, x64)</span></span>
        <span class="cyan bold">CPU</span><span>: <span class="white">Gen Intel® Core™ i7-1355U</span> <span class="gray">(10C / 12T @ 1.70 GHz)</span></span>
        <span class="cyan bold">RAM</span><span>: <span class="white">7.5 GB DDR5-5200 MHz</span> &nbsp;<span class="badge-single">SINGLE-CHANNEL</span></span>
        <span class="cyan bold">GPU</span><span>: <span class="white">Intel(R) UHD Graphics</span> <span class="gray">(2 GB VRAM, ~1800 G3D)</span> &nbsp;<span class="badge-igpu">INTEGRATED iGPU</span></span>
        <span class="cyan bold">STORAGE</span><span>: <span class="white">C: 3.5 GB free of 279.4 GB</span> &nbsp;<span class="badge-ssd">NVMe/SSD</span></span>
      </div>
    </div>

    <!-- Single Channel Notice -->
    <div class="card-yellow">
      <div><span class="yellow bold">╭─ ⚠️  HARDWARE NOTICE ─────────────────────────────────────────────────────────────╮</span></div>
      <div style="margin-top: 3px;"><span class="yellow bold">Single-channel RAM detected!</span> Shared memory throttles iGPU FPS by ~40%.</div>
      <div style="margin-top: 2px;"><span class="white">Recommendation: Add a 2nd matching RAM stick to activate Dual-Channel bandwidth.</span></div>
    </div>

    <!-- Game Card Detailed Evaluation -->
    <div class="card-cyan">
      <div class="row-between">
        <div>
          <span class="white bold" style="font-size: 15px;">◆ Cyberpunk 2077 (2020)</span>&nbsp;&nbsp;
          <span class="badge-released">RELEASED</span>
        </div>
      </div>
      <div class="divider-cyan"></div>
      <div class="row-between">
        <div>
          <span class="white bold">Verdict: </span>
          <span class="yellow bold">▲ Low Settings (30-45 FPS)</span>
          <span class="gray"> (~36 FPS estimated)</span>
        </div>
        <div>
          <span class="gauge-fill">██████░░░░░░░░░░</span>
          <span class="gray"> [36 FPS estimated with FSR 2.1 Quality @ 720p]</span>
        </div>
      </div>
      <div style="margin-top: 4px;">
        <span class="white bold">Technologies: </span>
        <span class="cyan">[DX12]</span> <span class="green">[AMD FSR 2.1]</span> <span class="cyan">[Intel XeSS]</span> <span class="green">[NVIDIA DLSS 3.5]</span>
      </div>

      <div class="divider-cyan"></div>
      <div class="cyan bold" style="margin-bottom: 4px;">HARDWARE SPECIFICATION EVALUATION</div>
      <div style="display: grid; grid-template-columns: 85px 105px 1fr; row-gap: 3px;">
        <span class="white bold">CPU:</span>
        <span class="green">✔ PASSED</span>
        <span><span class="white">Gen Intel® Core™ i7-1355U (10C/12T)</span> <span class="gray">(Min: Core i7-6700 / Ryzen 5 1600)</span></span>

        <span class="white bold">GPU:</span>
        <span class="green">✔ PASSED</span>
        <span><span class="white">Intel(R) UHD Graphics (~2100 vs Min 2000 G3D with FSR 2.1)</span></span>

        <span class="white bold">RAM:</span>
        <span class="green">✔ PASSED</span>
        <span><span class="white">7.5 GB installed</span> <span class="gray">(Min: 8 GB, dynamic swap memory active)</span></span>

        <span class="white bold">VRAM:</span>
        <span class="green">✔ PASSED</span>
        <span><span class="white">Shared system memory (iGPU dynamic allocation)</span></span>

        <span class="white bold">Storage:</span>
        <span class="red">✖ DEFICIT</span>
        <span><span class="white">Requires 70 GB, only 3.5 GB available on C:</span> <span class="yellow">(Need 66.5 GB more)</span></span>

        <span class="white bold">Media:</span>
        <span class="green">✔ PASSED</span>
        <span><span class="white">NVMe/SSD detected</span></span>
      </div>

      <div class="divider-cyan"></div>
      <div class="magenta bold" style="margin-bottom: 4px;">COMMUNITY &amp; iGPU VERDICT (r/lowspecgamer insights)</div>
      <div class="cyan bold">[Playable on iGPU with FSR/720p]</div>
      <div class="white" style="margin-top: 2px;">Runs smoothly at 32-40 FPS on modern iGPUs with FSR 2.1 Balanced at 720p.</div>
      <div class="white">Crowd Density set to Low and Depth of Field Off recommended for stable frame times.</div>

      <div class="divider-cyan"></div>
      <div class="red bold" style="margin-bottom: 4px;">⚠️  DETECTED HARDWARE BOTTLENECKS</div>
      <div class="yellow">• Single-Channel DDR5 throttles iGPU memory bandwidth (-20% FPS)</div>
      <div class="yellow">• Disk Storage Deficit: 3.5 GB free on C: vs 70 GB required</div>

      <div class="divider-cyan"></div>
      <div class="row-between">
        <div>
          <span class="white bold">STORE &amp; INSTALLATION LINKS: </span>
          <span class="cyan">Steam: https://store.steampowered.com/app/1091500</span> <span class="gray">•</span>
          <span class="magenta">Epic: https://store.epicgames.com/p/cyberpunk-2077</span>
        </div>
      </div>
    </div>
  </div>
</div>

</body>
</html>
"""

def generate():
    cwd = os.getcwd()
    assets_dir = os.path.join(cwd, "assets")
    os.makedirs(assets_dir, exist_ok=True)

    dash_html_path = os.path.join(cwd, "temp_dashboard.html")
    score_html_path = os.path.join(cwd, "temp_scorecard.html")

    with open(dash_html_path, "w", encoding="utf-8") as f:
        f.write(DASHBOARD_HTML)
    with open(score_html_path, "w", encoding="utf-8") as f:
        f.write(SCORECARD_HTML)

    dash_png_path = os.path.join(assets_dir, "terminal_dashboard.png")
    score_png_path = os.path.join(assets_dir, "terminal_scorecard.png")

    print("Rendering terminal_dashboard.png with pristine CSS layout...")
    cmd1 = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1140,780",
        f"--screenshot={dash_png_path}",
        f"file:///{dash_html_path.replace(os.sep, '/')}"
    ]
    subprocess.run(cmd1, check=True)

    print("Rendering terminal_scorecard.png with pristine CSS layout...")
    cmd2 = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1140,990",
        f"--screenshot={score_png_path}",
        f"file:///{score_html_path.replace(os.sep, '/')}"
    ]
    subprocess.run(cmd2, check=True)

    try:
        os.remove(dash_html_path)
        os.remove(score_html_path)
    except Exception:
        pass

    print(f"Screenshots saved successfully:")
    print(f" - {dash_png_path} ({os.path.getsize(dash_png_path)} bytes)")
    print(f" - {score_png_path} ({os.path.getsize(score_png_path)} bytes)")

if __name__ == "__main__":
    generate()
