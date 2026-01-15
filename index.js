const express = require("express");
const fetch = require("node-fetch");

const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

app.use(express.urlencoded({ extended: true }));

/* =========================
   MANIFEST
========================= */
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "com.souhail.stremio",
    version: "1.0.0",
    name: "♻️🟢Souhail Premium🟢♻️",
    description: "Real-Debrid Streams (Clean & Technical)",
    resources: ["stream"],
    types: ["movie", "series"]
  });
});

/* =========================
   STREAM (ما تمسّش)
========================= */
app.get("/stream/:type/:id.json", async (req, res) => {
  if (!RD_KEY) return res.json({ streams: [] });

  try {
    const torrentioUrl =
      `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${req.params.type}/${req.params.id}.json`;

    const response = await fetch(torrentioUrl);
    const data = await response.json();

    let streams = (data.streams || [])
      .filter(s => !/(CAM|TS|TELE|SCR|HDCAM)/i.test(s.title || ""))
      .filter(s => /(2160p|1080p|720p)/i.test(s.title || ""))
      .sort((a, b) => extractSize(b.title) - extractSize(a.title))
      .map(s => {
        const title = s.title || "";

        return {
          ...s,
          name: "💥🟢SOUHAIL/RD🟢💥",
          title: `
1️⃣ ♻️ 🎬 ${extractCleanMovieTitle(title)}
2️⃣ ♻️ 💢 (${extractVideoRange(title)})                                            ♻️ 💾 ${formatSize(extractSize(title))}
3️⃣ ♻️ 📽️ ${extract(title, /(2160p|1080p|720p)/i)}.                                ♻️ 🎞️ ${extract(title, /(H\.265|H\.264|x265|x264)/i) || "H.264"} 
5️⃣ ♻️ 🔊 ${extract(title, /(Atmos|DDP5\.1|DD5\.1|AC3|AAC)/i) || "Audio"}          ♻️ 🌍 EN / AR
7️⃣ ♻️ 🧲 ${extract(title, /(YTS|RARBG|TPB|ThePirateBay|1337x)/i) || "Torrent"}    ♻️ ⚡ RD Cached
          `.trim()
        };
      });

    res.json({ streams });

  } catch {
    res.json({ streams: [] });
  }
});

/* =========================
   INSTALL PAGE
========================= */
app.get("/install", (req, res) => {
  const manifestUrl = `https://${req.hostname}/manifest.json`;

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>SOUHAIL / RD</title>
</head>
<body style="background:#0e0e0e;color:#fff;font-family:sans-serif;text-align:center;padding:40px">

<h1>🟢 SOUHAIL / RD</h1>
<p style="color:#aaa">Real-Debrid • Clean • TV Friendly</p>

<a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json"
style="display:block;margin:20px auto;padding:15px;background:#1db954;color:#000;
font-weight:bold;border-radius:10px;width:260px;text-decoration:none">
➕ Install Addon
</a>

<button onclick="copy()"
style="padding:12px 20px;border:none;border-radius:10px;background:#444;color:#fff">
📋 Copy Manifest URL
</button>

<p style="margin-top:25px">
<a href="/config" style="color:#1db954;text-decoration:none">🎨 Customization Preview</a>
</p>

<script>
function copy(){
  navigator.clipboard.writeText("${manifestUrl}");
  alert("Manifest URL copied");
}
</script>

</body>
</html>
  `);
});

/* =========================
   CONFIG (تزيين فقط)
========================= */
app.get("/config", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Customization</title>
</head>
<body style="background:#111;color:#fff;font-family:sans-serif;padding:30px">

<h2>🎨 Addon Appearance (Preview)</h2>

<label>Prefix:</label><br/>
<input id="name" value="SOUHAIL / RD" style="width:100%;padding:8px"/><br/><br/>

<label>Emoji:</label><br/>
<select id="emoji" style="width:100%;padding:8px">
  <option>🟢</option>
  <option>🔵</option>
  <option>🔴</option>
  <option>💎</option>
</select>

<h3 style="margin-top:30px">Preview:</h3>
<div id="preview" style="padding:15px;background:#000;border-radius:10px"></div>

<script>
function update(){
  const name = document.getElementById("name").value;
  const emoji = document.getElementById("emoji").value;
  document.getElementById("preview").innerText =
    emoji + " " + name + " " + emoji + "\\n🎬 Movie Title\\n📽️ 1080p • H.264";
}
document.getElementById("name").oninput = update;
document.getElementById("emoji").onchange = update;
update();
</script>

<p style="color:#888;margin-top:20px">
This page is only for visual preview
</p>

</body>
</html>
  `);
});

app.get("/", (req, res) => res.redirect("/install"));

/* =========================
   HELPERS
========================= */
function extract(text, regex) {
  const match = text.match(regex);
  return match ? match[0] : null;
}

function extractVideoRange(text) {
  if (/dolby\\s?vision|dv/i.test(text)) return "Dolby Vision";
  if (/hdr/i.test(text)) return "HDR";
  return "SDR";
}

function extractCleanMovieTitle(text) {
  return text
    .split(/\\b(2160p|1080p|720p|WEB|BluRay|HDR|DV|x264|x265)\\b/i)[0]
    .replace(/\\./g, " ")
    .trim();
}

function extractSize(text) {
  const m = text.match(/(\\d+(\\.\\d+)?)\\s?(GB|MB)/i);
  if (!m) return 0;
  return m[3].toUpperCase() === "GB" ? parseFloat(m[1]) * 1024 : parseFloat(m[1]);
}

function formatSize(size) {
  return size >= 1024 ? (size/1024).toFixed(2)+" GB" : size.toFixed(0)+" MB";
}

/* =========================
   START
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});
