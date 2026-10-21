import si from 'systeminformation';

async function testHardware() {
  console.log('--- Probing Windows Hardware via systeminformation ---');
  const os = await si.osInfo();
  console.log(`OS: ${os.distro} ${os.release} (Build: ${os.build}) - Arch: ${os.arch}`);

  const cpu = await si.cpu();
  const cpuSpeed = await si.cpuCurrentSpeed();
  console.log(`CPU: ${cpu.manufacturer} ${cpu.brand} @ ${cpu.speed} GHz (${cpu.cores} physical cores, ${cpu.physicalCores} p-cores, ${cpu.processors} logical threads)`);

  const mem = await si.mem();
  const memLayout = await si.memLayout();
  const totalGB = (mem.total / (1024 ** 3)).toFixed(1);
  const freeGB = (mem.free / (1024 ** 3)).toFixed(1);
  console.log(`RAM: ${totalGB} GB total (${freeGB} GB free)`);
  console.log(`RAM Modules count: ${memLayout.length}`);
  memLayout.forEach((m, idx) => {
    console.log(`  Module ${idx + 1}: ${m.type} ${m.clockSpeed} MHz, ${m.size ? (m.size / (1024**3)).toFixed(0) : '?'} GB, Bank/Slot: ${m.bank}`);
  });

  const graphics = await si.graphics();
  console.log(`GPUs count: ${graphics.controllers.length}`);
  graphics.controllers.forEach((g, idx) => {
    console.log(`  GPU ${idx + 1}: ${g.vendor} ${g.model} | VRAM: ${g.vram} MB | Bus: ${g.bus || 'N/A'}`);
  });

  const fsSize = await si.fsSize();
  const diskLayout = await si.diskLayout();
  console.log(`Storage Disks: ${diskLayout.length}`);
  diskLayout.forEach((d, idx) => {
    console.log(`  Disk ${idx + 1}: ${d.name} (${d.type} / ${d.interfaceType}) - ${(d.size / (1024**3)).toFixed(0)} GB`);
  });
  console.log(`Storage Mounts: ${fsSize.length}`);
  fsSize.forEach((f, idx) => {
    console.log(`  Mount ${f.mount}: ${(f.size / (1024**3)).toFixed(1)} GB total, ${(f.available / (1024**3)).toFixed(1)} GB free (${(f.use).toFixed(1)}% used) [${f.type}]`);
  });
}

testHardware().catch(console.error);
