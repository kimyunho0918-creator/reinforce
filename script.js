// ===================================
// 데이터 설정 및 초기 변수 (하드코어 난이도)
// ===================================
let currentLevel = 0, schoolBudget = 0, gameStarted = false, maxLevelAchieved = 0;
let currentPlayerId = "";
let currentPlayerName = "";

// 인벤토리 아이템 수량
let inventory = { basicProtect: 0, advProtect: 0, probBuff: 0 };

// 타이밍 게이지 변수
let timingPosition = 0;
let timingDirection = 1;
let timingSpeed = 2;
let animationFrameId;
let isAnimating = false;
let isTimingModalOpen = false;

const levelNames = ["빈 공터", "텐트 교실", "나무 판자 학교", "고철을 덧붙인 학교", "쓰러져가는 콘크리트 교실", "컨테이너 교실", "작은 벽돌 학교", "초등학교 건물", "모듈러 교실", "(구) 청주신흥고등학교", "그린 스마트 스쿨 청주신흥고등학교", "스마트 AI 학교", "에코(Eco) 학교", "친환경 에너지 발전 학교", "증강현실 융합 학교", "메타버스 학교(15)", "무한 에너지 학교", "우주 정거장 학교", "초지능 학교", "은하계 교육 허브", "초미래형 교육형 럭셔리 신흥고등학교(20)"];

// 강화 비용 (상승 곡선 가파름)
const enhancementCosts = [30000, 30000, 50000, 50000, 100000, 150000, 200000, 250000, 300000, 500000, 1000000, 2000000, 4000000, 8000000, 15000000, 25000000, 40000000, 60000000, 80000000, 100000000, 0];
const schoolValues = [0, 15000, 40000, 60000, 80000, 160000, 350000, 610000, 1000000, 2000000, 3510000, 16000000, 35000000, 100000000, 300000000, 750000000, 1500000000, 3000000000, 7000000000, 15000000000, 99999999999];

// 하드코어 난이도 확률 (극악)
const successRates = [1.00, 0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.35, 0.30, 0.25, 0.20, 0.15, 0.10, 0.08, 0.05, 0.03, 0.02, 0.01, 0.005, 0.001];

// 상점 가격
const shopPrices = { basicProtect: 1000000, advProtect: 20000000, probBuff: 500000 };

const views = document.querySelectorAll('.screen');
const startGameBtn = document.getElementById('start-game-btn');
const loadGameBtn = document.getElementById('load-game-btn');
const openEnhanceBtn = document.getElementById('open-enhance-btn');
const endGameBtn = document.getElementById('end-game-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const saveBadge = document.getElementById('save-badge');
const failureOverlay = document.getElementById('failure-overlay');
const retryBtn = document.getElementById('retry-btn');
const timingModal = document.getElementById('timing-modal');

// ===================================
// 타이밍 기믹 및 스페이스바 연동
// ===================================
const cursorEl = document.getElementById('timing-cursor');
const feedbackEl = document.getElementById('timing-feedback');
const tmHitBtn = document.getElementById('tm-hit-btn');
const tmCancelBtn = document.getElementById('tm-cancel-btn');

function startTimingGame() {
  if (isAnimating) return;
  isAnimating = true;
  timingPosition = 0;
  
  // 속도: 레벨이 오를수록 게이지가 미친듯이 빨라짐
  timingSpeed = 2.5 + (currentLevel * 0.5);

  function animate() {
    timingPosition += timingSpeed * timingDirection;
    if (timingPosition >= 100) { timingPosition = 100; timingDirection = -1; } 
    else if (timingPosition <= 0) { timingPosition = 0; timingDirection = 1; }
    
    cursorEl.style.left = timingPosition + '%';
    animationFrameId = requestAnimationFrame(animate);
  }
  animate();
}

function stopTimingGame() {
  isAnimating = false;
  cancelAnimationFrame(animationFrameId);
}

// 스페이스바 이벤트 (모달이 열려있을 때만 작동)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && isTimingModalOpen && !tmHitBtn.disabled) {
    e.preventDefault();
    tmHitBtn.click();
  }
});

// ===================================
// 시스템 UI 및 헬퍼 함수
// ===================================
function showView(viewId) { 
  views.forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

function showSaveBadge() {
  saveBadge.style.opacity = '1';
  setTimeout(() => { saveBadge.style.opacity = '0'; }, 1500);
}

function autoSave() {
  const saveData = { currentLevel, schoolBudget, gameStarted, maxLevelAchieved, currentPlayerId, currentPlayerName, inventory };
  localStorage.setItem('schoolGameSaveHC', JSON.stringify(saveData));
  showSaveBadge();
}

function clearSaveData() {
  localStorage.removeItem('schoolGameSaveHC');
}

function updateDisplay() {
  if (currentLevel > maxLevelAchieved) { maxLevelAchieved = currentLevel; }
  
  document.getElementById('disp-id').textContent = currentPlayerId || "-";
  document.getElementById('disp-name').textContent = currentPlayerName || "-";
  document.getElementById('max-level-display').textContent = `${maxLevelAchieved}강`;
  document.getElementById('budget').textContent = schoolBudget.toLocaleString() + "원";
  document.getElementById('school-value').textContent = schoolValues[currentLevel].toLocaleString() + "원";
  document.getElementById('school-level-name').textContent = `+${currentLevel} ${levelNames[currentLevel]}`;
  
  const imgNum = String(currentLevel).padStart(2, '0');
  document.getElementById('school-image').src = `school_${imgNum}.png`;

  // 인벤토리 갱신
  document.getElementById('inv-basic').textContent = inventory.basicProtect + '개';
  document.getElementById('inv-adv').textContent = inventory.advProtect + '개';
  document.getElementById('inv-buff').textContent = inventory.probBuff + '개';

  if (currentLevel >= 20) {
    document.getElementById('cost').textContent = "최종 진화 완료!";
    document.getElementById('school-probability').textContent = "더 이상 강화할 수 없습니다.";
    document.getElementById('school-probability').style.color = "var(--blue)";
    openEnhanceBtn.disabled = true;
    openEnhanceBtn.textContent = "강화 종료";
    autoSave();
    return;
  }
  
  openEnhanceBtn.disabled = false;
  openEnhanceBtn.textContent = "건물 강화하기 (팝업)";
  document.getElementById('cost').textContent = enhancementCosts[currentLevel].toLocaleString() + '원';
  document.getElementById('school-probability').textContent = `기본 확률 ${(successRates[currentLevel] * 100).toFixed(1)}%`;
  document.getElementById('school-probability').style.color = "var(--green)";
  
  if(gameStarted) autoSave();
}

// ===================================
// 상점 시스템 로직
// ===================================
window.buyItem = function(itemType) {
  const price = shopPrices[itemType];
  if (schoolBudget < price) {
    alert("예산이 부족합니다!");
    return;
  }
  schoolBudget -= price;
  inventory[itemType]++;
  updateDisplay();
};

// ===================================
// 강화 모달 (빨/노/초 기믹) 로직
// ===================================
openEnhanceBtn.addEventListener('click', () => {
  if (currentLevel >= 20) return;
  if (schoolBudget < enhancementCosts[currentLevel]) {
    alert("강화 예산이 부족합니다!"); return;
  }

  document.getElementById('tm-level-info').textContent = `+${currentLevel} ➡ +${currentLevel + 1}`;
  document.getElementById('tm-cost').textContent = enhancementCosts[currentLevel].toLocaleString() + "원";
  
  const chkBasic = document.getElementById('use-basic-protect');
  const chkAdv = document.getElementById('use-adv-protect');
  const chkBuff = document.getElementById('use-prob-buff');
  
  chkBasic.checked = false; chkAdv.checked = false; chkBuff.checked = false;
  
  document.getElementById('tm-inv-basic').textContent = inventory.basicProtect;
  document.getElementById('tm-inv-adv').textContent = inventory.advProtect;
  document.getElementById('tm-inv-buff').textContent = inventory.probBuff;

  if (currentLevel <= 15) {
    document.getElementById('label-basic-protect').classList.remove('disabled');
    document.getElementById('label-adv-protect').classList.add('disabled');
    if(inventory.basicProtect <= 0) document.getElementById('label-basic-protect').classList.add('disabled');
  } else {
    document.getElementById('label-basic-protect').classList.add('disabled');
    document.getElementById('label-adv-protect').classList.remove('disabled');
    if(inventory.advProtect <= 0) document.getElementById('label-adv-protect').classList.add('disabled');
  }
  
  if(inventory.probBuff <= 0) {
    document.getElementById('label-prob-buff').classList.add('disabled');
  } else {
    document.getElementById('label-prob-buff').classList.remove('disabled');
  }
  
  const buffBonus = 15 * (1 - (currentLevel / 20));
  document.getElementById('tm-buff-amt').textContent = buffBonus.toFixed(1);

  timingModal.classList.add('open');
  isTimingModalOpen = true;
  tmHitBtn.disabled = false;
  feedbackEl.textContent = "초록(확률업) / 노랑(기본) / 빨강(즉시파괴)";
  feedbackEl.style.color = "var(--text)";
  
  startTimingGame();
});

tmCancelBtn.addEventListener('click', () => {
  stopTimingGame();
  timingModal.classList.remove('open');
  isTimingModalOpen = false;
});

tmHitBtn.addEventListener('click', () => {
  stopTimingGame();
  tmHitBtn.disabled = true; 
  
  schoolBudget -= enhancementCosts[currentLevel];
  
  const chkBasic = document.getElementById('use-basic-protect').checked;
  const chkAdv = document.getElementById('use-adv-protect').checked;
  const chkBuff = document.getElementById('use-prob-buff').checked;
  
  let protectUsed = false;
  if (chkBasic && currentLevel <= 15 && inventory.basicProtect > 0) { inventory.basicProtect--; protectUsed = true; }
  if (chkAdv && currentLevel > 15 && inventory.advProtect > 0) { inventory.advProtect--; protectUsed = true; }
  
  let finalProbability = successRates[currentLevel];
  
  if (chkBuff && inventory.probBuff > 0) {
    inventory.probBuff--;
    const buffBonus = 0.15 * (1 - (currentLevel / 20));
    finalProbability += buffBonus;
  }
  
  // 🎯 3색 영역 판정
  // 초록: 46% ~ 54% | 노랑: 30% ~ 70% | 빨강: 나머지 전부
  if (timingPosition >= 46 && timingPosition <= 54) {
    finalProbability += 0.10; // 초록색 명중: 확률 보너스
    feedbackEl.innerHTML = `<span style="color:var(--green)">PERFECT! 초록색 명중! (확률 증가)</span>`;
  } else if (timingPosition >= 30 && timingPosition <= 70) {
    // 노란색 명중: 기본 확률 유지
    feedbackEl.innerHTML = `<span style="color:#f1c40f">GOOD! 노란색 명중! (기본 확률)</span>`;
  } else {
    finalProbability = 0; // 빨간색 명중: 즉시 실패 확정
    feedbackEl.innerHTML = `<span style="color:var(--red)">MISS! 빨간색 명중! (즉시 실패)</span>`;
  }

  setTimeout(() => {
    timingModal.classList.remove('open');
    isTimingModalOpen = false;

    // 만약 빨간색에 맞아 finalProbability가 0이 되었다면 무조건 else 구문(실패)으로 감
    if (Math.random() < finalProbability) {
      currentLevel++;
      updateDisplay();
    } else { 
      if (protectUsed) {
        alert("💥 강화 실패! 하지만 파괴 방지권이 학교를 지켰습니다.");
        updateDisplay();
      } else {
        clearSaveData();
        failureOverlay.classList.add('open');
      }
    }
  }, 1000);
});

// ===================================
// 명예의 전당 및 게임 종료
// ===================================
function loadLeaderboard() { return JSON.parse(localStorage.getItem('schoolLeaderboardHC')) || []; }
function saveToLeaderboard(score) {
  const scores = loadLeaderboard();
  scores.push(score);
  scores.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.budget - a.budget;
  });
  localStorage.setItem('schoolLeaderboardHC', JSON.stringify(scores));
}
function renderLeaderboard() {
  const scores = loadLeaderboard();
  leaderboardList.innerHTML = '';
  if (scores.length === 0) {
    leaderboardList.innerHTML = '<div style="color:var(--muted); text-align:center; padding:15px 0;">등록된 기록이 없습니다.</div>';
    return;
  }
  scores.slice(0, 15).forEach((score, index) => {
    const li = document.createElement('div');
    li.className = 'port-item';
    let rankColor = "var(--text)";
    if(index === 0) rankColor = "#f1c40f"; else if(index === 1) rankColor = "#bdc3c7"; else if(index === 2) rankColor = "#cd7f32"; 
    li.innerHTML = `
      <div class="lb-left">
        <span class="lb-name" style="color:${rankColor};">${index + 1}위 | ${score.name}</span>
        <span class="lb-id">${score.id || "익명"}</span>
      </div>
      <div class="lb-right">
        <div class="lb-level">${score.level}강</div>
        <div class="lb-budget">${score.budget.toLocaleString()}원</div>
      </div>
    `;
    leaderboardList.appendChild(li);
  });
}

function performEndGame() {
  if (currentLevel > 0 || schoolBudget > 20000000) {
    const score = { id: currentPlayerId, name: currentPlayerName, level: maxLevelAchieved, budget: schoolBudget };
    saveToLeaderboard(score);
  }
  clearSaveData();
  renderLeaderboard();
  showView('lobby-view');
  loadGameBtn.style.display = 'none';
  document.getElementById('player-id-input').value = '';
  document.getElementById('player-name-input').value = '';
}

startGameBtn.addEventListener('click', () => {
  const idVal = document.getElementById('player-id-input').value.trim();
  const nameVal = document.getElementById('player-name-input').value.trim();
  if (!nameVal) { alert('이름을 반드시 입력해주세요!'); return; }
  
  currentPlayerId = idVal; currentPlayerName = nameVal;
  
  currentLevel = 0; maxLevelAchieved = 0; schoolBudget = 20000000; 
  inventory = { basicProtect: 0, advProtect: 0, probBuff: 0 };
  gameStarted = true;
  
  updateDisplay();
  showView('main-game-view');
});

loadGameBtn.addEventListener('click', () => {
  const saved = JSON.parse(localStorage.getItem('schoolGameSaveHC'));
  if(saved) {
    currentLevel = saved.currentLevel; schoolBudget = saved.schoolBudget; gameStarted = saved.gameStarted;
    maxLevelAchieved = saved.maxLevelAchieved; currentPlayerId = saved.currentPlayerId || ""; currentPlayerName = saved.currentPlayerName || "Unknown";
    inventory = saved.inventory || { basicProtect: 0, advProtect: 0, probBuff: 0 };
    updateDisplay();
    showView('main-game-view');
  }
});

retryBtn.addEventListener('click', () => {
  currentLevel = 0; schoolBudget = 20000000;
  inventory = { basicProtect: 0, advProtect: 0, probBuff: 0 };
  failureOverlay.classList.remove('open');
  updateDisplay();
});

endGameBtn.addEventListener('click', () => {
  if(confirm("정말 게임을 포기하고 현재 상태를 랭킹에 등록하시겠습니까?")) performEndGame();
});

if (localStorage.getItem('schoolGameSaveHC')) loadGameBtn.style.display = 'block';
renderLeaderboard();
showView('lobby-view');
