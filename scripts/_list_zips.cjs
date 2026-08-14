const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const woosh = path.join(process.cwd(), 'models', 'woosh');

// List contents of successfully downloaded zips
['Woosh-AE.zip', 'Woosh-CLAP.zip'].forEach(z => {
  const zipPath = path.join(woosh, z);
  console.log('=== ' + z + ' (' + (fs.statSync(zipPath).size / (1024*1024)).toFixed(1) + ' MB) ===');
  try {
    const cmd = `powershell -Command "Add-Type -Assembly System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, '/')}').Entries | Select-Object -First 30 FullName, Length | Format-Table -AutoSize"`;
    const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024*1024 });
    console.log(out);
  } catch(e) {
    console.log('ERROR listing: ' + e.message.substring(0, 300));
  }
  console.log('');
});
