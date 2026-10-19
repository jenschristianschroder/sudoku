# Still Sudoku

A self-contained Sudoku app for the browser. It uses no backend, accounts, build step, or external assets. Games and statistics are saved in the current browser with `localStorage`.

## Play locally

Open `index.html` in a modern browser, or serve this folder from any static file server.

## Publish with GitHub Pages

1. Push these files to a GitHub repository on the `main` branch.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
3. The included workflow deploys the site on each push to `main`. The deployment URL appears under **Actions → Deploy to GitHub Pages**.

The app works from a project path (for example, `https://username.github.io/repository/`) and uses URL fragments for puzzle sharing, so shared puzzle data is not sent to a server.

## What’s included

- Five difficulty levels, unlocked after 0, 3, 8, 15, and 25 completed games.
- Sudoku generation with a unique solution for each new puzzle.
- Notes, hints, undo, pause, keyboard input, conflict highlighting, and autosave.
- Per-game history, solve times, mistakes, hints, streak, average and best time.
- Share links for active puzzles and completed games, plus a JSON stats export.
