# Mokulua Math

A beachside math practice game with pixel characters, adaptive questions, and collectible rewards.

- Game: https://xy808yx.github.io/mokulua-math/
- Repository: https://github.com/xy808yx/mokulua-math
- Original game address: https://xy808yx.github.io/math-blaster/

## Local preview

Run `python3 -m http.server 8765 --bind 127.0.0.1` from this directory, then open http://127.0.0.1:8765/.

## Original links and saves

The `legacy-site` directory contains the compatibility site for the original `math-blaster` GitHub Pages address. Browser visits forward to Mokulua Math. Older standalone Home Screen launches display the current game in a full-screen frame to preserve their original navigation scope.

Publish the main game and verify it before replacing the old site's contents with `legacy-site`. Both addresses must remain on the same origin. Publish only with explicit release approval.

The `mathblaster_` storage namespace and `/math-blaster/` manifest ID are intentional compatibility values. Keep them unchanged so the rename does not abandon existing saves or change the install identity. Home Screen labels and standalone behavior still require device verification.

The original project folder remains a local compatibility alias for existing tools. The canonical folder is `mokulua-math`.
