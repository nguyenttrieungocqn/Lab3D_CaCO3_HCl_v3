export function drawChart(canvas, simulation, experimental, theoretical) {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (!w || !h) return;
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const pad = {
    l: 48,
    r: 12,
    t: 12,
    b: 35
  }, iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  let maxX = 10, maxY = Math.max(10, theoretical * 1.1);
  for (const list of [ simulation, experimental ]) for (const [x, y] of list) {
    maxX = Math.max(maxX, x * 1.05);
    maxY = Math.max(maxY, y * 1.1);
  }
  ctx.font = "10px system-ui";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const x = pad.l + iw * i / 4, y = pad.t + ih - ih * i / 4;
    ctx.strokeStyle = "#25374b";
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + ih);
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = "#91a8c0";
    ctx.textAlign = "center";
    ctx.fillText((maxX * i / 4).toFixed(1), x, h - 18);
    ctx.textAlign = "right";
    ctx.fillText((maxY * i / 4).toFixed(0), pad.l - 8, y + 3);
  }
  ctx.fillStyle = "#91a8c0";
  ctx.textAlign = "center";
  ctx.fillText("Thời gian · s", pad.l + iw / 2, h - 2);
  ctx.save();
  ctx.translate(10, pad.t + ih / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("V(CO₂) · mL", 0, 0);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l, pad.t, iw, ih);
  ctx.clip();
  for (const [list, color] of [ [ simulation, "#48d5e5" ], [ experimental, "#ffbd4a" ] ]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    list.forEach(([x, y], i) => {
      const px = pad.l + x / maxX * iw, py = pad.t + ih - y / maxY * ih;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.stroke();
  }
  ctx.restore();
}
