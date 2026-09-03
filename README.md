# AlphagoX

An AlphaGo-inspired Tic Tac Toe game with browser-side [WebMCP](https://webmcp.dev) tools that any browser AI agent can discover and call via `document.modelContext`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You play `X`, the built-in MCTS engine plays `O`.

## WebMCP tools

On page load the game registers nine tools on `document.modelContext` so in-browser AI agents can read and play the live board:

- `get_game_state` — board, current player, status, move count, difficulty
- `play_move` — place `X` or `O` at a position (0–8)
- `get_ai_move` — best move from the AlphaGo-style MCTS engine
- `get_available_moves` — empty squares
- `evaluate_position` — policy + value network scores per square
- `undo_last_move` — take back the last move
- `reset_game` — start a fresh game
- `set_difficulty` — easy / medium / hard / alpha
- `get_move_history` — full move history

`ToolsPanel` in the sidebar shows live registration status. Tools can be toggled (unregister/register) at runtime.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — framework docs

## Deploy on Vercel

```bash
vercel deploy
```