export const MONEY_AMOUNTS = Object.freeze([
  1,
  5,
  10,
  50,
  100,
  200,
  300,
  500,
  750,
  1000,
  2500,
  5000,
  7500,
  10000,
  25000,
  50000,
  75000,
  100000,
  150000,
  250000,
  400000,
  600000,
  800000,
  1000000,
  1500000,
  2000000
]);

export const ROUND_OPEN_COUNTS = Object.freeze([6, 5, 4, 3, 2, 1, 1, 1, 1]);

const OFFER_FACTORS = Object.freeze([0.42, 0.52, 0.62, 0.72, 0.8, 0.88, 0.93, 0.97, 0.99]);

export function createGame(rng = Math.random) {
  const shuffledAmounts = shuffle([...MONEY_AMOUNTS], rng);

  return {
    boxes: shuffledAmounts.map((amount, index) => ({
      id: index + 1,
      amount,
      status: "closed"
    })),
    phase: "chooseBox",
    playerBoxId: null,
    roundIndex: 0,
    boxesToOpen: 0,
    openedThisRound: [],
    offer: null,
    acceptedOffer: null,
    finalChoice: null,
    prize: null,
    offerHistory: []
  };
}

export function selectPlayerBox(state, boxId) {
  assertPhase(state, "chooseBox");
  const box = getBox(state, boxId);

  if (box.status !== "closed") {
    throw new Error("只能选择未打开的箱子。");
  }

  const next = cloneState(state);
  const selected = getBox(next, boxId);
  selected.status = "player";
  next.playerBoxId = boxId;
  next.phase = "openBoxes";
  next.boxesToOpen = ROUND_OPEN_COUNTS[0];
  next.openedThisRound = [];
  return next;
}

export function openBox(state, boxId) {
  assertPhase(state, "openBoxes");
  const box = getBox(state, boxId);

  if (box.id === state.playerBoxId) {
    throw new Error("玩家自己的箱子不能在开箱回合中打开。");
  }

  if (box.status !== "closed") {
    throw new Error("只能打开未打开的箱子。");
  }

  const next = cloneState(state);
  const target = getBox(next, boxId);
  target.status = "opened";
  next.boxesToOpen -= 1;
  next.openedThisRound = [...next.openedThisRound, boxId];

  if (next.boxesToOpen === 0) {
    next.phase = "offer";
    next.offer = createOffer(next);
    next.offerHistory = [...next.offerHistory, next.offer];
  }

  return next;
}

export function acceptDeal(state) {
  assertPhase(state, "offer");

  if (!state.offer) {
    throw new Error("当前没有可接受的报价。");
  }

  const next = cloneState(state);
  next.phase = "gameOver";
  next.acceptedOffer = next.offer;
  next.prize = next.offer.amount;
  next.offer = null;
  revealFinalBoxes(next);
  return next;
}

export function rejectDeal(state) {
  assertPhase(state, "offer");

  const next = cloneState(state);
  next.offer = null;

  if (getClosedNonPlayerBoxes(next).length === 1) {
    next.phase = "finalChoice";
    return next;
  }

  next.roundIndex += 1;
  next.phase = "openBoxes";
  next.boxesToOpen = Math.min(ROUND_OPEN_COUNTS[next.roundIndex] ?? 1, getClosedNonPlayerBoxes(next).length - 1);
  next.openedThisRound = [];
  return next;
}

export function resolveFinalChoice(state, choice) {
  assertPhase(state, "finalChoice");

  if (!["keep", "swap"].includes(choice)) {
    throw new Error("最终选择必须是 keep 或 swap。");
  }

  const next = cloneState(state);
  const playerBox = getBox(next, next.playerBoxId);
  const lastBox = getClosedNonPlayerBoxes(next)[0];
  const prizeBox = choice === "keep" ? playerBox : lastBox;

  next.phase = "gameOver";
  next.finalChoice = choice;
  next.prize = prizeBox.amount;
  playerBox.status = choice === "keep" ? "won" : "revealed";
  lastBox.status = choice === "swap" ? "won" : "revealed";
  return next;
}

export function getRemainingAmounts(state) {
  return state.boxes.filter((box) => box.status !== "opened").map((box) => box.amount);
}

export function getOpenedAmounts(state) {
  return state.boxes.filter((box) => box.status === "opened").map((box) => box.amount);
}

export function getClosedNonPlayerBoxes(state) {
  return state.boxes.filter((box) => box.status === "closed");
}

export function getHighestRemainingAmount(state) {
  return Math.max(...getRemainingAmounts(state));
}

export function formatMoney(amount) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(amount);
}

function createOffer(state) {
  const remainingAmounts = getRemainingAmounts(state);
  const average = mean(remainingAmounts);
  const sorted = [...remainingAmounts].sort((a, b) => a - b);
  const middle = median(sorted);
  const factor = OFFER_FACTORS[state.roundIndex] ?? OFFER_FACTORS.at(-1);
  const premiumCount = remainingAmounts.filter((amount) => amount >= 400000).length;
  const premiumRatio = premiumCount / remainingAmounts.length;
  const pressure = state.roundIndex >= 5 ? 0.08 : 0.04;
  const rawOffer = average * factor + middle * pressure + average * premiumRatio * 0.06;

  return {
    round: state.roundIndex + 1,
    amount: roundToFriendlyValue(rawOffer),
    expectedValue: Math.round(average),
    remainingCount: remainingAmounts.length,
    highestRemaining: Math.max(...remainingAmounts),
    openedBoxIds: [...state.openedThisRound]
  };
}

function roundToFriendlyValue(value) {
  if (value >= 1000000) {
    return Math.round(value / 50000) * 50000;
  }

  if (value >= 100000) {
    return Math.round(value / 10000) * 10000;
  }

  if (value >= 10000) {
    return Math.round(value / 1000) * 1000;
  }

  if (value >= 1000) {
    return Math.round(value / 100) * 100;
  }

  return Math.max(1, Math.round(value));
}

function revealFinalBoxes(state) {
  for (const box of state.boxes) {
    if (box.status === "closed" || box.status === "player") {
      box.status = box.id === state.playerBoxId ? "revealed-player" : "revealed";
    }
  }
}

function cloneState(state) {
  return {
    ...state,
    boxes: state.boxes.map((box) => ({ ...box })),
    openedThisRound: [...state.openedThisRound],
    offer: state.offer ? { ...state.offer, openedBoxIds: [...state.offer.openedBoxIds] } : null,
    acceptedOffer: state.acceptedOffer ? { ...state.acceptedOffer, openedBoxIds: [...state.acceptedOffer.openedBoxIds] } : null,
    offerHistory: state.offerHistory.map((offer) => ({ ...offer, openedBoxIds: [...offer.openedBoxIds] }))
  };
}

function getBox(state, boxId) {
  const box = state.boxes.find((candidate) => candidate.id === boxId);

  if (!box) {
    throw new Error(`不存在编号为 ${boxId} 的箱子。`);
  }

  return box;
}

function assertPhase(state, phase) {
  if (state.phase !== phase) {
    throw new Error(`当前阶段不能执行该操作：需要 ${phase}，实际为 ${state.phase}。`);
  }
}

function shuffle(items, rng) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(sortedValues) {
  const middle = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middle];
  }

  return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}
