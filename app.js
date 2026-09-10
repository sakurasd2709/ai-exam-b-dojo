/**
 * AI実装検定® B級 過去問・演習道場 - Frontend Application Logic
 */

// ==========================================
// 1. State Management
// ==========================================
let allQuestions = [];
let videoCatalog = [];
let activeQuestions = [];
let currentQuestionIndex = 0;

let currentMode = 'practice'; // 'practice' | 'exam'
let currentSet = 'all'; // 'all' | 'exam30' | 'topic1'..'topic7' | 'random10' | 'set1'..'set9'
let currentFilter = 'all'; // 'all' | 'incorrect' | 'bookmarked' | 'unanswered'

let userAnswers = {}; // { [questionId]: answerData }
let sessionCheckedQuestions = new Set();

let historyData = {
  results: {}, // { [questionId]: { isCorrect: boolean, answeredAt: string } }
  bookmarks: new Set(),
  dailyActivity: {}, // { "YYYY-MM-DD": { answered: number, correct: number } }
  lastQuestionId: 1,
  lastSet: 'all'
};

let examTimerInterval = null;
let examTimeRemaining = 40 * 60; // 40 minutes in seconds
let examQuestionPool = []; // Dedicated pool for active exam questions (BUG-01)
let examEndTime = null;    // Timestamp for wall-clock timer sync (BUG-02)

// LocalStorage Keys
const STORAGE_KEY_HISTORY = 'ai_exam_b_history_v1';
const STORAGE_KEY_BOOKMARKS = 'ai_exam_b_bookmarks_v1';
const STORAGE_KEY_SYNC_PASSCODE = 'ai_exam_b_sync_passcode_v1';
let syncPasscode = '';

// ==========================================
// 2. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadHistoryFromStorage();
  initCloudSync(); // クラウド同期の初期化（URLパラメータ検出 & 自動Pull）

  // BUG-12: Restore last active set on startup
  if (historyData.lastSet && historyData.lastSet !== 'exam30') {
    currentSet = historyData.lastSet;
    updateSetButtonsUI();
  }
  updateStreakDisplay();
  setupEventListeners();
  applyCurrentSetAndFilter(true); // 自動的に前回の到達設問から再開
});

function loadData() {
  if (window.QUESTIONS_DATA && Array.isArray(window.QUESTIONS_DATA)) {
    allQuestions = window.QUESTIONS_DATA;
  } else {
    // BUG-13: Replace dead fetch warning with clear error state
    console.error('CRITICAL: QUESTIONS_DATA is not available on window. Please ensure data/questions.js is loaded.');
    const qTextEl = document.getElementById('questionText');
    if (qTextEl) {
      qTextEl.textContent = '問題データの読み込みに失敗しました。data/questions.js が正常に読み込まれているか確認してください。';
    }
  }

  if (window.VIDEO_CATALOG && Array.isArray(window.VIDEO_CATALOG)) {
    videoCatalog = window.VIDEO_CATALOG;
  } else {
    console.warn('VIDEO_CATALOG is not available on window. Running without video catalog.');
    videoCatalog = [];
  }
}

function loadHistoryFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (saved) {
      const parsed = jsonParseSafe(saved);
      if (parsed) {
        historyData.results = parsed.results || {};
        historyData.dailyActivity = parsed.dailyActivity || {};
        historyData.lastQuestionId = parsed.lastQuestionId || 1;
        historyData.lastSet = parsed.lastSet || 'all';
      }
    }

    const savedBookmarks = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (savedBookmarks) {
      const arr = jsonParseSafe(savedBookmarks);
      if (Array.isArray(arr)) {
        historyData.bookmarks = new Set(arr);
      }
    }
  } catch (e) {
    console.error('Error loading history:', e);
  }
}

function saveHistoryToStorage() {
  try {
    const toSave = {
      results: historyData.results,
      dailyActivity: historyData.dailyActivity,
      lastQuestionId: historyData.lastQuestionId,
      lastSet: historyData.lastSet
    };
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(toSave));
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(Array.from(historyData.bookmarks)));
  } catch (e) {
    console.error('Error saving history:', e);
  }
}

function jsonParseSafe(str) {
  try { return JSON.parse(str); } catch { return null; }
}

// ==========================================
// 3. Streak & Daily Tracking
// ==========================================
function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function recordAnswerActivity(isCorrect) {
  const today = getTodayString();
  if (!historyData.dailyActivity[today]) {
    historyData.dailyActivity[today] = { answered: 0, correct: 0 };
  }
  historyData.dailyActivity[today].answered += 1;
  if (isCorrect) {
    historyData.dailyActivity[today].correct += 1;
  }
  saveHistoryToStorage();
  updateStreakDisplay();
}

function calculateStreak() {
  const dates = Object.keys(historyData.dailyActivity)
    .filter(d => historyData.dailyActivity[d].answered > 0)
    .sort()
    .reverse();

  if (dates.length === 0) return 0;

  const today = getTodayString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yYear = yesterdayDate.getFullYear();
  const yMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
  const yDay = String(yesterdayDate.getDate()).padStart(2, '0');
  const yesterday = `${yYear}-${yMonth}-${yDay}`;

  // If didn't study today or yesterday, streak broken
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  let curr = new Date(dates[0]);

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i]);
    const diffDays = Math.round((curr - prevDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      curr = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

function updateStreakDisplay() {
  const streak = calculateStreak();
  const streakEl = document.getElementById('streakCount');
  if (streakEl) streakEl.textContent = streak;

  const today = getTodayString();
  const todayCount = historyData.dailyActivity[today]?.answered || 0;
  const todayCountEl = document.getElementById('todayAnsweredCount');
  if (todayCountEl) todayCountEl.textContent = todayCount;
}

// ==========================================
// 4. Set & Filter Management
// ==========================================
function applyCurrentSetAndFilter(restoreLastQuestion = false) {
  let pool = [...allQuestions];

  // 1. Apply Set Filtering
  if (currentMode === 'exam' || currentSet === 'exam30') {
    // BUG-01: Protect exam question pool from being overwritten on filter changes
    if (examQuestionPool.length === 0) {
      examQuestionPool = getRandomSample(allQuestions, 30);
    }
    pool = [...examQuestionPool];
  } else if (currentSet === 'random10') {
    pool = getRandomSample(pool, 10);
  } else if (currentSet.startsWith('topic')) {
    const tid = parseInt(currentSet.replace('topic', ''), 10);
    pool = pool.filter(q => q.topicId === tid);
  } else if (currentSet.startsWith('set')) {
    const setNum = parseInt(currentSet.replace('set', ''), 10);
    const start = (setNum - 1) * 10;
    const end = start + 10;
    pool = pool.slice(start, end);
  }

  // 2. Apply Sub-filter
  if (currentFilter === 'incorrect') {
    pool = pool.filter(q => historyData.results[q.id] && !historyData.results[q.id].isCorrect);
  } else if (currentFilter === 'bookmarked') {
    pool = pool.filter(q => historyData.bookmarks.has(q.id));
  } else if (currentFilter === 'unanswered') {
    pool = pool.filter(q => !historyData.results[q.id]);
  }

  activeQuestions = pool;

  // 再度開き直した際に前回の設問から再開
  if (restoreLastQuestion && historyData.lastQuestionId) {
    const foundIdx = activeQuestions.findIndex(q => q.id === historyData.lastQuestionId);
    currentQuestionIndex = foundIdx !== -1 ? foundIdx : 0;
  } else {
    currentQuestionIndex = 0;
  }

  updateFilterCountBadges();
  updateSidebarStats();
  renderQuestionNavGrid();
  renderCurrentQuestion();
}

// Fisher-Yates (Knuth) Shuffle Algorithm (BUG-14)
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

function getRandomSample(arr, n) {
  const shuffled = shuffleArray(arr);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function updateFilterCountBadges() {
  let totalPool = [...allQuestions];
  if (currentMode === 'exam' || currentSet === 'exam30') {
    totalPool = examQuestionPool.length > 0 ? [...examQuestionPool] : getRandomSample(allQuestions, 30);
  } else if (currentSet.startsWith('topic')) {
    const tid = parseInt(currentSet.replace('topic', ''), 10);
    totalPool = totalPool.filter(q => q.topicId === tid);
  } else if (currentSet.startsWith('set')) {
    const setNum = parseInt(currentSet.replace('set', ''), 10);
    totalPool = totalPool.slice((setNum - 1) * 10, setNum * 10);
  }

  const countAll = totalPool.length;
  const countIncorrect = totalPool.filter(q => historyData.results[q.id] && !historyData.results[q.id].isCorrect).length;
  const countBookmarked = totalPool.filter(q => historyData.bookmarks.has(q.id)).length;
  const countUnanswered = totalPool.filter(q => !historyData.results[q.id]).length;

  document.getElementById('countAll').textContent = countAll;
  document.getElementById('countIncorrect').textContent = countIncorrect;
  document.getElementById('countBookmarked').textContent = countBookmarked;
  document.getElementById('countUnanswered').textContent = countUnanswered;
}

function updateSidebarStats() {
  const total = activeQuestions.length;
  if (total === 0) {
    document.getElementById('statAnswered').textContent = '0/0';
    document.getElementById('statAccuracy').textContent = '0%';
    document.getElementById('overallProgressBar').style.width = '0%';
    return;
  }

  let answered = 0;
  let correct = 0;

  activeQuestions.forEach(q => {
    if (historyData.results[q.id]) {
      answered++;
      if (historyData.results[q.id].isCorrect) correct++;
    }
  });

  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const progressPercent = Math.round((answered / total) * 100);

  document.getElementById('statAnswered').textContent = `${answered}/${total}`;
  document.getElementById('statAccuracy').textContent = `${accuracy}%`;
  document.getElementById('overallProgressBar').style.width = `${progressPercent}%`;
}

function renderQuestionNavGrid() {
  const grid = document.getElementById('questionNavGrid');
  grid.innerHTML = '';

  activeQuestions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = 'q-nav-btn';
    btn.textContent = idx + 1;

    if (idx === currentQuestionIndex) {
      btn.classList.add('active');
      setTimeout(() => {
        btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 50);
    }

    if (historyData.results[q.id]) {
      if (historyData.results[q.id].isCorrect) {
        btn.classList.add('correct');
      } else {
        btn.classList.add('incorrect');
      }
    }

    btn.addEventListener('click', () => {
      currentQuestionIndex = idx;
      renderCurrentQuestion();
      renderQuestionNavGrid();
    });

    grid.appendChild(btn);
  });
}

// ==========================================
// 5. Question Rendering
// ==========================================
function renderCurrentQuestion() {
  if (activeQuestions.length === 0) {
    document.getElementById('questionText').textContent = '該当する問題がありません。出題範囲またはフィルターを変更してください。';
    document.getElementById('answerArea').innerHTML = '';
    document.getElementById('explanationArea').classList.add('hidden');
    document.getElementById('btnSubmitAnswer').classList.add('hidden');
    return;
  }

  document.getElementById('btnSubmitAnswer').classList.remove('hidden');
  const q = activeQuestions[currentQuestionIndex];
  historyData.lastQuestionId = q.id;
  historyData.lastSet = currentSet;
  saveHistoryToStorage();
  debouncedPushToCloud();

  // Toolbar
  document.getElementById('currentTopicBadge').textContent = q.topic;
  document.getElementById('currentQuestionNumberDisplay').textContent = `質問 #${currentQuestionIndex + 1} / ${activeQuestions.length}`;

  const typeLabels = {
    'single_choice': '単一選択',
    'ox_choice': '○×チェック',
    'drag_and_drop_order': '順序並べ替え',
    'drag_and_drop_matching': 'マッチング',
    'hotspot_radio_table': 'Yes/No 判定'
  };
  document.getElementById('currentTypeBadge').textContent = typeLabels[q.type] || '選択問題';

  // Bookmark status
  const bookmarkBtn = document.getElementById('btnBookmark');
  if (historyData.bookmarks.has(q.id)) {
    bookmarkBtn.classList.add('bookmarked');
    bookmarkBtn.querySelector('span').textContent = 'ブックマーク中 ★';
  } else {
    bookmarkBtn.classList.remove('bookmarked');
    bookmarkBtn.querySelector('span').textContent = 'ブックマーク';
  }

  // Question Text
  document.getElementById('questionText').textContent = q.questionText;

  // Answer Area
  const answerArea = document.getElementById('answerArea');
  answerArea.innerHTML = '';

  const isChecked = (currentMode === 'practice' && sessionCheckedQuestions.has(q.id)) ||
                    (currentMode === 'practice' && historyData.results[q.id]);

  if (q.type === 'ox_choice') {
    renderOxChoice(answerArea, q, isChecked);
  } else if (q.type === 'single_choice') {
    renderSingleChoice(answerArea, q, isChecked);
  } else if (q.type === 'drag_and_drop_order') {
    renderDndOrder(answerArea, q, isChecked);
  } else if (q.type === 'drag_and_drop_matching') {
    renderMatching(answerArea, q, isChecked);
  } else if (q.type === 'hotspot_radio_table') {
    renderHotspotTable(answerArea, q, isChecked);
  }

  // Explanation Area
  const expArea = document.getElementById('explanationArea');
  if (isChecked && currentMode === 'practice') {
    renderExplanation(expArea, q);
    expArea.classList.remove('hidden');
    document.getElementById('btnSubmitAnswer').textContent = '回答済み（再採点）';
  } else {
    expArea.classList.add('hidden');
    document.getElementById('btnSubmitAnswer').textContent = '回答を確認する';
  }
}

// 5.1 Render OX Choice
function renderOxChoice(container, q, isChecked) {
  container.innerHTML = '';
  const oxDiv = document.createElement('div');
  oxDiv.className = 'ox-container';

  const options = [
    { label: '◯（正しい）', symbol: '◯', cls: 'ox-o' },
    { label: '✕（誤り）', symbol: '✕', cls: 'ox-x' }
  ];

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `ox-btn ${opt.cls}`;
    btn.innerHTML = `
      <div class="ox-symbol">${opt.symbol}</div>
      <div class="ox-text">${opt.label}</div>
    `;

    const currentVal = userAnswers[q.id] !== undefined ? userAnswers[q.id] : historyData.results[q.id]?.selectedAnswer;
    const isSelected = currentVal === opt.label;
    if (isSelected) btn.classList.add('selected');

    if (isChecked) {
      if (opt.label === q.correctAnswer) {
        btn.classList.add('correct');
      } else if (isSelected && opt.label !== q.correctAnswer) {
        btn.classList.add('incorrect');
      }
    }

    btn.addEventListener('click', () => {
      userAnswers[q.id] = opt.label;
      renderOxChoice(container, q, isChecked);
    });

    oxDiv.appendChild(btn);
  });

  container.appendChild(oxDiv);
}

// 5.2 Render Single Choice
function renderSingleChoice(container, q, isChecked) {
  container.innerHTML = '';
  const listDiv = document.createElement('div');
  listDiv.className = 'options-container';

  q.options.forEach(optText => {
    const item = document.createElement('div');
    item.className = 'option-item';

    const currentVal = userAnswers[q.id] !== undefined ? userAnswers[q.id] : historyData.results[q.id]?.selectedAnswer;
    const isSelected = currentVal === optText;
    if (isSelected) item.classList.add('selected');

    if (isChecked) {
      if (optText === q.correctAnswer) {
        item.classList.add('correct');
      } else if (isSelected && optText !== q.correctAnswer) {
        item.classList.add('incorrect');
      }
    }

    item.innerHTML = `
      <input type="radio" class="option-radio" name="opt_${q.id}" ${isSelected ? 'checked' : ''}>
      <span class="option-label">${optText}</span>
    `;

    item.addEventListener('click', () => {
      userAnswers[q.id] = optText;
      renderSingleChoice(container, q, isChecked);
    });

    listDiv.appendChild(item);
  });

  container.appendChild(listDiv);
}

// 5.3 Render Drag and Drop Order (with Arrow Buttons for mobile friendliness)
function renderDndOrder(container, q, isChecked) {
  container.innerHTML = '';
  if (!userAnswers[q.id] || !Array.isArray(userAnswers[q.id])) {
    // BUG-10: Restore previous arrangement from selectedAnswer if available
    if (historyData.results[q.id]?.selectedAnswer && Array.isArray(historyData.results[q.id].selectedAnswer)) {
      userAnswers[q.id] = [...historyData.results[q.id].selectedAnswer];
    } else {
      userAnswers[q.id] = shuffleArray(q.options);
    }
  }

  const dndDiv = document.createElement('div');
  dndDiv.className = 'dnd-container';

  const title = document.createElement('div');
  title.style.fontSize = '0.9rem';
  title.style.fontWeight = '600';
  title.style.color = 'var(--text-secondary)';
  title.textContent = '【順序を並べ替えてください（「↑」「↓」ボタンで移動できます）】';
  dndDiv.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dnd-pool';

  userAnswers[q.id].forEach((itemText, idx) => {
    const item = document.createElement('div');
    item.className = 'dnd-item';

    if (isChecked) {
      const isCorrectSlot = q.correctAnswer[idx] === itemText;
      item.style.borderColor = isCorrectSlot ? 'var(--success-color)' : 'var(--danger-color)';
      item.style.background = isCorrectSlot ? 'var(--success-light)' : 'var(--danger-light)';
    }

    item.innerHTML = `
      <span style="font-weight: 700; color: var(--primary-color); min-width: 28px;">#${idx + 1}</span>
      <span style="flex: 1;">${itemText}</span>
      <div style="display: flex; gap: 4px;">
        <button class="secondary-btn" style="padding: 4px 8px; font-size: 0.8rem;" ${idx === 0 ? 'disabled' : ''} data-up="${idx}">↑</button>
        <button class="secondary-btn" style="padding: 4px 8px; font-size: 0.8rem;" ${idx === userAnswers[q.id].length - 1 ? 'disabled' : ''} data-down="${idx}">↓</button>
      </div>
    `;

    item.querySelector('[data-up]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const temp = userAnswers[q.id][idx];
      userAnswers[q.id][idx] = userAnswers[q.id][idx - 1];
      userAnswers[q.id][idx - 1] = temp;
      renderDndOrder(container, q, isChecked);
    });

    item.querySelector('[data-down]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const temp = userAnswers[q.id][idx];
      userAnswers[q.id][idx] = userAnswers[q.id][idx + 1];
      userAnswers[q.id][idx + 1] = temp;
      renderDndOrder(container, q, isChecked);
    });

    list.appendChild(item);
  });

  dndDiv.appendChild(list);
  container.appendChild(dndDiv);
}

// 5.4 Render Matching
function renderMatching(container, q, isChecked) {
  container.innerHTML = '';
  if (!userAnswers[q.id] || typeof userAnswers[q.id] !== 'object') {
    userAnswers[q.id] = historyData.results[q.id]?.selectedAnswer ? { ...historyData.results[q.id].selectedAnswer } : {};
  }

  const matchDiv = document.createElement('div');
  matchDiv.style.display = 'flex';
  matchDiv.style.flexDirection = 'column';
  matchDiv.style.gap = '10px';
  matchDiv.style.marginBottom = '20px';

  q.matchingPairs.forEach(pair => {
    const row = document.createElement('div');
    row.className = 'matching-row';

    const label = document.createElement('div');
    label.style.fontWeight = '700';
    label.style.fontSize = '0.95rem';
    label.textContent = pair.targetLabel;

    const select = document.createElement('select');
    select.className = 'matching-select';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- 選択してください --';
    select.appendChild(defaultOpt);

    pair.options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (userAnswers[q.id][pair.targetLabel] === opt) {
        o.selected = true;
      }
      select.appendChild(o);
    });

    if (isChecked) {
      const isRight = userAnswers[q.id][pair.targetLabel] === pair.correctAnswer;
      select.style.borderColor = isRight ? 'var(--success-color)' : 'var(--danger-color)';
      select.style.background = isRight ? 'var(--success-light)' : 'var(--danger-light)';
    }

    select.addEventListener('change', (e) => {
      userAnswers[q.id][pair.targetLabel] = e.target.value;
    });

    row.appendChild(label);
    row.appendChild(select);
    matchDiv.appendChild(row);
  });

  container.appendChild(matchDiv);
}

// 5.5 Render Hotspot Table
function renderHotspotTable(container, q, isChecked) {
  container.innerHTML = '';
  if (!userAnswers[q.id] || typeof userAnswers[q.id] !== 'object') {
    userAnswers[q.id] = historyData.results[q.id]?.selectedAnswer ? { ...historyData.results[q.id].selectedAnswer } : {};
  }

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.marginBottom = '20px';

  table.innerHTML = `
    <thead>
      <tr style="background: var(--bg-hover); border-bottom: 2px solid var(--border-color);">
        <th style="padding: 10px; text-align: left; font-size: 0.88rem;">ステートメント</th>
        <th style="padding: 10px; width: 80px; text-align: center; font-size: 0.88rem;">Yes</th>
        <th style="padding: 10px; width: 80px; text-align: center; font-size: 0.88rem;">No</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  q.tableStatements.forEach((stmt, idx) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';

    const key = `statement_${idx}`;
    const userVal = userAnswers[q.id][key];

    tr.innerHTML = `
      <td style="padding: 12px 10px; font-size: 0.92rem;">${stmt.statement}</td>
      <td style="text-align: center;">
        <input type="radio" name="hotspot_${q.id}_${idx}" value="Yes" ${userVal === 'Yes' ? 'checked' : ''}>
      </td>
      <td style="text-align: center;">
        <input type="radio" name="hotspot_${q.id}_${idx}" value="No" ${userVal === 'No' ? 'checked' : ''}>
      </td>
    `;

    if (isChecked) {
      const isRight = userVal === stmt.correct;
      tr.style.backgroundColor = isRight ? 'var(--success-light)' : 'var(--danger-light)';
    }

    tr.querySelectorAll('input').forEach(radio => {
      radio.addEventListener('change', (e) => {
        userAnswers[q.id][key] = e.target.value;
      });
    });

    tbody.appendChild(tr);
  });

  container.appendChild(table);
}

// 5.6 Render 3-Layer Explanation
function renderExplanation(container, q) {
  const resultInfo = historyData.results[q.id];
  const isCorrect = resultInfo ? resultInfo.isCorrect : false;

  const resultBadge = `
    <div class="result-badge-bar ${isCorrect ? 'correct' : 'incorrect'}">
      <span>${isCorrect ? '🎉 正解！' : '❌ 不正解'}</span>
    </div>
  `;

  // Parse explanation blocks if structured
  const rawExp = q.explanation || '';
  
  // Format sections
  let basicText = '';
  let correctText = '';
  let wrongText = '';

  if (rawExp.includes('📖 【基本解説') || rawExp.includes('✅ 【正解のポイント') || rawExp.includes('🚨 【なぜ')) {
    const parts = rawExp.split(/(?=📖|✅|🚨)/g);
    parts.forEach(p => {
      if (p.includes('📖')) basicText = p.replace(/📖\s*【基本解説.*?】\n?/, '').trim();
      else if (p.includes('✅')) correctText = p.replace(/✅\s*【正解のポイント.*?】\n?/, '').trim();
      else if (p.includes('🚨')) wrongText = p.replace(/🚨\s*【なぜ.*?】\n?/, '').trim();
    });
  } else {
    basicText = rawExp;
  }

  let html = resultBadge;

  if (basicText) {
    html += `
      <div class="exp-card card-basic">
        <div class="exp-card-header">📖 基本解説・設問の背景</div>
        <div class="exp-card-content">${escapeHtml(basicText)}</div>
      </div>
    `;
  }

  if (correctText) {
    html += `
      <div class="exp-card card-correct">
        <div class="exp-card-header">✅ 正解のポイント・仕様上の根拠</div>
        <div class="exp-card-content">${escapeHtml(correctText)}</div>
      </div>
    `;
  }

  if (wrongText) {
    html += `
      <div class="exp-card card-wrong">
        <div class="exp-card-header">🚨 なぜ他の選択肢は誤りなのか？（罠ポイント・誤答分析）</div>
        <div class="exp-card-content">${escapeHtml(wrongText)}</div>
      </div>
    `;
  }

  // Official Video Card
  if (q.videoReference) {
    html += `
      <div class="exp-card card-video">
        <div class="exp-card-header">🎬 公式教材 YouTube解説動画</div>
        <div class="exp-card-content">
          <strong>${escapeHtml(q.videoReference.title)}</strong><br>
          公式講義動画でこの問題のテーマを復習できます。
        </div>
        <a href="${q.videoReference.url}" target="_blank" rel="noopener" class="video-cta-btn">
          ▶ YouTubeで講義を視聴する
        </a>
      </div>
    `;
  }

  container.innerHTML = html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ==========================================
// 6. Answer Submission & Evaluation
// ==========================================
function evaluateAnswer(q) {
  const ans = userAnswers[q.id];
  if (ans === undefined || ans === null || ans === '') return false;

  if (q.type === 'single_choice' || q.type === 'ox_choice') {
    return ans === q.correctAnswer;
  }

  if (q.type === 'drag_and_drop_order') {
    if (!Array.isArray(ans) || ans.length !== q.correctAnswer.length) return false;
    for (let i = 0; i < ans.length; i++) {
      if (ans[i] !== q.correctAnswer[i]) return false;
    }
    return true;
  }

  if (q.type === 'drag_and_drop_matching' || q.type === 'hotspot_radio_table') {
    if (typeof ans !== 'object' || ans === null || Array.isArray(ans)) return false;
    const correctKeys = Object.keys(q.correctAnswer);
    const ansKeys = Object.keys(ans);
    // BUG-04: Strict key count check to disallow extraneous/incomplete keys
    if (ansKeys.length !== correctKeys.length) return false;
    for (let k of correctKeys) {
      if (ans[k] !== q.correctAnswer[k]) return false;
    }
    return true;
  }

  return false;
}

function getLocalDateString(isoOrDateStr) {
  if (!isoOrDateStr) return '';
  const d = new Date(isoOrDateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function submitCurrentAnswer() {
  if (activeQuestions.length === 0) return;
  const q = activeQuestions[currentQuestionIndex];

  const isCorrect = evaluateAnswer(q);
  const prevResult = historyData.results[q.id];
  const today = getTodayString();
  const prevAnsweredDate = prevResult && prevResult.answeredAt ? getLocalDateString(prevResult.answeredAt) : null;
  const alreadyAnsweredToday = prevAnsweredDate === today;

  // BUG-10: Save selectedAnswer in result
  historyData.results[q.id] = {
    isCorrect,
    selectedAnswer: userAnswers[q.id],
    answeredAt: new Date().toISOString()
  };

  sessionCheckedQuestions.add(q.id);

  // BUG-05: Guard against activity inflation on repeated submissions
  if (!alreadyAnsweredToday) {
    recordAnswerActivity(isCorrect);
  } else {
    // Re-answering today: adjust correct tally if outcome changed, but do not increment answered
    if (!prevResult.isCorrect && isCorrect) {
      historyData.dailyActivity[today].correct = (historyData.dailyActivity[today].correct || 0) + 1;
    } else if (prevResult.isCorrect && !isCorrect) {
      historyData.dailyActivity[today].correct = Math.max(0, (historyData.dailyActivity[today].correct || 1) - 1);
    }
    saveHistoryToStorage();
    updateStreakDisplay();
  }

  updateFilterCountBadges();
  updateSidebarStats();
  renderQuestionNavGrid();
  renderCurrentQuestion();

  // クラウド自動同期（設定されている場合）
  pushToCloud(true);

  // Check 10-question set completion
  checkSetCompletionTrigger();
}

function checkSetCompletionTrigger() {
  if (currentSet.startsWith('set') || currentSet === 'random10') {
    const allAnswered = activeQuestions.every(q => historyData.results[q.id]);
    if (allAnswered && activeQuestions.length > 0) {
      showSetSummaryModal();
    }
  }
}

// ==========================================
// 7. Modals (Weakness, Video, Exam, Set)
// ==========================================
// 7.1 Weakness Analysis & Radar Chart
function openWeaknessModal() {
  const modal = document.getElementById('weaknessModal');
  modal.classList.add('open');
  drawRadarChart();
  renderTopicStatList();
}

function drawRadarChart() {
  const canvas = document.getElementById('radarCanvas');
  const ctx = canvas.getContext('2d');
  
  // BUG-06: High-DPI (Retina) scaling with zero label clipping
  const dpr = window.devicePixelRatio || 1;
  const baseSize = 460;
  canvas.width = baseSize * dpr;
  canvas.height = baseSize * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const size = baseSize;
  const center = size / 2;
  const radius = 120; // 120px gives ample margin for Japanese labels on 460px canvas

  ctx.clearRect(0, 0, size, size);

  const topics = [
    { id: 1, name: '1. モデル設計' },
    { id: 2, name: '2. データとタスク' },
    { id: 3, name: '3. 評価指標' },
    { id: 4, name: '4. 画像データ' },
    { id: 5, name: '5. 数学表現' },
    { id: 6, name: '6. 計算量基礎' },
    { id: 7, name: '7. 開発と運用' }
  ];

  const numSides = topics.length;
  const angleStep = (Math.PI * 2) / numSides;

  // Draw Web Rings
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let r = 1; r <= 4; r++) {
    const curR = (radius / 4) * r;
    ctx.beginPath();
    for (let i = 0; i < numSides; i++) {
      const a = i * angleStep - Math.PI / 2;
      const x = center + curR * Math.cos(a);
      const y = center + curR * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw Axis Lines
  for (let i = 0; i < numSides; i++) {
    const a = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(a);
    const y = center + radius * Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Axis Labels with Dynamic Alignment (BUG-06)
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const labelR = radius + 16;
    const lx = center + labelR * cosA;
    const ly = center + labelR * sinA;

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px Inter, -apple-system, sans-serif';

    if (cosA > 0.25) {
      ctx.textAlign = 'left';
    } else if (cosA < -0.25) {
      ctx.textAlign = 'right';
    } else {
      ctx.textAlign = 'center';
    }

    if (sinA < -0.7) {
      ctx.textBaseline = 'bottom';
    } else if (sinA > 0.7) {
      ctx.textBaseline = 'top';
    } else {
      ctx.textBaseline = 'middle';
    }

    ctx.fillText(topics[i].name, lx, ly);
  }

  // Calculate accuracies for each topic
  const dataPoints = topics.map(t => {
    const tQuestions = allQuestions.filter(q => q.topicId === t.id);
    let correct = 0;
    let answered = 0;
    tQuestions.forEach(q => {
      if (historyData.results[q.id]) {
        answered++;
        if (historyData.results[q.id].isCorrect) correct++;
      }
    });
    return answered > 0 ? (correct / answered) : 0;
  });

  // Draw Data Polygon
  ctx.beginPath();
  dataPoints.forEach((val, i) => {
    const curR = radius * val;
    const a = i * angleStep - Math.PI / 2;
    const x = center + curR * Math.cos(a);
    const y = center + curR * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();

  ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
  ctx.fill();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Data Dots
  dataPoints.forEach((val, i) => {
    const curR = radius * val;
    const a = i * angleStep - Math.PI / 2;
    const x = center + curR * Math.cos(a);
    const y = center + curR * Math.sin(a);
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function renderTopicStatList() {
  const container = document.getElementById('topicStatList');
  container.innerHTML = '';

  const topics = [
    { id: 1, title: '第1講: モデルの設計と活用までの流れ' },
    { id: 2, title: '第2講: データの入出力とタスク' },
    { id: 3, title: '第3講: モデルの評価指標' },
    { id: 4, title: '第4講: 画像データの取り扱い' },
    { id: 5, title: '第5講: 数学的な表現に慣れる' },
    { id: 6, title: '第6講: 計算量の基礎' },
    { id: 7, title: '第7講: 開発と活用に向けて' }
  ];

  topics.forEach(t => {
    const tQuestions = allQuestions.filter(q => q.topicId === t.id);
    let correct = 0;
    let answered = 0;
    tQuestions.forEach(q => {
      if (historyData.results[q.id]) {
        answered++;
        if (historyData.results[q.id].isCorrect) correct++;
      }
    });
    const acc = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    const row = document.createElement('div');
    row.className = 'topic-stat-row';
    row.innerHTML = `
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 0.9rem;">${t.title}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">
          正答率: <strong style="color: ${acc >= 70 ? 'var(--success-color)' : 'var(--danger-color)'}">${acc}%</strong> (${correct}/${answered}問 正解 / 全${tQuestions.length}問)
        </div>
      </div>
      <button class="topic-drill-btn" data-topic="${t.id}">この分野を特訓 🎯</button>
    `;

    row.querySelector('.topic-drill-btn').addEventListener('click', () => {
      document.getElementById('weaknessModal').classList.remove('open');
      setPracticeTopic(t.id);
    });

    container.appendChild(row);
  });
}

function setPracticeTopic(topicId) {
  currentSet = `topic${topicId}`;
  currentMode = 'practice';
  updateSetButtonsUI();
  updateModeButtonsUI();
  applyCurrentSetAndFilter();
}

// 7.2 Video Catalog Modal
function openVideoModal() {
  const modal = document.getElementById('videoModal');
  modal.classList.add('open');
  renderVideoCatalogGrid('');
}

function renderVideoCatalogGrid(query) {
  const grid = document.getElementById('catalogGrid');
  grid.innerHTML = '';

  const qLower = query.toLowerCase().trim();
  const filtered = videoCatalog.filter(v => {
    if (!qLower) return true;
    return v.title.toLowerCase().includes(qLower) || v.lectureName.toLowerCase().includes(qLower);
  });

  filtered.forEach(v => {
    const card = document.createElement('a');
    card.href = v.url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.className = 'catalog-card';

    card.innerHTML = `
      <img src="${v.thumbnailUrl}" alt="${v.title}" class="catalog-thumb" loading="lazy">
      <div class="catalog-info">
        <span class="catalog-lecture-tag">${v.lectureName}</span>
        <h4 class="catalog-title">${v.title}</h4>
      </div>
    `;

    grid.appendChild(card);
  });
}

// 7.3 Exam Mode & Summary
function startExamMode() {
  currentMode = 'exam';
  currentSet = 'exam30';
  currentFilter = 'all';
  updateFilterButtonsUI();

  // BUG-01: Initialize dedicated 30 questions pool
  examQuestionPool = getRandomSample(allQuestions, 30);

  // BUG-02: Synchronize timer with wall-clock time
  const totalSeconds = 40 * 60; // 40 minutes
  examEndTime = Date.now() + totalSeconds * 1000;
  examTimeRemaining = totalSeconds;

  updateModeButtonsUI();
  updateSetButtonsUI();

  document.getElementById('examBanner').classList.remove('hidden');

  if (examTimerInterval) clearInterval(examTimerInterval);
  examTimerInterval = setInterval(() => {
    // BUG-02: Compute remaining seconds based on Date.now() to prevent tab-throttling drift
    const remainingMs = examEndTime - Date.now();
    examTimeRemaining = Math.max(0, Math.round(remainingMs / 1000));
    updateExamTimerDisplay();
    if (examTimeRemaining <= 0) {
      clearInterval(examTimerInterval);
      examTimerInterval = null;
      finishExam();
    }
  }, 1000);

  updateExamTimerDisplay();
  applyCurrentSetAndFilter();
}

function updateExamTimerDisplay() {
  const m = Math.floor(examTimeRemaining / 60);
  const s = examTimeRemaining % 60;
  document.getElementById('examTimer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function finishExam() {
  if (examTimerInterval) {
    clearInterval(examTimerInterval);
    examTimerInterval = null;
  }
  document.getElementById('examBanner').classList.add('hidden');

  // BUG-01: Evaluate all questions from examQuestionPool, regardless of current filter
  const questionsToGrade = examQuestionPool.length > 0 ? examQuestionPool : activeQuestions;
  let correctCount = 0;
  const today = getTodayString();
  if (!historyData.dailyActivity[today]) {
    historyData.dailyActivity[today] = { answered: 0, correct: 0 };
  }
  let newAnswered = 0;
  let newCorrect = 0;

  questionsToGrade.forEach(q => {
    const isCorrect = evaluateAnswer(q);
    const prevResult = historyData.results[q.id];
    const alreadyAnsweredToday = prevResult && prevResult.answeredAt && prevResult.answeredAt.startsWith(today);

    // BUG-10: Save selectedAnswer
    historyData.results[q.id] = {
      isCorrect,
      selectedAnswer: userAnswers[q.id],
      answeredAt: new Date().toISOString()
    };
    if (isCorrect) correctCount++;

    // BUG-05: Tally only if not answered today
    if (!alreadyAnsweredToday) {
      newAnswered++;
      if (isCorrect) newCorrect++;
    } else {
      if (!prevResult.isCorrect && isCorrect) newCorrect++;
      else if (prevResult.isCorrect && !isCorrect) newCorrect--;
    }
  });

  historyData.dailyActivity[today].answered += newAnswered;
  historyData.dailyActivity[today].correct = Math.max(0, historyData.dailyActivity[today].correct + newCorrect);

  // BUG-08: Batch save once after loop finishes
  saveHistoryToStorage();
  updateStreakDisplay();
  updateSidebarStats();
  renderQuestionNavGrid();

  const total = questionsToGrade.length;
  const scorePercent = Math.round((correctCount / total) * 100);
  const passed = scorePercent >= 70; // 70% passing threshold

  const modal = document.getElementById('examSummaryModal');
  const body = document.getElementById('examSummaryBody');

  body.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 8px;">${passed ? '🎉' : '📚'}</div>
    <h3 style="font-size: 1.5rem; font-weight: 800; color: ${passed ? 'var(--success-color)' : 'var(--danger-color)'};">
      ${passed ? '合格おめでとうございます！' : '不合格（あと少し！）'}
    </h3>
    <div style="margin: 16px 0; font-size: 1.2rem; font-weight: 700;">
      得点: <span style="font-size: 2rem; color: var(--primary-color);">${correctCount} / ${total}</span> 問正解
      (${scorePercent}点 / 合格基準 70点)
    </div>
    <p style="font-size: 0.92rem; color: var(--text-secondary); margin-bottom: 24px;">
      ${passed ? '本番試験でも合格圏内の実力です！この調子を維持しましょう。' : '弱点トピックを復習して、再挑戦しましょう！'}
    </p>
    <div style="display: flex; gap: 10px; justify-content: center;">
      <button class="primary-btn" id="btnReviewExamQuestions">模試の解説を確認する</button>
      <button class="secondary-btn" id="btnRestartPractice">練習モードに戻る</button>
    </div>
  `;

  body.querySelector('#btnReviewExamQuestions').addEventListener('click', () => {
    modal.classList.remove('open');
    currentMode = 'practice';
    // BUG-01: Retain exam questions for review
    activeQuestions = examQuestionPool.length > 0 ? [...examQuestionPool] : activeQuestions;
    activeQuestions.forEach(q => sessionCheckedQuestions.add(q.id));
    updateModeButtonsUI();
    renderCurrentQuestion();
    renderQuestionNavGrid();
  });

  body.querySelector('#btnRestartPractice').addEventListener('click', () => {
    modal.classList.remove('open');
    currentMode = 'practice';
    currentSet = 'all';
    examQuestionPool = [];
    updateModeButtonsUI();
    updateSetButtonsUI();
    applyCurrentSetAndFilter();
  });

  modal.classList.add('open');
}

// 7.4 10-Question Set Summary Modal
function showSetSummaryModal() {
  const total = activeQuestions.length;
  let correct = 0;
  activeQuestions.forEach(q => {
    if (historyData.results[q.id]?.isCorrect) correct++;
  });

  const percent = Math.round((correct / total) * 100);
  const modal = document.getElementById('setSummaryModal');
  const body = document.getElementById('setSummaryBody');

  body.innerHTML = `
    <div style="font-size: 2.5rem; margin-bottom: 8px;">✨</div>
    <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">セット演習 完了！</h3>
    <div style="margin: 14px 0; font-size: 1.1rem; font-weight: 700;">
      結果: <span style="font-size: 1.8rem; color: var(--primary-color);">${correct} / ${total}</span> 問正解
      (${percent}%)
    </div>
    <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 18px;">
      <button class="primary-btn" id="btnNextSet">次のセットへ進む</button>
      <button class="secondary-btn" id="btnRetryIncorrectInSet">間違えた問題を再挑戦</button>
      <button class="secondary-btn" data-close="setSummaryModal">閉じる</button>
    </div>
  `;

  body.querySelector('#btnNextSet')?.addEventListener('click', () => {
    modal.classList.remove('open');
    if (currentSet.startsWith('set')) {
      const curNum = parseInt(currentSet.replace('set', ''), 10);
      if (curNum < 9) {
        currentSet = `set${curNum + 1}`;
      } else {
        currentSet = 'all';
      }
    } else {
      currentSet = 'random10';
    }
    updateSetButtonsUI();
    applyCurrentSetAndFilter();
  });

  body.querySelector('#btnRetryIncorrectInSet')?.addEventListener('click', () => {
    modal.classList.remove('open');
    currentFilter = 'incorrect';
    updateFilterButtonsUI();
    applyCurrentSetAndFilter();
  });

  modal.classList.add('open');
}

// ==========================================
// 8. Event Listeners & UI Binding
// ==========================================
function setupEventListeners() {
  // Navigation
  document.getElementById('btnPrevQuestion').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderCurrentQuestion();
      renderQuestionNavGrid();
    }
  });

  document.getElementById('btnNextQuestion').addEventListener('click', () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      currentQuestionIndex++;
      renderCurrentQuestion();
      renderQuestionNavGrid();
    }
  });

  document.getElementById('btnSubmitAnswer').addEventListener('click', submitCurrentAnswer);

  // Resume last
  document.getElementById('btnResumeLast').addEventListener('click', () => {
    if (historyData.lastQuestionId) {
      const idx = activeQuestions.findIndex(q => q.id === historyData.lastQuestionId);
      if (idx !== -1) {
        currentQuestionIndex = idx;
        renderCurrentQuestion();
        renderQuestionNavGrid();
      }
    }
  });

  // Bookmark Toggle
  document.getElementById('btnBookmark').addEventListener('click', () => {
    if (activeQuestions.length === 0) return;
    const q = activeQuestions[currentQuestionIndex];
    if (historyData.bookmarks.has(q.id)) {
      historyData.bookmarks.delete(q.id);
    } else {
      historyData.bookmarks.add(q.id);
    }
    saveHistoryToStorage();
    renderCurrentQuestion();
    updateFilterCountBadges();
    pushToCloud(true);
  });

  // Video Direct Link
  document.getElementById('btnWatchVideoDirect').addEventListener('click', () => {
    if (activeQuestions.length === 0) return;
    const q = activeQuestions[currentQuestionIndex];
    if (q.videoReference && q.videoReference.url) {
      window.open(q.videoReference.url, '_blank');
    }
  });

  // Mode Buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === 'exam') {
        startExamMode();
      } else {
        if (currentMode === 'exam') {
          if (!confirm('本番模試を中断して練習モードに戻りますか？')) {
            return;
          }
        }
        currentMode = 'practice';
        if (examTimerInterval) {
          clearInterval(examTimerInterval);
          examTimerInterval = null;
        }
        document.getElementById('examBanner').classList.add('hidden');
        if (currentSet === 'exam30') {
          currentSet = 'all';
          updateSetButtonsUI();
        }
        updateModeButtonsUI();
        applyCurrentSetAndFilter();
      }
    });
  });

  // Set Buttons
  document.querySelectorAll('.set-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const set = btn.dataset.set;
      if (set === 'exam30') {
        startExamMode();
      } else {
        // BUG-03: Safely stop exam mode if currently active
        if (currentMode === 'exam') {
          if (!confirm('本番模試を中断して練習モードに戻りますか？')) {
            return;
          }
          if (examTimerInterval) {
            clearInterval(examTimerInterval);
            examTimerInterval = null;
          }
          document.getElementById('examBanner').classList.add('hidden');
          currentMode = 'practice';
          updateModeButtonsUI();
        }
        currentSet = set;
        updateSetButtonsUI();
        applyCurrentSetAndFilter();
      }
    });
  });

  // Filter Buttons
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      updateFilterButtonsUI();
      applyCurrentSetAndFilter();
    });
  });

  // Modals Open/Close
  document.getElementById('btnWeaknessAnalysis').addEventListener('click', openWeaknessModal);
  document.getElementById('btnVideoCatalog').addEventListener('click', openVideoModal);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      document.getElementById(modalId)?.classList.remove('open');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });

  // Video Catalog Search
  document.getElementById('catalogSearchInput')?.addEventListener('input', (e) => {
    renderVideoCatalogGrid(e.target.value);
  });

  // Exam Finish Button in Banner
  document.getElementById('btnFinishExam').addEventListener('click', finishExam);

  // Reset History Button
  document.getElementById('btnResetHistory').addEventListener('click', () => {
    if (confirm('学習履歴、回答記録、ブックマークをすべて初期化しますか？')) {
      historyData.results = {};
      historyData.bookmarks.clear();
      historyData.dailyActivity = {};
      sessionCheckedQuestions.clear();
      userAnswers = {};
      saveHistoryToStorage();
      updateStreakDisplay();
      applyCurrentSetAndFilter();
      alert('学習履歴をリセットしました。');
    }
  });

  // Keyboard Navigation (Left/Right Arrows & Escape) (BUG-11)
  window.addEventListener('keydown', (e) => {
    // Handle Escape to close any active modal
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-overlay.open');
      if (openModal) {
        openModal.classList.remove('open');
        return;
      }
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    // BUG-11: Suppress question navigation while any modal is open
    if (document.querySelector('.modal-overlay.open')) return;

    if (e.key === 'ArrowLeft') {
      document.getElementById('btnPrevQuestion').click();
    } else if (e.key === 'ArrowRight') {
      document.getElementById('btnNextQuestion').click();
    }
  });

  // Mobile Sidebar Collapsible Toggle (BUG-07)
  const toggleBtn = document.getElementById('btnToggleSidebar');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const group = document.getElementById('sidebarCollapsibleGroup');
      if (group) {
        const isOpen = group.classList.toggle('open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        const textSpan = toggleBtn.querySelector('span:first-child');
        if (textSpan) {
          textSpan.textContent = isOpen ? '✕ 出題設定・問題リストを閉じる' : '📋 出題設定・問題リスト (90問) を表示';
        }
        const iconSpan = document.getElementById('sidebarToggleIcon');
        if (iconSpan) {
          iconSpan.textContent = isOpen ? '▲' : '▼';
        }
      }
    });
  }

  // Cloud Sync Modal Listeners
  const openSyncModal = () => {
    const modal = document.getElementById('cloudSyncModal');
    if (modal) {
      const input = document.getElementById('syncPasscode');
      if (input) input.value = syncPasscode;
      updateSyncStatusUI(!!syncPasscode, syncPasscode ? `☁️ 現在の合言葉: ${syncPasscode}` : '同期キーが未設定です。キーを入力して保存してください。');
      modal.classList.add('open');
    }
  };

  document.getElementById('btnCloudSync')?.addEventListener('click', openSyncModal);
  document.getElementById('btnCloudSyncSidebar')?.addEventListener('click', openSyncModal);

  document.getElementById('btnSaveSyncKey')?.addEventListener('click', () => {
    const input = document.getElementById('syncPasscode');
    const val = input ? input.value.trim() : '';
    if (!val) {
      alert('同期キー（合言葉）を入力してください（例: sakura-b）');
      return;
    }
    syncPasscode = val;
    localStorage.setItem(STORAGE_KEY_SYNC_PASSCODE, syncPasscode);
    updateSyncStatusUI(true, `合言葉「${syncPasscode}」を保存しました`);
    pullFromCloud(false);
  });

  document.getElementById('btnPullCloud')?.addEventListener('click', () => pullFromCloud(false));
  document.getElementById('btnPushCloud')?.addEventListener('click', () => pushToCloud(false));

  // Copy sync URL for mobile
  document.getElementById('btnCopySyncUrl')?.addEventListener('click', async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    let shareUrl = baseUrl;
    if (syncPasscode) {
      shareUrl = `${baseUrl}?key=${encodeURIComponent(syncPasscode)}`;
    } else {
      const payload = getSyncPayload();
      const b64 = btoa(encodeURIComponent(JSON.stringify(payload)));
      shareUrl = `${baseUrl}?sync=${b64}`;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('📋 スマホで開く同期URLをコピーしました！\nLINEやメールでスマホに送り、スマホのブラウザで開くだけで続きから開けます。');
    } catch (e) {
      prompt('以下のURLをコピーしてスマホで開いてください：', shareUrl);
    }
  });

  // Copy sync code
  document.getElementById('btnCopySyncCode')?.addEventListener('click', async () => {
    const payload = getSyncPayload();
    const b64 = btoa(encodeURIComponent(JSON.stringify(payload)));
    const syncCode = `AI_B:${b64}`;
    try {
      await navigator.clipboard.writeText(syncCode);
      alert('📋 進捗コードをコピーしました！\nスマホ側で「コードを貼り付けて適用」を押してください。');
    } catch (e) {
      prompt('以下の進捗コードをコピーしてスマホ側で適用してください：', syncCode);
    }
  });

  // Paste sync code
  document.getElementById('btnPasteSyncCode')?.addEventListener('click', () => {
    const code = prompt('コピーした進捗コード（AI_B:...）を貼り付けてください：');
    if (!code) return;
    try {
      const raw = code.replace(/^AI_B:/, '').trim();
      const json = decodeURIComponent(atob(raw));
      const imported = JSON.parse(json);
      if (imported && imported.results) {
        applyImportedData(imported);
        alert('✅ 進捗データを正常に反映しました！続きから学習を再開できます。');
      } else {
        alert('無効な進捗コードです。');
      }
    } catch (e) {
      alert('進捗コードの解析に失敗しました。正しいコードかご確認ください。');
    }
  });

  // Export / Import JSON
  document.getElementById('btnExportJson')?.addEventListener('click', () => {
    const payload = getSyncPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_exam_b_progress_${getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importJsonInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (imported && imported.results) {
          applyImportedData(imported);
          alert('✅ JSONファイルから学習進捗を復元しました！');
        } else {
          alert('無効な学習履歴JSONファイルです。');
        }
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

function updateModeButtonsUI() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode);
  });
}

function updateSetButtonsUI() {
  document.querySelectorAll('.set-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.set === currentSet);
  });
}

function updateFilterButtonsUI() {
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === currentFilter);
  });
}

// ==========================================
// 8. Cloud & Multi-Device Sync (Vercel API & Sync Code)
// ==========================================
function getSyncPayload() {
  return {
    results: historyData.results || {},
    bookmarks: Array.from(historyData.bookmarks || []),
    dailyActivity: historyData.dailyActivity || {},
    lastQuestionId: historyData.lastQuestionId || 1,
    lastSet: historyData.lastSet || currentSet || 'all',
    updatedAt: Date.now()
  };
}

let cloudPushTimer = null;
function debouncedPushToCloud() {
  if (cloudPushTimer) clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(() => {
    pushToCloud(true);
  }, 1000);
}

function initCloudSync() {
  try {
    const params = new URLSearchParams(window.location.search);
    const keyParam = params.get('key');
    const syncParam = params.get('sync');

    if (syncParam) {
      try {
        const json = decodeURIComponent(atob(syncParam));
        const imported = JSON.parse(json);
        if (imported && imported.results) {
          applyImportedData(imported);
          window.history.replaceState({}, document.title, window.location.pathname);
          showToastNotification('✅ 学習進捗を復元しました！');
        }
      } catch (e) {
        console.warn('Failed to parse ?sync URL param:', e);
      }
    }

    if (keyParam) {
      syncPasscode = keyParam.trim();
      localStorage.setItem(STORAGE_KEY_SYNC_PASSCODE, syncPasscode);
    } else {
      // ユーザー設定がなければ、標準で 'default' キーで完全ゼロ設定同期！
      syncPasscode = localStorage.getItem(STORAGE_KEY_SYNC_PASSCODE) || 'default';
    }

    // 起動時に自動でクラウドから最新データを取得
    pullFromCloud(true);

    // スマホでブラウザを開き直した際やタブ復帰時にも自動で最新同期
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        pullFromCloud(true);
      }
    });
    window.addEventListener('focus', () => {
      pullFromCloud(true);
    });
  } catch (e) {
    console.warn('initCloudSync error:', e);
  }
}

function updateSyncStatusUI(success, msg) {
  const statusEl = document.getElementById('syncKeyStatusText');
  if (statusEl) {
    statusEl.textContent = msg;
    statusEl.style.color = success ? 'var(--success-color)' : 'var(--danger-color)';
  }
}

async function pushToCloud(isSilent = false) {
  if (!syncPasscode) syncPasscode = 'default';

  const payload = getSyncPayload();

  try {
    const res = await fetch(`/api/sync?key=${encodeURIComponent(syncPasscode)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      updateSyncStatusUI(true, `☁️ クラウド同期中（自動連携: ${syncPasscode}）`);
      if (!isSilent) alert('✅ クラウドへ学習履歴を保存（同期）しました！');
    }
  } catch (err) {
    console.warn('Cloud sync push warning:', err);
    if (!isSilent) alert('クラウド保存に失敗しました。通信環境をご確認ください。');
  }
}

async function pullFromCloud(isSilent = false) {
  if (!syncPasscode) syncPasscode = 'default';

  try {
    const res = await fetch(`/api/sync?key=${encodeURIComponent(syncPasscode)}&_t=${Date.now()}`, {
      cache: 'no-store'
    });

    if (res.ok) {
      const cloudData = await res.json();
      if (cloudData && typeof cloudData === 'object' && cloudData.results) {
        // クラウドの回答数や最終設問をローカルと比較
        const cloudCount = Object.keys(cloudData.results).length;
        const localCount = Object.keys(historyData.results).length;
        const cloudQId = cloudData.lastQuestionId || 1;
        const localQId = historyData.lastQuestionId || 1;

        // クラウド側が最新または初回ロード時に反映
        if (cloudCount >= localCount || cloudQId !== localQId || localCount === 0) {
          applyImportedData(cloudData);
          updateSyncStatusUI(true, `☁️ 最新データを同期済み（合言葉: ${syncPasscode}）`);
          if (isSilent) {
            showToastNotification(`☁️ クラウドから最新の進捗を同期しました (質問 #${cloudQId})`);
          } else {
            alert('✅ クラウドから最新の学習進捗を取得しました！');
          }
        }
      }
    } else if (res.status === 404) {
      // First time with this key: push local data to seed the cloud
      pushToCloud(true);
    }
  } catch (err) {
    console.warn('Cloud sync pull warning:', err);
    if (!isSilent) alert('クラウドからの取得に失敗しました。通信環境をご確認ください。');
  }
}

function applyImportedData(data) {
  if (!data || typeof data !== 'object') return;

  historyData.results = { ...historyData.results, ...(data.results || {}) };
  if (Array.isArray(data.bookmarks)) {
    historyData.bookmarks = new Set([...historyData.bookmarks, ...data.bookmarks]);
  }
  if (data.dailyActivity) {
    historyData.dailyActivity = { ...historyData.dailyActivity, ...data.dailyActivity };
  }
  if (data.lastQuestionId) {
    historyData.lastQuestionId = data.lastQuestionId;
  }
  if (data.lastSet && data.lastSet !== 'exam30') {
    historyData.lastSet = data.lastSet;
    currentSet = data.lastSet;
    updateSetButtonsUI();
  }

  saveHistoryToStorage();
  updateStreakDisplay();
  applyCurrentSetAndFilter(true);
}

function showToastNotification(msg) {
  let toast = document.getElementById('syncToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'syncToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = '#1e293b';
    toast.style.color = '#ffffff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = 'var(--radius-md)';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '9999';
    toast.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3000);
}
