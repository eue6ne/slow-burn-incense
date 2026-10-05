const stage = document.getElementById("stage");
const timerText = document.getElementById("timer");

let totalSeconds = 300;
let timerId = null;
let startTime = 0;
let endTime = 0;

function setupGroup(selector, onSelect) {
  const buttons = document.querySelectorAll(selector);

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      buttons.forEach(function (b) {
        b.classList.remove("selected");
      });
      button.classList.add("selected");

      if (onSelect) {
        onSelect(button.dataset.value);
      }
    });
  });
}

function showItem(name) {
  document.querySelectorAll(".item").forEach(function (item) {
    item.classList.remove("active");
  });
  document.getElementById("item-" + name).classList.add("active");
}

function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, "0");
  const sec = String(seconds % 60).padStart(2, "0");
  return min + ":" + sec;
}

function changeMinutes(delta) {
  totalSeconds = Math.min(3600, Math.max(60, totalSeconds + delta * 60));
  timerText.textContent = formatTime(totalSeconds);
}

function spawnPuff(big) {
  const ember = document.querySelector(".item.active .ember");
  if (!ember || stage.dataset.state === "idle") {
    return;
  }

  const s = stage.getBoundingClientRect();
  const e = ember.getBoundingClientRect();
  const puff = document.createElement("div");

  puff.className = big ? "puff big" : "puff";
  puff.style.left = e.left - s.left + e.width / 2 + "px";
  puff.style.top = e.top - s.top + e.height / 2 + "px";
  puff.style.setProperty("--drift", 2 + Math.random() * 4 + "cqw");
  puff.style.animationDuration = (big ? 8 : 5 + Math.random() * 2) + "s";

  stage.appendChild(puff);
  puff.addEventListener("animationend", function () {
    puff.remove();
  });
}

const tool = document.getElementById("tool");
const box = document.getElementById("box");
let runId = 0;

async function pause(ms, id) {
  await new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
  if (id !== runId) {
    throw "cancelled";
  }
}

function pointOf(el, fx, fy) {
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - s.left + r.width * fx, y: r.top - s.top + r.height * fy };
}

function moveTool(p, seconds) {
  tool.style.setProperty("--move", seconds + "s");
  tool.style.left = p.x + "px";
  tool.style.top = p.y + "px";
}

function sparkBurst(p) {
  for (let i = 0; i < 8; i++) {
    const spark = document.createElement("div");

    spark.className = "spark";
    spark.style.left = p.x + "px";
    spark.style.top = p.y + "px";
    spark.style.setProperty("--a", i * 45 + Math.random() * 20 + "deg");
    spark.style.setProperty("--len", 1 + Math.random() * 1.5 + "cqw");
    stage.appendChild(spark);
    spark.addEventListener("animationend", function () {
      spark.remove();
    });
  }
}

async function ignite(id) {
  const type = document.querySelector(".ignition.selected").dataset.value;
  const strip = box.querySelector(".strip");
  const tip = pointOf(document.querySelector(".item.active .burn-line"), 0.5, 0.5);
  const home =
    type === "match"
      ? pointOf(strip, 0.17, 0.08)
      : pointOf(document.querySelector(".ignitions"), 0.5, 0.5);

  tool.className = "";
  box.className = type === "match" ? "show" : "";
  tool.dataset.type = type;

  moveTool(home, 0);
  await pause(60, id);
  tool.classList.add("show");
  await pause(500, id);

  if (type === "match") {
    box.classList.add("struck");
    moveTool(pointOf(strip, 0.83, 0.92), 0.25);
    await pause(300, id);
  }

  sparkBurst(pointOf(tool, 0, 0));
  tool.classList.add("on");
  await pause(500, id);

  tool.classList.add("moving");
  moveTool(tip, 1.4);
  await pause(1400, id);
  tool.classList.remove("moving");
  await pause(3000, id);

  beginBurn();

  tool.classList.remove("on");
  tool.classList.add("burnt");
  await pause(400, id);
  moveTool(home, 1.2);
  await pause(1200, id);
  tool.classList.remove("show");
  box.classList.remove("show");
}

async function startBurning() {
  if (stage.dataset.state !== "idle") {
    return;
  }

  const id = ++runId;
  stage.dataset.state = "igniting";

  try {
    await ignite(id);
  } catch (error) {
    if (error !== "cancelled") {
      console.error(error);
    }
  }
}

function beginBurn() {
  const burnable = document.querySelector(".item.active .burnable");

  const burn = parseFloat(burnable.dataset.burn);
  const ash = parseFloat(burnable.dataset.ash);

  burnable.style.setProperty("--burn", burn + "%");
  burnable.style.setProperty("--ash-cut", Math.max(0, burn - ash) + "%");
  burnable.style.setProperty("--time", totalSeconds + "s");
  burnable.classList.add("lit");

  stage.dataset.state = "burning";
  startTime = Date.now();
  endTime = startTime + totalSeconds * 1000;
  timerId = setInterval(tick, 300);
}

function tick() {
  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
  timerText.textContent = formatTime(remaining);

  if (Math.sin((now - startTime) / 2000) > 0) {
    spawnPuff(false);
  }

  if (remaining === 0) {
    finishBurning();
  }
}

function finishBurning() {
  clearInterval(timerId);
  timerId = null;
  stage.dataset.state = "done";

  for (let i = 0; i < 12; i++) {
    setTimeout(function () {
      spawnPuff(true);
    }, i * 300);
  }
}

function backToStart() {
  runId++;
  tool.className = "";
  box.className = "";
  document.querySelectorAll(".spark").forEach(function (spark) {
    spark.remove();
  });

  clearInterval(timerId);
  timerId = null;
  stage.dataset.state = "idle";
  timerText.textContent = formatTime(totalSeconds);

  document.querySelectorAll(".burnable").forEach(function (el) {
    el.classList.remove("lit");
  });
  document.querySelectorAll(".puff").forEach(function (puff) {
    puff.remove();
  });
}

setupGroup(".material", showItem);
setupGroup(".ignition");

document.getElementById("start").addEventListener("click", startBurning);
document.getElementById("stop").addEventListener("click", backToStart);
document.getElementById("again").addEventListener("click", backToStart);

document.getElementById("minus").addEventListener("click", function () {
  changeMinutes(-1);
});
document.getElementById("plus").addEventListener("click", function () {
  changeMinutes(1);
});

timerText.textContent = formatTime(totalSeconds);