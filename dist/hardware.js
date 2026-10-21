import si from 'systeminformation';
// Pre-calibrated G3D Mark benchmark scores for common GPUs
const GPU_G3D_MAP = [
    // Flagship & High-End dGPUs
    { pattern: /rtx\s*5090/i, g3d: 39000, isIntegrated: false },
    { pattern: /rtx\s*5080/i, g3d: 35000, isIntegrated: false },
    { pattern: /rtx\s*5070\s*ti/i, g3d: 32000, isIntegrated: false },
    { pattern: /rtx\s*5070/i, g3d: 28000, isIntegrated: false },
    { pattern: /rtx\s*4090/i, g3d: 38000, isIntegrated: false },
    { pattern: /rtx\s*4080\s*super/i, g3d: 34200, isIntegrated: false },
    { pattern: /rtx\s*4080/i, g3d: 34000, isIntegrated: false },
    { pattern: /rtx\s*4070\s*ti/i, g3d: 31500, isIntegrated: false },
    { pattern: /rtx\s*4070\s*super/i, g3d: 29500, isIntegrated: false },
    { pattern: /rtx\s*4070/i, g3d: 26500, isIntegrated: false },
    { pattern: /rx\s*7900\s*xtx/i, g3d: 31000, isIntegrated: false },
    { pattern: /rx\s*7900\s*xt/i, g3d: 28500, isIntegrated: false },
    { pattern: /rx\s*7800\s*xt/i, g3d: 26000, isIntegrated: false },
    { pattern: /rx\s*7700\s*xt/i, g3d: 21000, isIntegrated: false },
    // Mid-Range dGPUs
    { pattern: /rtx\s*4060\s*ti/i, g3d: 22000, isIntegrated: false },
    { pattern: /rtx\s*4060/i, g3d: 19000, isIntegrated: false },
    { pattern: /rtx\s*3080/i, g3d: 25000, isIntegrated: false },
    { pattern: /rtx\s*3070\s*ti/i, g3d: 23000, isIntegrated: false },
    { pattern: /rtx\s*3070/i, g3d: 22000, isIntegrated: false },
    { pattern: /rtx\s*3060\s*ti/i, g3d: 20000, isIntegrated: false },
    { pattern: /rtx\s*3060/i, g3d: 17000, isIntegrated: false },
    { pattern: /rx\s*7600/i, g3d: 16500, isIntegrated: false },
    { pattern: /rx\s*6750\s*xt/i, g3d: 21000, isIntegrated: false },
    { pattern: /rx\s*6700\s*xt/i, g3d: 19000, isIntegrated: false },
    { pattern: /rx\s*6650\s*xt/i, g3d: 17000, isIntegrated: false },
    { pattern: /rx\s*6600\s*xt/i, g3d: 16000, isIntegrated: false },
    { pattern: /rx\s*6600/i, g3d: 14000, isIntegrated: false },
    { pattern: /arc\s*a770/i, g3d: 14500, isIntegrated: false },
    { pattern: /arc\s*a750/i, g3d: 12500, isIntegrated: false },
    { pattern: /arc\s*a580/i, g3d: 11000, isIntegrated: false },
    { pattern: /arc\s*a380/i, g3d: 6500, isIntegrated: false },
    // Budget & Legacy dGPUs
    { pattern: /rtx\s*2080\s*ti/i, g3d: 21500, isIntegrated: false },
    { pattern: /rtx\s*2070\s*super/i, g3d: 18000, isIntegrated: false },
    { pattern: /rtx\s*2070/i, g3d: 16000, isIntegrated: false },
    { pattern: /rtx\s*2060\s*super/i, g3d: 16200, isIntegrated: false },
    { pattern: /rtx\s*2060/i, g3d: 14000, isIntegrated: false },
    { pattern: /gtx\s*1080\s*ti/i, g3d: 17500, isIntegrated: false },
    { pattern: /gtx\s*1080/i, g3d: 15000, isIntegrated: false },
    { pattern: /gtx\s*1070\s*ti/i, g3d: 14000, isIntegrated: false },
    { pattern: /gtx\s*1070/i, g3d: 13000, isIntegrated: false },
    { pattern: /gtx\s*1660\s*ti/i, g3d: 12800, isIntegrated: false },
    { pattern: /gtx\s*1660\s*super/i, g3d: 12700, isIntegrated: false },
    { pattern: /gtx\s*1660/i, g3d: 11500, isIntegrated: false },
    { pattern: /gtx\s*1650\s*super/i, g3d: 9800, isIntegrated: false },
    { pattern: /gtx\s*1650/i, g3d: 7800, isIntegrated: false },
    { pattern: /gtx\s*1060/i, g3d: 9200, isIntegrated: false },
    { pattern: /gtx\s*1050\s*ti/i, g3d: 6300, isIntegrated: false },
    { pattern: /gtx\s*1050/i, g3d: 5000, isIntegrated: false },
    { pattern: /gtx\s*970/i, g3d: 9600, isIntegrated: false },
    { pattern: /gtx\s*960/i, g3d: 6000, isIntegrated: false },
    { pattern: /rx\s*580/i, g3d: 8700, isIntegrated: false },
    { pattern: /rx\s*570/i, g3d: 7000, isIntegrated: false },
    { pattern: /rx\s*560/i, g3d: 3600, isIntegrated: false },
    { pattern: /rx\s*550/i, g3d: 2800, isIntegrated: false },
    // Modern High-Performance iGPUs
    { pattern: /radeon\s*890m/i, g3d: 6200, isIntegrated: true },
    { pattern: /radeon\s*880m/i, g3d: 5400, isIntegrated: true },
    { pattern: /radeon\s*780m/i, g3d: 4600, isIntegrated: true },
    { pattern: /radeon\s*760m/i, g3d: 3800, isIntegrated: true },
    { pattern: /radeon\s*680m/i, g3d: 3500, isIntegrated: true },
    { pattern: /radeon\s*660m/i, g3d: 2600, isIntegrated: true },
    { pattern: /arc\s*140v/i, g3d: 4800, isIntegrated: true },
    { pattern: /arc\s*130v/i, g3d: 3900, isIntegrated: true },
    { pattern: /intel.*arc.*graphics/i, g3d: 3800, isIntegrated: true },
    { pattern: /iris\s*xe/i, g3d: 2800, isIntegrated: true },
    { pattern: /vega\s*8/i, g3d: 2100, isIntegrated: true },
    { pattern: /vega\s*7/i, g3d: 1900, isIntegrated: true },
    { pattern: /vega\s*6/i, g3d: 1600, isIntegrated: true },
    { pattern: /vega\s*3/i, g3d: 1200, isIntegrated: true },
    { pattern: /uhd\s*graphics\s*770/i, g3d: 2100, isIntegrated: true },
    { pattern: /uhd\s*graphics\s*730/i, g3d: 1600, isIntegrated: true },
    { pattern: /uhd\s*graphics/i, g3d: 1800, isIntegrated: true },
    { pattern: /hd\s*graphics\s*630/i, g3d: 1200, isIntegrated: true },
    { pattern: /hd\s*graphics\s*620/i, g3d: 1000, isIntegrated: true },
    { pattern: /hd\s*graphics\s*4600/i, g3d: 650, isIntegrated: true },
    { pattern: /hd\s*graphics\s*4000/i, g3d: 450, isIntegrated: true },
    { pattern: /intel.*hd\s*graphics/i, g3d: 700, isIntegrated: true },
];
export async function detectHardware() {
    const [os, cpu, mem, memLayout, graphics, fsSize, diskLayout] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.memLayout(),
        si.graphics(),
        si.fsSize(),
        si.diskLayout(),
    ]);
    // 1. RAM Detection: Total, Generation (DDR4 vs DDR5), Speed MHz, Channels
    const totalRamGb = Math.round((mem.total / (1024 ** 3)) * 10) / 10;
    let generation = 'Unknown';
    let speedMhz = 0;
    let modulesCount = memLayout.length;
    for (const m of memLayout) {
        if (m.type) {
            const t = m.type.toUpperCase();
            if (t.includes('DDR5'))
                generation = 'DDR5';
            else if (t.includes('DDR4') && generation !== 'DDR5')
                generation = 'DDR4';
            else if (t.includes('DDR3') && generation === 'Unknown')
                generation = 'DDR3';
        }
        if (m.clockSpeed && m.clockSpeed > speedMhz) {
            speedMhz = m.clockSpeed;
        }
    }
    // Heuristic fallbacks if WMI omits RAM type
    if (generation === 'Unknown') {
        if (speedMhz >= 4400)
            generation = 'DDR5';
        else if (speedMhz >= 2133)
            generation = 'DDR4';
        else if (speedMhz > 0)
            generation = 'DDR3';
        else {
            // Modern CPU check: 12th/13th/14th gen or Ryzen 7000+ often DDR5
            generation = (cpu.brand.includes('13th') || cpu.brand.includes('14th') || cpu.brand.includes('Ryzen 7') || cpu.brand.includes('Ryzen 8') || cpu.brand.includes('Ryzen 9'))
                ? 'DDR5'
                : 'DDR4';
            speedMhz = generation === 'DDR5' ? 4800 : 3200;
        }
    }
    if (speedMhz === 0) {
        speedMhz = generation === 'DDR5' ? 4800 : 3200;
    }
    // Determine channel configuration
    let channels = 'Single-Channel';
    if (modulesCount >= 4) {
        channels = 'Quad-Channel';
    }
    else if (modulesCount >= 2) {
        channels = 'Dual-Channel';
    }
    else {
        channels = 'Single-Channel';
    }
    // 2. GPU Detection: Choose best primary controller
    let primaryGpu = graphics.controllers[0];
    // If multiple GPUs, prefer dedicated GPU over integrated
    for (const ctrl of graphics.controllers) {
        const isInt = isGpuIntegrated(ctrl.model, ctrl.vendor);
        if (!isInt) {
            primaryGpu = ctrl;
            break;
        }
    }
    const gpuModel = primaryGpu ? primaryGpu.model : 'Standard Display Adapter';
    const gpuVendor = primaryGpu ? primaryGpu.vendor : 'Generic';
    const isIntegrated = isGpuIntegrated(gpuModel, gpuVendor);
    const vramMb = primaryGpu?.vram || (isIntegrated ? 2048 : 4096);
    const vramGb = Math.round((vramMb / 1024) * 10) / 10;
    const estimatedG3d = estimateGpuG3d(gpuModel, isIntegrated);
    // 3. Storage Detection: SSD detection, Mounts, Free Space
    const isAnySsd = diskLayout.some(d => d.type?.toLowerCase().includes('ssd') || d.interfaceType?.toLowerCase().includes('nvme') || d.name?.toLowerCase().includes('nvme'));
    const mounts = fsSize
        .filter(f => f.size > 0 && f.mount && !f.mount.startsWith('/dev'))
        .map(f => {
        const totalGb = Math.round((f.size / (1024 ** 3)) * 10) / 10;
        const freeGb = Math.round((f.available / (1024 ** 3)) * 10) / 10;
        const percentUsed = Math.round(f.use * 10) / 10;
        return {
            mount: f.mount,
            totalGb,
            freeGb,
            percentUsed,
            isSsd: isAnySsd,
        };
    });
    // Pick primary mount: C: or largest free
    let primaryMount = mounts.find(m => m.mount.toUpperCase().startsWith('C:')) || mounts[0] || {
        mount: 'C:',
        totalGb: 256,
        freeGb: 50,
        isSsd: true,
    };
    const disks = diskLayout.map(d => ({
        name: d.name,
        type: d.type || 'Disk',
        isSsd: d.type?.toLowerCase().includes('ssd') || d.interfaceType?.toLowerCase().includes('nvme'),
        sizeGb: Math.round(d.size / (1024 ** 3)),
    }));
    return {
        os: {
            distro: os.distro || 'Windows',
            release: os.release || '11',
            build: os.build || '',
            arch: os.arch || 'x64',
        },
        cpu: {
            brand: cpu.brand || 'Processor',
            physicalCores: cpu.physicalCores || cpu.cores || 4,
            threads: cpu.cores || cpu.physicalCores || 8,
            speedGhz: cpu.speed || 2.5,
        },
        ram: {
            totalGb: totalRamGb,
            generation,
            speedMhz,
            channels,
            modulesCount,
        },
        gpu: {
            model: gpuModel,
            vendor: gpuVendor,
            vramGb,
            isIntegrated,
            estimatedG3d,
        },
        storage: {
            disks,
            mounts,
            primaryMount,
        },
    };
}
function isGpuIntegrated(model, vendor) {
    const m = (model + ' ' + vendor).toLowerCase();
    if (m.includes('uhd') || m.includes('iris') || m.includes('hd graphics') || m.includes('apu'))
        return true;
    if (m.includes('radeon 780m') || m.includes('radeon 890m') || m.includes('radeon 680m') || m.includes('radeon 760m') || m.includes('vega'))
        return true;
    if (m.includes('arc 140v') || m.includes('arc 130v') || m.includes('intel(r) arc(tm) graphics'))
        return true;
    if (m.includes('geforce') || m.includes('rtx') || m.includes('gtx') || m.includes('radeon rx') || m.includes('arc a7') || m.includes('arc a5') || m.includes('arc a3')) {
        return false;
    }
    return m.includes('intel');
}
export function estimateGpuG3d(model, isIntegrated) {
    for (const entry of GPU_G3D_MAP) {
        if (entry.pattern.test(model)) {
            return entry.g3d;
        }
    }
    // Generic fallback based on type
    if (isIntegrated) {
        return 2000;
    }
    return 6000;
}
