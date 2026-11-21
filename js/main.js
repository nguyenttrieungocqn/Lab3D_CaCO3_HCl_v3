import { Reaction, MOLAR_MASS, MOLAR_VOLUME } from "./chemistry.js";

import { drawChart } from "./chart.js";

export let app;

function bootstrap() {
  const $ = id => document.getElementById(id);
  const inputs = [ $("acidRange"), $("tempRange"), $("sizeSelect"), $("massRange") ];
  const parameters = () => ({
    concentration: Number(inputs[0].value),
    temperature: Number(inputs[1].value),
    diameter: Number(inputs[2].value),
    mass: Number(inputs[3].value),
    volume: .1
  });
  const fmt = (value, digits = 1) => value.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
  const model = new Reaction(parameters());
  let view = null, running = false, speed = 5, experimental = [], raf = 0, last = performance.now(), lastUI = 0, disposed = false;
  function labels() {
    const p = parameters();
    $("acidValue").textContent = fmt(p.concentration) + " M";
    $("tempValue").textContent = p.temperature + " °C";
    $("massValue").textContent = fmt(p.mass) + " g";
    $("sceneTemp").textContent = p.temperature + " °C · 100 mL HCl";
  }
  function update() {
    labels();
    const max = model.limit * MOLAR_VOLUME;
    const metric = (id, value, unit) => {
      $(id).replaceChildren(document.createTextNode(value));
      const span = document.createElement("span");
      span.className = "metric-unit";
      span.textContent = unit;
      $(id).append(span);
    };
    metric("co2Metric", fmt(model.co2), "mL");
    metric("timeMetric", fmt(model.time), "s");
    metric("massMetric", fmt(model.remainingCa * MOLAR_MASS, 2), "g");
    metric("rateMetric", model.initialRate === null ? "—" : fmt(model.initialRate), "mL/s");
    $("co2Theory").textContent = "Lý thuyết: " + fmt(max) + " mL";
    $("massFoot").textContent = "Ban đầu: " + fmt(model.p.mass, 2) + " g";
    $("theoryValue").textContent = fmt(max) + " mL";
    $("limitingValue").textContent = Math.abs(model.initialCa - model.initialH / 2) < 1e-10 ? "Vừa đủ" : model.initialCa < model.initialH / 2 ? "CaCO₃" : "HCl";
    $("reactedValue").textContent = fmt(model.extent * MOLAR_MASS, 2) + " g";
    $("acidLeftValue").textContent = fmt(model.remainingH * 1e3) + " mmol";
    $("progressText").textContent = fmt(model.progress * 100) + "%";
    $("progressBar").style.width = model.progress * 100 + "%";
    $("stateText").textContent = model.done ? "Hoàn tất (99,5%)" : running ? "Đang phản ứng" : model.time ? "Tạm dừng" : "Sẵn sàng";
    $("stateDot").classList.toggle("running", running);
    $("startBtn").textContent = running ? "Ⅱ Tạm dừng" : model.time ? "▶ Tiếp tục" : "▶ Bắt đầu";
    $("startBtn").disabled = model.done;
    $("startBtn").setAttribute("aria-pressed", String(running));
    const points = [ ...model.history ];
    if (points.at(-1)[0] !== model.time) points.push([ model.time, model.co2 ]);
    drawChart($("chart"), points, experimental, max);
  }
  function reset() {
    running = false;
    inputs.forEach(input => input.disabled = false);
    model.reset(parameters());
    view?.reset(model.p);
    view?.sync(model.fraction);
    update();
  }
  $("startBtn").addEventListener("click", () => {
    if (model.done) return;
    running = !running;
    inputs.forEach(input => input.disabled = true);
    last = performance.now();
    update();
  });
  $("resetBtn").addEventListener("click", reset);
  inputs.forEach(input => input.addEventListener(input.tagName === "SELECT" ? "change" : "input", reset));
  document.querySelectorAll("[data-speed]").forEach(button => button.addEventListener("click", () => {
    speed = Number(button.dataset.speed);
    document.querySelectorAll("[data-speed]").forEach(item => item.classList.toggle("active", item === button));
  }));
  $("exportBtn").addEventListener("click", () => {
    const points = [ ...model.history ];
    if (points.at(-1)[0] !== model.time) points.push([ model.time, model.co2 ]);
    // Excel on Vietnamese regional settings expects semicolon columns and comma decimals.
    const csvNumber = value => String(value).replace(".", ",");
    const csv = "\uFEFFsep=;\ntime_s;co2_ml\n" +
      points.map(point => point.map(csvNumber).join(";")).join("\n");
    const blob = new Blob([ csv ], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = "caco3_hcl_simulation.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  });
  $("csvInput").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2e6) throw new Error("Tệp vượt quá 2 MB.");
      const lines = (await file.text()).replace(/^\uFEFF/, "").trim().split(/\r?\n/);
      if (/^sep=./i.test(lines[0]?.trim() || "")) lines.shift();
      const header = (lines.shift() || "").trim();
      const delimiter = header.includes(";") ? ";" : header.includes("\t") ? "\t" : ",";
      if (!/^time_s\s*[,;\t]\s*co2_ml\s*$/i.test(header)) throw new Error("Cần tiêu đề time_s và co2_ml.");
      const parseNumber = value => Number(delimiter === ";" ? value.trim().replace(",", ".") : value.trim());
      const points = lines.filter(line => line.trim()).map(line => {
        const columns = line.trim().split(delimiter);
        if (columns.length !== 2 || columns.some(value => !value.trim())) throw new Error("Mỗi dòng cần hai số.");
        const pair = columns.map(parseNumber);
        if (pair.some(value => !Number.isFinite(value) || value < 0)) throw new Error("Dữ liệu phải là số hữu hạn, không âm.");
        return pair;
      });
      if (!points.length || points.length > 2e4) throw new Error("Cần từ 1 đến 20.000 điểm.");
      for (let i = 1; i < points.length; i++) if (points[i][0] <= points[i - 1][0]) throw new Error("Thời gian phải tăng dần.");
      experimental = points;
      $("realStatus").textContent = "Đã nạp " + points.length + " điểm thực nghiệm.";
    } catch (error) {
      $("realStatus").textContent = error.message;
    }
    event.target.value = "";
    update();
  });
  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe($("chart"));
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
  });
  $("scene").addEventListener("webglcontextlost", event => {
    event.preventDefault();
    running = false;
    $("sceneFallback").classList.add("is-visible");
    $("sceneFallbackStatus").textContent = "WebGL đã mất context. Tải lại trang để khôi phục 3D.";
    update();
  });
  function animate(now) {
    if (disposed) return;
    const dt = document.hidden ? 0 : Math.min(Math.max(0, (now - last) / 1e3), .05);
    last = now;
    if (running) {
      const delta = model.advance(dt * speed);
      view?.sync(model.fraction);
      view?.emit(delta);
      if (model.done) {
        running = false;
        update();
      }
    }
    if (running || model.done) view?.tick(dt);
    view?.render();
    if (now - lastUI >= 100) {
      update();
      lastUI = now;
    }
    raf = requestAnimationFrame(animate);
  }
  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    view?.dispose();
  }
  window.addEventListener("pagehide", event => {
    if (!event.persisted) dispose();
  });
  reset();
  raf = requestAnimationFrame(animate);
  import("./scene.js").then(({createScene: createScene}) => {
    if (disposed) return;
    try {
      view = createScene($("scene"));
      view.reset(model.p);
      view.sync(model.fraction);
      view.render();
      $("sceneFallback").classList.remove("is-visible");
    } catch (error) {
      view?.dispose();
      view = null;
      $("sceneFallbackStatus").textContent = "Không khởi tạo được WebGL. Hãy kiểm tra tăng tốc phần cứng của trình duyệt.";
    }
  }).catch(() => {
    $("sceneFallbackStatus").textContent = "Không tải được thư viện 3D. Hãy chạy index.html bằng Live Server.";
  });
  return {
    model: model,
    reset: reset,
    dispose: dispose,
    get view() {
      return view;
    },
    get running() {
      return running;
    }
  };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => {
  app = bootstrap();
}, {
  once: true
}); else app = bootstrap();
