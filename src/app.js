import {
  MONEY_AMOUNTS,
  acceptDeal,
  createGame,
  formatMoney,
  getClosedNonPlayerBoxes,
  getHighestRemainingAmount,
  getOpenedAmounts,
  getRemainingAmounts,
  openBox,
  rejectDeal,
  resolveFinalChoice,
  selectPlayerBox
} from "./game-engine.js";

let game = createGame();
let soundEnabled = readSoundPreference();

const audio = createAudioController();
const effectTimers = new WeakMap();

const elements = {
  caseGrid: document.querySelector("#case-grid"),
  amountList: document.querySelector("#amount-list"),
  phaseTitle: document.querySelector("#phase-title"),
  roundTarget: document.querySelector("#round-target"),
  highestRemaining: document.querySelector("#highest-remaining"),
  playerBoxLabel: document.querySelector("#player-box-label"),
  offerPanel: document.querySelector("#offer-panel"),
  offerValue: document.querySelector("#offer-value"),
  dealButton: document.querySelector("#deal-button"),
  noDealButton: document.querySelector("#no-deal-button"),
  finalPanel: document.querySelector("#final-panel"),
  finalPrompt: document.querySelector("#final-prompt"),
  keepButton: document.querySelector("#keep-button"),
  swapButton: document.querySelector("#swap-button"),
  resultPanel: document.querySelector("#result-panel"),
  resultTitle: document.querySelector("#result-title"),
  resultDetail: document.querySelector("#result-detail"),
  offerHistory: document.querySelector("#offer-history"),
  offerCount: document.querySelector("#offer-count"),
  remainingCount: document.querySelector("#remaining-count"),
  newGameButton: document.querySelector("#new-game-button"),
  soundToggle: document.querySelector("#sound-toggle"),
  stage: document.querySelector(".stage"),
  celebrationLayer: document.querySelector("#celebration-layer")
};

elements.soundToggle.checked = soundEnabled;

elements.soundToggle.addEventListener("change", () => {
  soundEnabled = elements.soundToggle.checked;
  writeSoundPreference(soundEnabled);

  if (soundEnabled) {
    audio.playToggleOn();
  }
});

elements.caseGrid.addEventListener("click", (event) => {
  const caseButton = event.target.closest("[data-box-id]");

  if (!caseButton) {
    return;
  }

  const boxId = Number(caseButton.dataset.boxId);

  try {
    if (game.phase === "chooseBox") {
      const nextGame = selectPlayerBox(game, boxId);
      game = nextGame;
      render();
      triggerSelectedBoxEffects(boxId);
      return;
    }

    if (game.phase === "openBoxes") {
      const nextGame = openBox(game, boxId);
      const openedBox = nextGame.boxes.find((box) => box.id === boxId);
      const hasOfferArrived = nextGame.phase === "offer";

      game = nextGame;
      render();
      triggerOpenBoxEffects(openedBox, hasOfferArrived);
      return;
    }

    render();
  } catch (error) {
    flashStatus(error.message);
  }
});

elements.dealButton.addEventListener("click", () => {
  const acceptedOffer = game.offer;
  game = acceptDeal(game);
  render();
  triggerDealEffects(acceptedOffer);
});

elements.noDealButton.addEventListener("click", () => {
  game = rejectDeal(game);
  render();
  triggerNoDealEffects();
});

elements.keepButton.addEventListener("click", () => {
  game = resolveFinalChoice(game, "keep");
  render();
  triggerFinalRevealEffects();
});

elements.swapButton.addEventListener("click", () => {
  game = resolveFinalChoice(game, "swap");
  render();
  triggerFinalRevealEffects();
});

elements.newGameButton.addEventListener("click", () => {
  game = createGame();
  render();
  triggerNewGameEffects();
});

render();

function render() {
  renderCases();
  renderAmounts();
  renderStatus();
  renderOffer();
  renderFinalChoice();
  renderResult();
  renderHistory();
}

function renderCases() {
  elements.caseGrid.innerHTML = game.boxes
    .map((box) => {
      const isInteractive =
        (game.phase === "chooseBox" && box.status === "closed") ||
        (game.phase === "openBoxes" && box.status === "closed");
      const amountText = shouldShowAmount(box) ? formatMoney(box.amount) : "";
      const statusLabel = getCaseStatusLabel(box);

      return `
        <button
          class="case-card ${box.status}"
          type="button"
          data-box-id="${box.id}"
          ${isInteractive ? "" : "disabled"}
          aria-label="${statusLabel}"
        >
          <span class="case-handle"></span>
          <span class="case-number">${box.id}</span>
          <span class="case-amount">${amountText}</span>
        </button>
      `;
    })
    .join("");
}

function renderAmounts() {
  const openedAmounts = new Set(getOpenedAmounts(game));
  const sortedAmounts = [...MONEY_AMOUNTS].sort((a, b) => a - b);
  elements.remainingCount.textContent = `${getRemainingAmounts(game).length} 项`;
  elements.amountList.innerHTML = sortedAmounts
    .map((amount) => {
      const isRemoved = openedAmounts.has(amount);
      return `<span class="amount-pill ${isRemoved ? "removed" : ""}" data-amount="${amount}">${formatMoney(amount)}</span>`;
    })
    .join("");
}

function renderStatus() {
  elements.playerBoxLabel.textContent = game.playerBoxId ? `#${game.playerBoxId}` : "未选择";
  elements.highestRemaining.textContent = formatMoney(getHighestRemainingAmount(game));

  if (game.phase === "chooseBox") {
    elements.phaseTitle.textContent = "选择你的箱子";
    elements.roundTarget.textContent = "先保留 1 个箱子";
    return;
  }

  if (game.phase === "openBoxes") {
    elements.phaseTitle.textContent = `第 ${game.roundIndex + 1} 轮开箱`;
    elements.roundTarget.textContent = `还需打开 ${game.boxesToOpen} 个`;
    return;
  }

  if (game.phase === "offer") {
    elements.phaseTitle.textContent = `第 ${game.roundIndex + 1} 轮报价`;
    elements.roundTarget.textContent = "选择 Deal 或 No Deal";
    return;
  }

  if (game.phase === "finalChoice") {
    elements.phaseTitle.textContent = "最后两个箱子";
    elements.roundTarget.textContent = "保留或交换";
    return;
  }

  elements.phaseTitle.textContent = "游戏结束";
  elements.roundTarget.textContent = formatMoney(game.prize);
}

function renderOffer() {
  const isOfferPhase = game.phase === "offer" && game.offer;
  elements.offerPanel.hidden = !isOfferPhase;

  if (isOfferPhase) {
    elements.offerValue.textContent = formatMoney(game.offer.amount);
  }
}

function renderFinalChoice() {
  const isFinalChoice = game.phase === "finalChoice";
  elements.finalPanel.hidden = !isFinalChoice;

  if (isFinalChoice) {
    const lastBox = getClosedNonPlayerBoxes(game)[0];
    elements.finalPrompt.textContent = `你的 #${game.playerBoxId} 或最后的 #${lastBox.id}`;
  }
}

function renderResult() {
  elements.resultPanel.hidden = game.phase !== "gameOver";

  if (game.phase !== "gameOver") {
    return;
  }

  elements.resultTitle.textContent = `获得 ${formatMoney(game.prize)}`;

  if (game.acceptedOffer) {
    const ownBox = game.boxes.find((box) => box.id === game.playerBoxId);
    elements.resultDetail.textContent = `你在第 ${game.acceptedOffer.round} 轮接受报价。你的原箱金额是 ${formatMoney(ownBox.amount)}。`;
    return;
  }

  const choiceText = game.finalChoice === "swap" ? "交换了最后一个箱子" : "保留了自己的箱子";
  elements.resultDetail.textContent = `你${choiceText}，最终奖金已揭晓。`;
}

function renderHistory() {
  elements.offerCount.textContent = `${game.offerHistory.length} 次`;
  elements.offerHistory.innerHTML = game.offerHistory
    .map(
      (offer) => `
        <li>
          <span>第 ${offer.round} 轮</span>
          <strong>${formatMoney(offer.amount)}</strong>
        </li>
      `
    )
    .join("");
}

function triggerSelectedBoxEffects(boxId) {
  restartAnimation(getCaseElement(boxId), "case-selected-now", 820);
  restartAnimation(elements.stage, "stage-selected", 700);
  audio.playSelectCase();
}

function triggerOpenBoxEffects(openedBox, hasOfferArrived) {
  if (!openedBox) {
    return;
  }

  restartAnimation(getCaseElement(openedBox.id), "case-opened-now", 900);
  restartAnimation(getAmountElement(openedBox.amount), "amount-removed-now", 760);
  audio.playOpenBox(openedBox.amount);

  if (hasOfferArrived) {
    window.setTimeout(() => {
      triggerOfferArrivalEffects();
    }, 520);
  }
}

function triggerOfferArrivalEffects() {
  restartAnimation(elements.offerPanel, "offer-arrived", 1600);
  restartAnimation(elements.stage, "stage-ringing", 1400);
  audio.playBankerCall();
}

function triggerDealEffects() {
  restartAnimation(elements.resultPanel, "result-arrived", 1200);
  restartAnimation(elements.stage, "stage-settled", 900);
  audio.playDeal();
}

function triggerNoDealEffects() {
  audio.playNoDeal();

  if (game.phase === "finalChoice") {
    restartAnimation(elements.finalPanel, "final-choice-arrived", 1300);
    restartAnimation(elements.stage, "stage-final", 1200);
    audio.playFinalPrompt();
    return;
  }

  restartAnimation(elements.stage, "stage-continue", 720);
}

function triggerFinalRevealEffects() {
  const wonBox = game.boxes.find((box) => box.status === "won");

  restartAnimation(elements.resultPanel, "result-arrived", 1300);
  restartAnimation(elements.stage, "stage-final-reveal", 1600);

  if (wonBox) {
    restartAnimation(getCaseElement(wonBox.id), "case-won-now", 1800);
  }

  spawnCelebration(game.prize);
  audio.playFinalReveal(game.prize);
}

function triggerNewGameEffects() {
  restartAnimation(elements.caseGrid, "board-shuffle", 900);
  restartAnimation(elements.stage, "stage-new-game", 700);
  audio.playShuffle();
}

function getCaseElement(boxId) {
  return elements.caseGrid.querySelector(`[data-box-id="${boxId}"]`);
}

function getAmountElement(amount) {
  return elements.amountList.querySelector(`[data-amount="${amount}"]`);
}

function restartAnimation(element, className, duration) {
  if (!element) {
    return;
  }

  const existingTimer = effectTimers.get(element);

  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  effectTimers.set(
    element,
    window.setTimeout(() => {
      element.classList.remove(className);
      effectTimers.delete(element);
    }, duration)
  );
}

function spawnCelebration(prize) {
  const particleCount = prize >= 400000 ? 34 : 22;
  elements.celebrationLayer.innerHTML = "";
  restartAnimation(elements.celebrationLayer, "celebration-active", 1700);

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    particle.className = "celebration-particle";
    particle.style.setProperty("--left", `${8 + Math.random() * 84}%`);
    particle.style.setProperty("--drift", `${Math.random() * 12 - 6}rem`);
    particle.style.setProperty("--delay", `${Math.random() * 0.45}s`);
    particle.style.setProperty("--duration", `${1.05 + Math.random() * 0.85}s`);
    particle.style.setProperty("--spin", `${Math.random() * 540 - 270}deg`);
    particle.style.setProperty("--tone", index % 3 === 0 ? "var(--teal)" : index % 3 === 1 ? "var(--brass)" : "var(--ruby-bright)");
    elements.celebrationLayer.append(particle);
  }

  window.setTimeout(() => {
    elements.celebrationLayer.innerHTML = "";
  }, 2000);
}

function shouldShowAmount(box) {
  return ["opened", "won", "revealed", "revealed-player"].includes(box.status);
}

function getCaseStatusLabel(box) {
  if (box.status === "player") {
    return `你的箱子 ${box.id}`;
  }

  if (shouldShowAmount(box)) {
    return `箱子 ${box.id}，金额 ${formatMoney(box.amount)}`;
  }

  return `箱子 ${box.id}`;
}

function flashStatus(message) {
  const previous = elements.roundTarget.textContent;
  elements.roundTarget.textContent = message;
  window.setTimeout(() => {
    elements.roundTarget.textContent = previous;
  }, 1400);
}

function readSoundPreference() {
  try {
    return window.localStorage.getItem("26boxes.sound") !== "off";
  } catch {
    return true;
  }
}

function writeSoundPreference(enabled) {
  try {
    window.localStorage.setItem("26boxes.sound", enabled ? "on" : "off");
  } catch {
    // Local storage may be unavailable in restricted browser contexts.
  }
}

function createAudioController() {
  let context = null;

  function ensureContext() {
    if (!soundEnabled) {
      return null;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!context) {
      context = new AudioContextClass();
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    return context;
  }

  function playTone({ frequency, delay = 0, duration = 0.12, type = "sine", volume = 0.08, endFrequency = null }) {
    const activeContext = ensureContext();

    if (!activeContext) {
      return;
    }

    const now = activeContext.currentTime + delay;
    const oscillator = activeContext.createOscillator();
    const gain = activeContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(activeContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playNoise({ delay = 0, duration = 0.12, volume = 0.04 }) {
    const activeContext = ensureContext();

    if (!activeContext) {
      return;
    }

    const sampleCount = Math.floor(activeContext.sampleRate * duration);
    const buffer = activeContext.createBuffer(1, sampleCount, activeContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    const source = activeContext.createBufferSource();
    const gain = activeContext.createGain();
    const now = activeContext.currentTime + delay;

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = buffer;
    source.connect(gain).connect(activeContext.destination);
    source.start(now);
  }

  function playSequence(notes) {
    for (const note of notes) {
      playTone(note);
    }
  }

  return {
    playToggleOn() {
      playSequence([
        { frequency: 620, duration: 0.07, volume: 0.05 },
        { frequency: 880, delay: 0.07, duration: 0.09, volume: 0.05 }
      ]);
    },
    playSelectCase() {
      playNoise({ duration: 0.08, volume: 0.035 });
      playSequence([
        { frequency: 420, duration: 0.08, type: "triangle", volume: 0.055 },
        { frequency: 680, delay: 0.06, duration: 0.1, type: "triangle", volume: 0.055 }
      ]);
    },
    playOpenBox(amount) {
      playNoise({ duration: 0.14, volume: 0.055 });

      if (amount >= 400000) {
        playSequence([
          { frequency: 230, delay: 0.02, duration: 0.16, type: "sawtooth", volume: 0.075, endFrequency: 140 },
          { frequency: 110, delay: 0.16, duration: 0.26, type: "triangle", volume: 0.06 }
        ]);
        return;
      }

      playSequence([
        { frequency: 560, delay: 0.02, duration: 0.07, type: "triangle", volume: 0.055 },
        { frequency: 760, delay: 0.09, duration: 0.08, type: "triangle", volume: 0.05 },
        { frequency: 1040, delay: 0.17, duration: 0.12, type: "sine", volume: 0.045 }
      ]);
    },
    playBankerCall() {
      for (let ring = 0; ring < 3; ring += 1) {
        const delay = ring * 0.42;
        playTone({ frequency: 440, delay, duration: 0.22, type: "sine", volume: 0.055 });
        playTone({ frequency: 480, delay, duration: 0.22, type: "sine", volume: 0.045 });
        playTone({ frequency: 440, delay: delay + 0.24, duration: 0.12, type: "sine", volume: 0.045 });
        playTone({ frequency: 480, delay: delay + 0.24, duration: 0.12, type: "sine", volume: 0.035 });
      }
    },
    playDeal() {
      playNoise({ duration: 0.1, volume: 0.035 });
      playSequence([
        { frequency: 880, duration: 0.08, type: "triangle", volume: 0.06 },
        { frequency: 1175, delay: 0.08, duration: 0.08, type: "triangle", volume: 0.055 },
        { frequency: 1568, delay: 0.17, duration: 0.18, type: "sine", volume: 0.05 }
      ]);
    },
    playNoDeal() {
      playSequence([
        { frequency: 170, duration: 0.16, type: "triangle", volume: 0.055, endFrequency: 120 },
        { frequency: 92, delay: 0.11, duration: 0.2, type: "sine", volume: 0.04 }
      ]);
    },
    playFinalPrompt() {
      playSequence([
        { frequency: 260, duration: 0.16, type: "triangle", volume: 0.045 },
        { frequency: 330, delay: 0.18, duration: 0.18, type: "triangle", volume: 0.045 },
        { frequency: 390, delay: 0.38, duration: 0.22, type: "triangle", volume: 0.045 }
      ]);
    },
    playFinalReveal(prize) {
      const highPrize = prize >= 400000;
      const notes = highPrize
        ? [523, 659, 784, 1047, 1319]
        : [392, 494, 587, 784];

      notes.forEach((frequency, index) => {
        playTone({
          frequency,
          delay: index * 0.1,
          duration: index === notes.length - 1 ? 0.34 : 0.12,
          type: "triangle",
          volume: highPrize ? 0.065 : 0.052
        });
      });
      playNoise({ delay: highPrize ? 0.48 : 0.34, duration: 0.16, volume: highPrize ? 0.045 : 0.028 });
    },
    playShuffle() {
      playSequence([
        { frequency: 320, duration: 0.04, type: "square", volume: 0.035 },
        { frequency: 420, delay: 0.05, duration: 0.04, type: "square", volume: 0.035 },
        { frequency: 520, delay: 0.1, duration: 0.04, type: "square", volume: 0.035 },
        { frequency: 760, delay: 0.17, duration: 0.12, type: "triangle", volume: 0.04 }
      ]);
    }
  };
}
