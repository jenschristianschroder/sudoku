# Sudoku

A modern, self-contained Sudoku app for the browser. It uses no backend, accounts, build step, or external assets. Games and statistics are saved in the current browser with `localStorage`.

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
- Daily goal of one completed puzzle, with a visible streak and today’s 0/1 or 1/1 status. Consecutive local calendar days count once each; a missed day resets the streak. Existing game history counts automatically. The header includes all difficulties; the Statistics streak follows the difficulty filter.
- Share links for active puzzles and completed games, plus a JSON stats export.
- Light, dark, Forest, Ocean, Rose, and Sunset themes in the settings menu.
- Responsive modern interface with a large game board, focused controls, live board progress, and quick access to all statistics.

## Storage and privacy

Game state, history, and preferences are saved in the browser's local storage on the device. There is no account, cloud sync, or game database. Browser storage is not encrypted, can be accessed by someone using the same browser profile, and is removed if the site's stored data is cleared. A share link contains the puzzle and its filled cells, but not game statistics; anyone with that link can open the puzzle.

## Generator checks

Completed grids are built with randomized backtracking. Grids with the same three
unordered digit triples repeated across every box of a band or stack are rejected.
Clues are then removed only when the puzzle still has exactly one solution.
Difficulty levels retain their existing clue targets; these are not ratings of
human solving techniques.

Run the deterministic regression suite with Node.js:

```sh
node --test tests/*.test.cjs
```

It covers the reported repeating pattern, both orientations, and 500 puzzles
across all five levels, including an independent uniqueness check.
