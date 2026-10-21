import { GameRecord, HardwareProfile, GameCompatibility, PerformanceTier } from './types.js';

export class CompatibilityEngine {
  private hardware: HardwareProfile;

  constructor(hardware: HardwareProfile) {
    this.hardware = hardware;
  }

  public evaluateGame(game: GameRecord, selectedMount?: string): GameCompatibility {
    const hw = this.hardware;
    const bottlenecks: string[] = [];
    let effectiveG3d = hw.gpu.estimatedG3d;
    let ramMultiplier = 1.0;

    // 1. Calculate iGPU RAM Bandwidth Multiplier
    if (hw.gpu.isIntegrated) {
      const isDualOrQuad = hw.ram.channels === 'Dual-Channel' || hw.ram.channels === 'Quad-Channel';

      if (hw.ram.generation === 'DDR5') {
        if (isDualOrQuad) {
          ramMultiplier = hw.ram.speedMhz >= 6000 ? 1.20 : 1.10;
        } else {
          ramMultiplier = 0.80; // Single-channel DDR5 bottleneck
          bottlenecks.push(`Single-Channel DDR5 throttles iGPU memory bandwidth (-20% FPS)`);
        }
      } else if (hw.ram.generation === 'DDR4') {
        if (isDualOrQuad) {
          ramMultiplier = hw.ram.speedMhz >= 3200 ? 1.00 : 0.88;
        } else {
          ramMultiplier = 0.60; // Severe Single-Channel DDR4 memory bandwidth choke
          bottlenecks.push(`Severe Memory Bottleneck: Single-Channel DDR4 chokes iGPU shared memory (-40% FPS). Upgrading to Dual-Channel recommended.`);
        }
      } else {
        ramMultiplier = 0.50; // DDR3 or older
        bottlenecks.push(`Legacy DDR3 memory severely limits modern 3D graphics bandwidth`);
      }

      effectiveG3d = Math.round(effectiveG3d * ramMultiplier);

      // 2. Real-World Community Upscaler Boost (FSR / XeSS / 720p scaling)
      if (game.supports_fsr || game.supports_xess) {
        // Modern upscaler enables rendering at 720p/900p Balanced with 40-50% boost
        effectiveG3d = Math.round(effectiveG3d * 1.45);
      }
    }

    // 3. RAM Capacity Check
    if (hw.ram.totalGb < game.min_ram_gb) {
      const diff = Math.round((game.min_ram_gb - hw.ram.totalGb) * 10) / 10;
      bottlenecks.push(`RAM Capacity: Has ${hw.ram.totalGb} GB, requires min ${game.min_ram_gb} GB (-${diff} GB)`);
    }

    // 4. CPU Check (threads and cores)
    const isHeavyGame = game.min_gpu_g3d >= 7000 || game.min_ram_gb >= 12;
    const cpuPassed = isHeavyGame
      ? (hw.cpu.threads >= 6 && hw.cpu.physicalCores >= 4)
      : (hw.cpu.threads >= 4 || game.rec_ram_gb < 16);

    if (!cpuPassed) {
      bottlenecks.push(`CPU Bottleneck: ${hw.cpu.threads} threads / ${hw.cpu.physicalCores} cores may cause frame stutter in modern AAA titles`);
    }

    // 5. Evaluate Performance Tier & Estimate FPS
    let tier: PerformanceTier = 'Bottlenecked';
    let estimatedFps = 30;
    let communityPlayable = false;
    let communityBadge: string | undefined = undefined;
    let communityNote: string | undefined = undefined;

    // Check pre-computed FPS benchmark if available for known reference GPUs
    if (hw.gpu.isIntegrated) {
      const isRadeon780orHigher = /radeon\s*(780m|890m|880m|680m)|arc\s*140v/i.test(hw.gpu.model);
      const isIrisXe = /iris\s*xe/i.test(hw.gpu.model);

      if (isRadeon780orHigher && game.fps_benchmarks.radeon_780m) {
        // Apply RAM bandwidth scaling to reference benchmark
        let baseFps = game.fps_benchmarks.radeon_780m;
        if (game.supports_fsr || game.supports_xess) {
          baseFps = Math.round(baseFps * 1.35);
        }
        estimatedFps = Math.max(12, Math.round(baseFps * ramMultiplier));
      } else if (isIrisXe && game.fps_benchmarks.iris_xe) {
        let baseFps = game.fps_benchmarks.iris_xe;
        if (game.supports_fsr || game.supports_xess) {
          baseFps = Math.round(baseFps * 1.30);
        }
        estimatedFps = Math.max(10, Math.round(baseFps * ramMultiplier));
      } else {
        // Estimate based on effective G3D vs min G3D
        const ratio = effectiveG3d / Math.max(game.min_gpu_g3d, 1);
        estimatedFps = Math.round(Math.max(15, Math.min(120, ratio * 45)));
      }

      // Check Real-World Community iGPU Feasibility (r/lowspecgamer logic)
      if (game.igpu_tier <= 2) {
        communityPlayable = true;
        communityBadge = '[Playable on iGPU]';
        communityNote = game.community_notes;
      } else if (game.igpu_tier <= 4 && (isRadeon780orHigher || game.supports_fsr || effectiveG3d >= game.min_gpu_g3d * 0.75)) {
        communityPlayable = true;
        communityBadge = '[Playable on iGPU with FSR/720p]';
        communityNote = game.community_notes;
      }
    } else {
      // Dedicated GPU FPS estimation
      if (/4090|5090/i.test(hw.gpu.model) && game.fps_benchmarks.rtx_4070) {
        estimatedFps = Math.min(240, Math.round(game.fps_benchmarks.rtx_4070 * 1.5));
      } else if (/4070|5070|7800\s*xt/i.test(hw.gpu.model) && game.fps_benchmarks.rtx_4070) {
        estimatedFps = game.fps_benchmarks.rtx_4070;
      } else if (/4060|5060|7600/i.test(hw.gpu.model) && game.fps_benchmarks.rtx_4060) {
        estimatedFps = game.fps_benchmarks.rtx_4060;
      } else if (/3060|2070|6700/i.test(hw.gpu.model) && game.fps_benchmarks.rtx_3060) {
        estimatedFps = game.fps_benchmarks.rtx_3060;
      } else if (/1650|1060|580/i.test(hw.gpu.model) && game.fps_benchmarks.gtx_1650) {
        estimatedFps = game.fps_benchmarks.gtx_1650;
      } else {
        const ratio = effectiveG3d / Math.max(game.rec_gpu_g3d, 1);
        estimatedFps = Math.round(Math.max(20, Math.min(180, ratio * 60)));
      }
    }

    // Determine Tier
    const meetsMinRam = hw.ram.totalGb >= (game.min_ram_gb * 0.85);

    if (effectiveG3d >= game.rec_gpu_g3d && hw.ram.totalGb >= game.rec_ram_gb && estimatedFps >= 55) {
      tier = 'High Performance';
    } else if (effectiveG3d >= game.min_gpu_g3d && meetsMinRam && estimatedFps >= 42) {
      tier = 'Medium Settings';
    } else if ((effectiveG3d >= game.min_gpu_g3d * 0.70 || communityPlayable) && meetsMinRam && estimatedFps >= 28) {
      tier = 'Low Settings';
      if (!communityBadge && hw.gpu.isIntegrated) {
        communityBadge = '[Playable on Low / 720p]';
      }
    } else {
      tier = 'Bottlenecked';
      if (effectiveG3d < game.min_gpu_g3d * 0.60) {
        bottlenecks.push(`GPU Score: ${effectiveG3d} G3D vs min ${game.min_gpu_g3d} G3D needed`);
      }
    }

    // 6. Storage & SSD Real-Time Warnings
    let storageWarning: string | undefined;
    let ssdWarning: string | undefined;

    const targetMount = selectedMount
      ? hw.storage.mounts.find(m => m.mount.toUpperCase().startsWith(selectedMount.toUpperCase())) || hw.storage.primaryMount
      : hw.storage.primaryMount;

    const storagePassed = targetMount.freeGb >= game.storage_gb;
    if (!storagePassed) {
      const shortage = Math.round((game.storage_gb - targetMount.freeGb) * 10) / 10;
      storageWarning = `Requires ${game.storage_gb} GB, only ${targetMount.freeGb} GB available on ${targetMount.mount} (Need ${shortage} GB more)`;
    }

    const ssdPassed = !game.requires_ssd || targetMount.isSsd;
    if (game.requires_ssd && !targetMount.isSsd) {
      ssdWarning = `SSD Required: This game requires high-speed SSD for streaming. Detected HDD will cause micro-stutters.`;
    }

    // 7. Component-by-Component Spec Breakdown
    const ramPassed = hw.ram.totalGb >= (game.min_ram_gb * 0.85);
    const gpuPassed = effectiveG3d >= (game.min_gpu_g3d * 0.70) || (communityPlayable && estimatedFps >= 28);
    const vramPassed = hw.gpu.vramGb >= (game.min_vram_gb * 0.75) || hw.gpu.isIntegrated;

    const specCheck = {
      cpu: {
        required: game.min_cpu,
        detected: `${hw.cpu.brand} (${hw.cpu.physicalCores}C/${hw.cpu.threads}T @ ${hw.cpu.speedGhz} GHz)`,
        passed: cpuPassed,
        message: cpuPassed
          ? 'Meets recommended CPU requirements'
          : `CPU threads (${hw.cpu.threads}T) may bottleneck physics and asset decompression`,
      },
      gpu: {
        required: game.min_gpu,
        detected: hw.gpu.model,
        minG3d: game.min_gpu_g3d,
        effectiveG3d,
        passed: gpuPassed,
        message: gpuPassed
          ? (communityBadge || 'Meets GPU 3D benchmark threshold')
          : `GPU score (${effectiveG3d} G3D) is below minimum (${game.min_gpu_g3d} G3D)`,
      },
      ram: {
        required: game.min_ram_gb,
        detected: hw.ram.totalGb,
        passed: ramPassed,
        message: ramPassed
          ? `${hw.ram.totalGb} GB installed (${hw.ram.generation}-${hw.ram.speedMhz} MHz, ${hw.ram.channels})`
          : `Deficit: Has ${hw.ram.totalGb} GB, requires ${game.min_ram_gb} GB`,
      },
      vram: {
        required: game.min_vram_gb,
        detected: hw.gpu.vramGb,
        passed: vramPassed,
        message: hw.gpu.isIntegrated
          ? 'Shared system memory (iGPU dynamic allocation)'
          : (vramPassed
              ? `${hw.gpu.vramGb} GB Dedicated VRAM (Min: ${game.min_vram_gb} GB)`
              : `Deficit: Has ${hw.gpu.vramGb} GB VRAM, requires ${game.min_vram_gb} GB`),
      },
      storage: {
        required: game.storage_gb,
        detected: targetMount.freeGb,
        drive: targetMount.mount,
        passed: storagePassed,
        message: storagePassed
          ? `${targetMount.freeGb} GB free on ${targetMount.mount} (Requires ${game.storage_gb} GB)`
          : storageWarning || `Requires ${game.storage_gb} GB, only ${targetMount.freeGb} GB available on ${targetMount.mount}`,
      },
      ssd: {
        required: game.requires_ssd,
        detectedSsd: targetMount.isSsd,
        passed: ssdPassed,
        message: targetMount.isSsd
          ? 'NVMe/SSD detected'
          : (game.requires_ssd ? 'SSD Required for streaming assets' : 'HDD acceptable'),
      },
    };

    return {
      game,
      tier,
      estimatedFps,
      communityPlayable,
      communityBadge,
      communityNote,
      storageWarning,
      ssdWarning,
      bottlenecks,
      effectiveG3d,
      specCheck,
    };
  }

  public evaluateBatch(games: GameRecord[], selectedMount?: string): GameCompatibility[] {
    return games.map(g => this.evaluateGame(g, selectedMount));
  }
}
