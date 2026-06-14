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
  newGameButton: document.querySelector("#new-game-button")
};

elements.caseGrid.addEventListener("click", (event) => {
  const caseButton = event.target.closest("[data-box-id]");

  if (!caseButton) {
    return;
  }

  const boxId = Number(caseButton.dataset.boxId);

  try {
    if (game.phase === "chooseBox") {
      game = selectPlayerBox(game, boxId);
    } else if (game.phase === "openBoxes") {
      game = openBox(game, boxId);
    }

    render();
  } catch (error) {
    flashStatus(error.message);
  }
});

elements.dealButton.addEventListener("click", () => {
  game = acceptDeal(game);
  render();
});

elements.noDealButton.addEventListener("click", () => {
  game = rejectDeal(game);
  render();
});

elements.keepButton.addEventListener("click", () => {
  game = resolveFinalChoice(game, "keep");
  render();
});

elements.swapButton.addEventListener("click", () => {
  game = resolveFinalChoice(game, "swap");
  render();
});

elements.newGameButton.addEventListener("click", () => {
  game = createGame();
  render();
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
      return `<span class="amount-pill ${isRemoved ? "removed" : ""}">${formatMoney(amount)}</span>`;
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
