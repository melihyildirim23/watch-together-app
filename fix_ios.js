const fs = require('fs');
const path = 'frontend/hooks/useWebRTC.ts';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `    try {
      console.log("[WebRTC] Requesting display media...");
      let screenStream: MediaStream;

      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 30 } },
          audio: true,
        });
      } catch {
        // Fallback: some mobile/safari versions reject audio:true
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 30 } },
        });
      }`;

const newBlock = `    try {
      console.log("[WebRTC] Requesting display media...");
      let screenStream: MediaStream;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // iOS Safari 16.4+: tab capture works ONLY with minimal constraints.
        // Complex constraints (frameRate/width/audio) cause NotSupportedError on iOS.
        console.log("[WebRTC] iOS detected — using minimal constraints for tab capture");
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      } else {
        // Desktop / Android Chrome: full constraints, try with audio first
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 30 } },
            audio: true,
          });
        } catch {
          // Fallback: audio rejected (some Android browsers, older Safari)
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 30 } },
          });
        }
      }`;

if (!content.includes(oldBlock.trim().split('\n')[1].trim())) {
  console.error('Block not found, dumping lines around getDisplayMedia...');
  const lines = content.split('\n');
  lines.forEach((l, i) => { if (l.includes('getDisplayMedia')) console.log(i+1, JSON.stringify(l)); });
  process.exit(1);
}

content = content.replace(oldBlock, newBlock);

// Also fix error handling
const oldCatch = `      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          // User cancelled — silent, no toast
        } else if (isIOS) {
          setScreenShareError("iOS Safari sadece sekme paylaşımını destekler. Tam ekran için Android Chrome veya masaüstü kullanın.");
          setTimeout(() => setScreenShareError(null), 6000);
        } else {
          setScreenShareError("Ekran paylaşımı başlatılamadı. Tarayıcı izni verdiğinizden emin olun.");
          setTimeout(() => setScreenShareError(null), 5000);
        }
      } else if (isIOS) {
        setScreenShareError("iOS Safari sadece sekme paylaşımını destekler. Tam ekran için Android Chrome veya masaüstü kullanın.");
        setTimeout(() => setScreenShareError(null), 6000);
      }`;

const newCatch = `      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          // User cancelled picker — silent
        } else if (err.name === 'NotSupportedError') {
          setScreenShareError("Ekran paylaşımı desteklenmiyor. iOS için Safari 16.4+ gerekli.");
          setTimeout(() => setScreenShareError(null), 7000);
        } else {
          setScreenShareError("Ekran paylaşımı başlatılamadı: " + err.name);
          setTimeout(() => setScreenShareError(null), 5000);
        }
      } else if (isIOS) {
        setScreenShareError("iOS için Safari 16.4+ kullanın ve sekme seçiciden sekme seçin.");
        setTimeout(() => setScreenShareError(null), 7000);
      }`;

content = content.replace(oldCatch, newCatch);

fs.writeFileSync(path, content);
console.log('Done. Lines with getDisplayMedia:');
content.split('\n').forEach((l, i) => { if (l.includes('getDisplayMedia') || l.includes('isIOS')) console.log(i+1, l.trim()); });
