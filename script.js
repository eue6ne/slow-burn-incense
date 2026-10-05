const stage = document.getElementById("stage");
const timerText = document.getElementById("timer");

// 테스트할 때는 20으로 바꿔서 빨리 확인하세요 (버튼을 누르면 1분 단위로 바뀌어요)
let totalSeconds = 300;
let timerId = null;
let startTime = 0;
let endTime = 0;

// 버튼 그룹에서 하나만 선택되게 하고, 선택된 값을 알려줘요
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

// 선택한 재료의 향과 거치대만 보여줘요
function showItem(name) {
  document.querySelectorAll(".item").forEach(function (item) {
    item.classList.remove("active");
  });
  document.getElementById("item-" + name).classList.add("active");
}

// 초를 "05:00" 모양으로 바꿔요
function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, "0");
  const sec = String(seconds % 60).padStart(2, "0");
  return min + ":" + sec;
}

// 시간 조절: 1분 ~ 60분
function changeMinutes(delta) {
  totalSeconds = Math.min(3600, Math.max(60, totalSeconds + delta * 60));
  timerText.textContent = formatTime(totalSeconds);
}

// 연기 조각 하나를 불씨 위치에 만들어요
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

// 기다리는 도중 Stop을 누르면 runId가 바뀌어서 점화가 중단돼요
async function pause(ms, id) {
  await new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
  if (id !== runId) {
    throw "cancelled";
  }
}

// 요소 안의 한 지점(비율)을 stage 기준 좌표(px)로 바꿔요
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

// 별 모양으로 사방에 뻗는 불꽃 스파크
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

  // 선택 버튼이 있던 자리에서 나타나요
  moveTool(home, 0);
  await pause(60, id);
  tool.classList.add("show");
  await pause(500, id);

  // 성냥: 까슬한 면을 대각선으로 빠르게 긋고, 지나간 자리는 살짝 하얘져요
  if (type === "match") {
    box.classList.add("struck");
    moveTool(pointOf(strip, 0.83, 0.92), 0.25);
    await pause(300, id);
  }

  sparkBurst(pointOf(tool, 0, 0));
  tool.classList.add("on");
  await pause(500, id);

  // 불꽃이 일렁이며 향 끝으로 이동해서 3초 동안 불을 붙여요
  tool.classList.add("moving");
  moveTool(tip, 1.4);
  await pause(1400, id);
  tool.classList.remove("moving");
  await pause(3000, id);

  beginBurn();

  // 불을 끄고(성냥은 까맣게 탄 채로) 원래 자리로 돌아간 뒤 사라져요
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

// 점화가 끝나면 향이 타기 시작해요
function beginBurn() {
  const burnable = document.querySelector(".item.active .burnable");

  const burn = parseFloat(burnable.dataset.burn);
  const ash = parseFloat(burnable.dataset.ash);

  // 줄어드는 값은 CSS 변수로 넘기고, lit 클래스를 켜면 애니메이션이 시작돼요
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

  // 연기: 나왔다가 멈췄다가를 반복해요
  if (Math.sin((now - startTime) / 2000) > 0) {
    spawnPuff(false);
  }

  if (remaining === 0) {
    finishBurning();
  }
}

// 타이머가 끝나면 불이 꺼지고 마지막 연기가 피어올라요 (화면은 그대로 둬요)
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

// Stop이나 Again을 누르면 시작 화면으로 돌아가요
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