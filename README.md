# Knesset Kombat 26

### ▶ [Play it in your browser](https://yarinbnyamin.github.io/knesset-kombat-26/)

A Mortal Kombat-style parody fighting game in Three.js, set in a fictional Knesset plenum.

![Fight](screenshots/fight.jpg)

## The experiment

This experiment gave **Claude Opus 5.5 (High)** a gameplay video from Instagram:
https://www.instagram.com/reel/Dd37xNRiz8x/

It took Claude **about 50 minutes** to recreate a playable, similar game, one-shot. It got no other instructions besides the link. (When Claude asked clarifying questions, the only answer was "it's one-shot, do your best".)

What Claude did in those ~50 minutes (16:13 → 17:03):

- Opened the reel in a browser. Instagram needed a login, so it pulled 18 frames straight out of the video element (no audio) and studied them.
- Designed and wrote the whole game from scratch: no assets, no build step, about 2,500 lines of JavaScript.
- Play-tested it in the browser (a full CPU-vs-CPU match, every special, the menus) and fixed what it found.

Everything is procedural: the character models, animation, arena, textures, particles, music, sound effects and announcer (browser speech synthesis).

| | |
|---|---|
| ![Title](screenshots/title.jpg) | ![Select](screenshots/select.jpg) |
| ![Tung Tung Sahur](screenshots/sahur.jpg) | |

## Features

- Gavel-slam intro, title screen, character select, VS screen, best-of-3 rounds, FINISH HIM, fatality, results.
- **8 fighters.** The Speaker, Treasurer, Opposition, Whip, Spokeswoman, Backbencher and Lobbyist are fictional caricatures. Tung Tung Sahur is a log with a bat.
- **One special per fighter:** gavel toss, shekel storm, "נגד" ballot, filibuster sound rings, press release, paper jet, a bribe briefcase, and Sahur's tung-tung dash.
- **Parliamentary Fatality:** a giant gavel flattens the loser.
- **Modes:** 1 player vs CPU, 2 players on one keyboard, CPU vs CPU. Gamepads are supported.

All fighters are fictional archetypes. No real MKs were harmed.

## Controls

| | Player 1 | Player 2 | Gamepad |
|---|---|---|---|
| Move / jump / crouch | W A S D | Arrows | D-pad / stick |
| Punch | J | , or Num1 | □ / X |
| Kick | K | . or Num2 | ✕ / A |
| Block | L | / or Num3 | ○ / B, bumpers, triggers |
| Special | I or U | ; or Num5 | △ / Y |
| Pause | Esc or P | | Options |

- Down + Punch: uppercut (launcher)
- Down + Kick: sweep (low)
- Forward + Kick: roundhouse
- Punch or Kick while jumping: overhead attack
- Stand to block high, crouch to block low.
- At FINISH HIM, press Special for the Parliamentary Fatality.
- M: mute

Keyboard or gamepad only for now. There are no touch controls.

## Run locally

ES modules need a local server (no build step, no Node):

```bash
python3 -m http.server 8026
```

Then open http://localhost:8026.

## Files

- `src/roster.js`: the fighters (looks, stats, specials). Add `face: 'faces/x.png'` to a fighter to put an image on its head.
- `src/fighter.js`: state machine, move frame data, hitboxes
- `src/poses.js`: procedural animation poses
- `src/model.js`: procedural character models, portraits
- `src/stage.js`: the arena, lighting, fire
- `src/projectiles.js`, `src/ai.js`, `src/audio.js` (all synthesized), `src/input.js`, `src/ui.js`
- `src/main.js`: game flow (title → select → versus → rounds → finish → results)

Console helper: `__dbg.fight(0, 7, 'cpu')` jumps straight into a match.
