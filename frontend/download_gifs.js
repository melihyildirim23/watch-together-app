const fs = require("fs");
const path = require("path");

const GIFS = [
  // 😂 Komik / Kahkaha
  { label: "😂 Kahkaha", id: "3oEjI6SIIHBdRxXI40" },
  { label: "🤣 Yerde Gülüyor", id: "l4FGJAarb2sJPlXFu" },
  { label: "💀 Ölüyorum", id: "8vQSQ3cNXuDGo" },
  { label: "😹 Kedi Güler", id: "12OMY457Zu7xJG" },
  { label: "😜 Deli Gibi", id: "26uf8P5K26GzALAdG" },
  { label: "🤦 Facepalm", id: "3og0IPikp8PxHbyK2Y" },
  { label: "🐸 Kermit Şok", id: "d3mlE7uhX8KFgEmY" },
  { label: "🤦 Ne yapayım", id: "dkGqmRTJXlhcQ" },
  { label: "🌽 Minion Gülüşü", id: "M12t2bUR1mG5y" },
  { label: "🧽 SpongeBob Gülüşü", id: "26AHCgWc6dJWRUtJ6" },
  { label: "👶 Bebek Kahkahası", id: "10yIEN8cMn40IE" },
  { label: "🐶 Köpek Sırıtması", id: "113427m33CyUha" },
  { label: "😈 Kötü Kahkaha", id: "7zxzMXcrk4PG" },
  { label: "😏 Alaycı Gülüş", id: "jQmVFypWqn2yA" },
  { label: "🥸 Jim Carrey", id: "12SBwtRR9BnWg" },

  // 🎉 Kutlama / Mutlu
  { label: "🎉 Tebrik", id: "l0MYt5jPR6QX5pnqM" },
  { label: "🥳 Parti", id: "26tOZ42Mg6pbTUPHW" },
  { label: "👏 Alkış", id: "7rj2ZgttvgomY" },
  { label: "🎊 Konfeti", id: "g9582DNuQppxC" },
  { label: "🏆 Kazandım", id: "g01ZnwAX5R9yJl74GJ" },
  { label: "💃 Dans", id: "l0HlGgbOFqWyCOGOs" },
  { label: "🕺 Dans Pistinde", id: "3oGRFl3jwFVLsGFakw" },
  { label: "✅ Başardım", id: "111ebonhjOu4vK" },
  { label: "🕴️ Carlton", id: "12tV141W7oCcGk" },
  { label: "🌽 Minions Mutlu", id: "14udF3WUwwGiss" },
  { label: "🧽 SpongeBob Mutlu", id: "nDSlfqf0gn5qh" },
  { label: "🐱 Kedi Dansı", id: "13CoXDiaCcC9Cl" },
  { label: "🧒 Çocuk Kutlama", id: "l0HU7yHIK6V2SDFec" },
  { label: "🤩 Harika", id: "l0MYGzh7D3Kl74Wy4" },
  { label: "🎆 Havai Fişek", id: "26tP21C1S0tXmpxTO" },

  // 😮 Şok / Sürpriz
  { label: "😮 Şok", id: "26ufdipQqU84H52sg" },
  { label: "🤯 Kafa Patladı", id: "3o6Zt6ML6BklcajjsA" },
  { label: "😱 İnanamıyorum", id: "11sBLVxNs7v6WA" },
  { label: "🐶 Hayret", id: "UO5elnTqI4OPK" },
  { label: "🤯 Akıl Uçması", id: "xT0xeJpnrWC4XWblEk" },
  { label: "⚡ Şok Pikachu", id: "3kzJvclYXS47K" },
  { label: "🦖 Pratt Şok", id: "3o7qDYXe0Qu9698xF6" },
  { label: "🙅 Steve HAYIR", id: "cqwP5vD976ipq" },
  { label: "😳 Şaşıran Çocuk", id: "3o7527xuWmWv3N2Ny7" },
  { label: "👀 Göz Yuvarlama", id: "l3q2K1M5wN64" },

  // 😍 Aşk / Sevgi
  { label: "😍 Aşk", id: "26Ff3yDMoOp5ySMkc" },
  { label: "💕 Kalpler", id: "3rXPNHHzSMtlRGPMqQ" },
  { label: "🥰 Sevgi Dolu", id: "Peqz6OoKBXAe0" },
  { label: "😘 Öpücük", id: "3o7TKoWXm3okO1bdCw" },
  { label: "🐱 Kedi Sevgisi", id: "wcJW16149720" },
  { label: "🧽 Kalp Kutu", id: "26FLdmIp6wJr91JAI" },
  { label: "🫶 Kalp Elleri", id: "145fC1268mD8tO" },
  { label: "🐼 Panda Aşk", id: "4PYB540dKsmE8" },
  { label: "🤗 Sarılma", id: "ZBQhoZC0nqknS" },
  { label: "💓 Kalp Atışı", id: "12vV5gZ8feWi7C" },

  // 😢 Ağlama / Üzgün
  { label: "😢 Ağlıyorum", id: "xT9IgG50Lg7rusyxfm" },
  { label: "😭 Çok Üzgün", id: "ROF8OQvDmxytW" },
  { label: "🥺 Çizmeli Kedi", id: "qU05wYe134652" },
  { label: "💅 Kim Kardashian", id: "Iau2Mc2YPss5a" },
  { label: "☔ Yağmur Altında", id: "d2jjuAZzDSVLy" },
  { label: "👶 Ağlayan Bebek", id: "2WxWxgFTWpuq4" },
  { label: "🐕 Üzgün Köpek", id: "14d1db" },
  { label: "😿 Üzgün Kedi", id: "3Orslc681" },
  { label: "🤦 Oh Hayır", id: "9Y5BbDSkVJ5II" },
  { label: "😔 Hayal Kırıklığı", id: "26xBI73g35CBBC3t6" },

  // 🍿 Film / Eğlence
  { label: "🍿 Popcorn", id: "13cptIwW9bgzkA" },
  { label: "🎬 Sinema", id: "pUeXcg80cO8I8" },
  { label: "🎵 Dans Et", id: "l0MYC0LajbaPoEADu" },
  { label: "🍌 Muz Dansı", id: "EluFWEdnZtv1e" },
  { label: "🌈 Nyan Cat", id: "3oKIPrc2ngFZ6BTyww" },
  { label: "🎮 Oyun Modu", id: "xT9IgHHnMPAjb5f8Mk" },
  { label: "🌳 Homer Çalılar", id: "jUwpNzg9jcyrK" },
  { label: "🍿 Popcorn Yiyen", id: "3o7rc0qMuRAq5xleMg" },
  { label: "🕶️ Jackson Popcorn", id: "p0L1Y4oGl39hC" },
  { label: "🎧 DJ Kedi", id: "5GoVLqeAOo6PK" },

  // 👍 Onay / Reddetme
  { label: "👍 Harika", id: "l3q2XhfQ8oCkm1Ts4" },
  { label: "🙅 Hayır", id: "3o6ZtaO9BZHcOjmErm" },
  { label: "🎤 Mic Drop", id: "l0HlvtIPzPdt2uapq" },
  { label: "🚀 Uçuyoruz", id: "3o7WTBGtbSCEsaU4s0" },
  { label: "👋 Selam", id: "3og0IMJcSI8p6hYQXS" },
  { label: "🐕 Baş Sallıyor", id: "yJFeycRK2DB4c" },
  { label: "🔥 Alev", id: "T2vDaYr8y1LRm" },
  { label: "👻 Hayalet Dans", id: "10pxA5bQx6am8o" },
  { label: "💯 Mükemmel", id: "QMHoU66sBXqqLqYvGO" },
  { label: "👍 Onay", id: "3o7abldj0OL3f5CAsU" },
  { label: "🙆 Evet", id: "3oFzmc17crToG2OB68" },
  { label: "🙅 Yok Artık", id: "26hkhHM9V1QCQ0HYg" },
  { label: "👌 Tamamdır", id: "4T3QP5BDigpmU" },
  { label: "👏 Obama Alkış", id: "3o7qDJKT" },

  // 😠 Kızgın / Sinirli
  { label: "😠 Kızgın", id: "xT0Gq30VfVsM1wFDW" },
  { label: "😡 Çok Kızgın", id: "12gY6Jgowz355i" },
  { label: "┬─┬ ノ( ゜-゜ノ)", id: "tJCyr6s5li5X2" },
  { label: "😿 Sinirli Kedi", id: "2G376r5qs40yQ" },
  { label: "👶 Çıldıran Bebek", id: "10t3xNDLg1K03C" },
  { label: "🦆 Donald Duck", id: "u1vFt244Dm10Y" },
  { label: "💻 Pc Kırma", id: "xTiTnHXb3dVHRJo31y" },
  { label: "🤯 Saç Yolma", id: "l1J9u3y35uWiRLF6" },
  { label: "🙄 Göz Devirme", id: "tZiLKidv7XYTC" },
  { label: "🐕 Sinirli Köpek", id: "132pSKn6EO55hS" },

  // 🕺 Dans / Müzik
  { label: "🕺 Michael Jackson", id: "pU315Kb91II48" },
  { label: "💃 Shakira Dansı", id: "fA1OFFAzYauMo" },
  { label: "🎸 Rock Gitar", id: "l2JIdnXD575Cs" },
  { label: "🎧 Müzik Keyfi", id: "l4Ep3N17MRJ7K" },
  { label: "🎤 Şarkı Söyleyen", id: "3oEdv0LJISfOiQGSmA" },
  { label: "🥳 Parti Zamanı", id: "l2JHPB2PtZCYiJ7S8" },
  { label: "🕶️ Cool Dansçı", id: "3o72F8t31QO40OT7" }
];

const outDir = path.join(__dirname, "public", "gifs");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function downloadGif(id, index) {
  const destPath = path.join(outDir, `${id}.gif`);
  if (fs.existsSync(destPath)) {
    console.log(`[${index + 1}/${GIFS.length}] Already downloaded: ${id}`);
    return;
  }

  const url = `https://i.giphy.com/${id}.gif`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!res.ok) {
      // Fallback to media.giphy.com if i.giphy.com fails
      const fallbackUrl = `https://media.giphy.com/media/${id}/giphy.gif`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (!fallbackRes.ok) {
        throw new Error(`Giphy CDN returned status ${res.status} and fallback ${fallbackRes.status}`);
      }
      const arrayBuffer = await fallbackRes.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
      console.log(`[${index + 1}/${GIFS.length}] Downloaded via fallback: ${id}`);
      return;
    }

    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    console.log(`[${index + 1}/${GIFS.length}] Downloaded: ${id}`);
  } catch (err) {
    console.error(`[${index + 1}/${GIFS.length}] Failed to download ${id}:`, err.message);
  }
}

async function run() {
  console.log(`Starting download of ${GIFS.length} GIFs...`);
  for (let i = 0; i < GIFS.length; i++) {
    await downloadGif(GIFS[i].id, i);
    // Add small delay to prevent rate limits
    await new Promise(r => setTimeout(r, 150));
  }
  console.log("Download complete!");
}

run();
