import assert from "node:assert/strict";
import {
  MONEY_AMOUNTS,
  acceptDeal,
  createGame,
  getClosedNonPlayerBoxes,
  openBox,
  rejectDeal,
  resolveFinalChoice,
  selectPlayerBox
} from "../src/game-engine.js";

function seededRng(seed = 42) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

{
  const game = createGame(seededRng());
  assert.equal(game.boxes.length, 26);
  assert.deepEqual(
    [...game.boxes.map((box) => box.amount)].sort((a, b) => a - b),
    [...MONEY_AMOUNTS].sort((a, b) => a - b)
  );
  assert.equal(new Set(game.boxes.map((box) => box.id)).size, 26);
  assert.equal(game.phase, "chooseBox");
}

{
  let game = createGame(seededRng());
  game = selectPlayerBox(game, 7);
  assert.equal(game.playerBoxId, 7);
  assert.equal(game.phase, "openBoxes");
  assert.equal(game.boxesToOpen, 6);

  for (const boxId of [1, 2, 3, 4, 5, 6]) {
    game = openBox(game, boxId);
  }

  assert.equal(game.phase, "offer");
  assert.equal(game.offer.round, 1);
  assert.equal(game.offerHistory.length, 1);
  assert.equal(game.offer.remainingCount, 20);

  game = rejectDeal(game);
  assert.equal(game.phase, "openBoxes");
  assert.equal(game.boxesToOpen, 5);
}

{
  let game = createGame(seededRng(7));
  game = selectPlayerBox(game, 1);

  while (game.phase !== "offer") {
    const nextBox = getClosedNonPlayerBoxes(game)[0];
    game = openBox(game, nextBox.id);
  }

  game = acceptDeal(game);
  assert.equal(game.phase, "gameOver");
  assert.equal(game.prize, game.acceptedOffer.amount);
}

{
  let game = createGame(seededRng(11));
  game = selectPlayerBox(game, 1);

  while (game.phase !== "finalChoice") {
    if (game.phase === "openBoxes") {
      const nextBox = getClosedNonPlayerBoxes(game)[0];
      game = openBox(game, nextBox.id);
    } else if (game.phase === "offer") {
      game = rejectDeal(game);
    }
  }

  assert.equal(getClosedNonPlayerBoxes(game).length, 1);
  game = resolveFinalChoice(game, "swap");
  assert.equal(game.phase, "gameOver");
  assert.equal(typeof game.prize, "number");
  assert.equal(game.finalChoice, "swap");
}
