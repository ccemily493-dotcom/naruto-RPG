const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Downloading yt-dlp...');
  await download('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', path.join(binDir, 'yt-dlp_new.exe'));
  
  console.log('Downloading ffmpeg...');
  const ffmpegZip = path.join(binDir, 'ffmpeg_new.zip');
  await download('https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip', ffmpegZip);
  
  console.log('Extracting ffmpeg...');
  try {
    execSync(`tar -xf "${ffmpegZip}" -C "${binDir}"`);
    
    // Copy extracted files
    const dirs = fs.readdirSync(binDir);
    const ffmpegExtDir = dirs.find(d => d.includes('ffmpeg-master'));
    if (ffmpegExtDir) {
      fs.copyFileSync(path.join(binDir, ffmpegExtDir, 'bin', 'ffmpeg.exe'), path.join(binDir, 'ffmpeg.exe'));
      fs.copyFileSync(path.join(binDir, ffmpegExtDir, 'bin', 'ffprobe.exe'), path.join(binDir, 'ffprobe.exe'));
      
      // Cleanup
      fs.rmSync(path.join(binDir, ffmpegExtDir), { recursive: true, force: true });
      fs.rmSync(ffmpegZip);
      console.log('FFmpeg installed successfully!');
    }
  } catch (err) {
    console.error('Error extracting ffmpeg:', err);
  }
}

main().catch(console.error);
