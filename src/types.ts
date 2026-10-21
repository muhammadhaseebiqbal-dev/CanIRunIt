export type PerformanceTier = 'High Performance' | 'Medium Settings' | 'Low Settings' | 'Bottlenecked';

export interface GameFPSBenchmarks {
  iris_xe: number;
  radeon_780m: number;
  gtx_1650: number;
  rtx_3060: number;
  rtx_4060: number;
  rtx_4070?: number;
}

export interface GameRecord {
  id: string;
  name: string;
  release_year: number;
  status: 'Released' | 'Coming Soon';
  steam_appid: number | null;
  steam_url: string;
  epic_url: string;
  min_cpu: string;
  rec_cpu: string;
  min_gpu: string;
  rec_gpu: string;
  min_gpu_g3d: number;
  rec_gpu_g3d: number;
  min_vram_gb: number;
  rec_vram_gb: number;
  min_ram_gb: number;
  rec_ram_gb: number;
  storage_gb: number;
  requires_ssd: boolean;
  directx: string;
  fps_benchmarks: GameFPSBenchmarks;
  igpu_tier: number; // 1 (Ultra light) to 5 (Heavy dGPU only)
  supports_fsr: boolean;
  supports_xess: boolean;
  supports_dlss: boolean;
  community_notes: string;
  tags: string[];
}

export interface HardwareProfile {
  os: {
    distro: string;
    release: string;
    build: string;
    arch: string;
  };
  cpu: {
    brand: string;
    physicalCores: number;
    threads: number;
    speedGhz: number;
  };
  ram: {
    totalGb: number;
    generation: 'DDR3' | 'DDR4' | 'DDR5' | 'Unknown';
    speedMhz: number;
    channels: 'Single-Channel' | 'Dual-Channel' | 'Quad-Channel';
    modulesCount: number;
  };
  gpu: {
    model: string;
    vendor: string;
    vramGb: number;
    isIntegrated: boolean;
    estimatedG3d: number;
  };
  storage: {
    disks: Array<{
      name: string;
      type: string;
      isSsd: boolean;
      sizeGb: number;
    }>;
    mounts: Array<{
      mount: string;
      totalGb: number;
      freeGb: number;
      percentUsed: number;
      isSsd: boolean;
    }>;
    primaryMount: {
      mount: string;
      totalGb: number;
      freeGb: number;
      isSsd: boolean;
    };
  };
}

export interface SpecCheckItem<T = string | number> {
  required: T;
  detected: T;
  passed: boolean;
  message?: string;
}

export interface SpecCheckSummary {
  cpu: SpecCheckItem<string>;
  gpu: SpecCheckItem<string> & { minG3d: number; effectiveG3d: number };
  ram: SpecCheckItem<number>;
  vram: SpecCheckItem<number>;
  storage: SpecCheckItem<number> & { drive: string };
  ssd: { required: boolean; detectedSsd: boolean; passed: boolean; message?: string };
}

export interface GameCompatibility {
  game: GameRecord;
  tier: PerformanceTier;
  estimatedFps: number;
  communityPlayable: boolean;
  communityBadge?: string;
  communityNote?: string;
  storageWarning?: string;
  ssdWarning?: string;
  bottlenecks: string[];
  effectiveG3d: number;
  specCheck?: SpecCheckSummary;
}

export interface ScoutOptions {
  search?: string;
  tier?: string;
  limit?: string;
  offset?: string;
  all?: boolean;
  drive?: string;
  json?: boolean;
  summaryOnly?: boolean;
  interactive?: boolean;
  table?: boolean;
  card?: boolean;
  sort?: 'fps' | 'name' | 'year' | 'storage';
  order?: 'asc' | 'desc';
  minFps?: string;
  igpuOnly?: boolean;
}

export interface ScoutJsonOutput {
  schema_version: string;
  status: 'success' | 'error';
  command: string;
  timestamp: string;
  query?: Record<string, any>;
  hardware?: HardwareProfile;
  summary?: {
    total_games_scanned: number;
    matched_games: number;
    returned_games: number;
    high_performance: number;
    medium_settings: number;
    low_settings: number;
    bottlenecked: number;
    coming_soon: number;
    igpu_friendly_count: number;
    storage_warnings_count: number;
  };
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
  results?: Array<{
    id: string;
    name: string;
    release_year: number;
    status: 'Released' | 'Coming Soon';
    tier: PerformanceTier;
    estimated_fps: number;
    playable: boolean;
    community_playable: boolean;
    community_badge: string | null;
    community_notes: string;
    storage: {
      required_gb: number;
      free_gb: number;
      drive: string;
      sufficient: boolean;
      warning: string | null;
      requires_ssd: boolean;
      drive_is_ssd: boolean;
      ssd_warning: string | null;
    };
    spec_check?: SpecCheckSummary;
    bottlenecks: string[];
    min_requirements: {
      cpu: string;
      gpu: string;
      ram_gb: number;
      vram_gb: number;
      gpu_g3d: number;
    };
    rec_requirements: {
      cpu: string;
      gpu: string;
      ram_gb: number;
      vram_gb: number;
      gpu_g3d: number;
    };
    technologies: {
      fsr: boolean;
      xess: boolean;
      dlss: boolean;
      directx: string;
    };
    store_links: {
      steam: string;
      epic: string;
    };
  }>;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}
