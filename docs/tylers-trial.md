# Tyler's Trial

Tyler's Trial is the hidden mini-game for the Surrey 1837 Club site. It sits at `tylers-trial.html` and is opened from the footer acacia mark after three clicks.

## Product Notes

- Keep the game separate from normal site navigation and the sitemap.
- Keep terminology public-safe and British Craft / UGLE-flavoured.
- Avoid private ritual language, US-specific imagery, Shriners, fez imagery, and real lodge meeting content.
- The game loop is setup, match, build, defend, score, and submit to the existing leaderboard.

## Main Files

- `tylers-trial.html`: hidden game page shell.
- `tylers-trial.js`: canvas game logic, rendering, input, leaderboard calls, and local fallback.
- `tylers-leaderboard-config.js`: public Supabase configuration for leaderboard insert/select.
- `assets/tylers-*`: generated game backgrounds, sprites, and UI sheets.

## QA Checklist

- The acacia footer trigger opens `tylers-trial.html` after three clicks.
- The board, side panels, controls, and score display are visible on desktop and mobile.
- Guard, Call Off, Installation, and other abilities behave as described in the game.
- Matches and merges only affect intended cells unless Installation or degree transition explicitly reshuffles eligible tiles.
- High Scores loads online when Supabase is available and uses local fallback when it is not.
