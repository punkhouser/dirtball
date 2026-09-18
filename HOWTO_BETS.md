# How to place bets

The betting bridge lets you pick bets in a browser and queue them locally; CI
imports and resolves them. Your local machine never writes the database — it
only appends to `data/pending_bets.json` in the `gimme_rubies` repo.

## 1. Start the local queue server

From the `gimme_rubies` repo root (a terminal where `ruby`/`bundle` resolve to
your local Ruby):

```bash
bundle exec ruby scripts/bet_slip.rb
```

It prints a one-time `token: <hex>`, serves `http://localhost:4567`, and
exposes the local read-only fixtures (`/api/games` from your local DB).

## 2. Open the bet slip

- **Local** (freshest, uses your local DB): <http://localhost:4567/bet.html>
- **Hosted**: <https://punkhouser.github.io/dirtball/bet.html>
  (fixtures come from the last published snapshot; writes still go to your
  local server)

## 3. Set backend and token

First time only (saved in `localStorage`):

- Backend: `http://localhost:4567`
- Token: the value printed by `bet_slip.rb` in step 1

## 4. Place bets

Tick the games, pick **Home** or **Away**, set the stake and an optional note,
then click **Queue Bet**. The bet is appended to `data/pending_bets.json` and
the page shows the local queue.

- Games that have already started cannot be selected.
- The odds stored at queue time are the odds used when the bet is imported.

## 5. Push before the next CI run

```bash
git add data/pending_bets.json && git commit -m "queued bets" && git push
```

Deadlines (UTC):

- **06:00** — morning run: imports the queue, places tickets, resolves against
  fresh scores (same run).
- **19:00** — evening run: imports/resolves and republishes, no new agent bets.

If your local auto-commit runs, just make sure it stages
`data/pending_bets.json`.

## 6. After the run

The queue file is emptied and the bets become real tickets
(`Logic.import_pending_bets`, refresh step 0). Check them locally with
`./run` → `/tickets`.

A bet whose game already finished by import time is skipped and logged to
`data/pending_bets_warnings.txt`.

## Notes

- Cancel a queued bet by deleting its JSONL line from
  `data/pending_bets.json` before pushing.
- The queue file is append-only JSONL; one bet per line.
- The database `data/gimme_rubies.db` is never written locally — CI is the
  only writer.
