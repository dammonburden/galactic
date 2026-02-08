# Galactic Tower Defense

Single-map, wave-based tower defense with modular JavaScript and a single HTML shell. Enemies spawn in paced packs, bosses arrive every five waves, and a spawner chassis launches friendly units along the track. After each cleared wave, your bank gains 20% interest.

## Run locally

```bash
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/index.html` in a modern Chromium-based browser.

## Controls

- Click empty space to place a tower.
- Click a tower to select it.
- `U` or **Upgrade** upgrades the selected tower.
- Right-click a tower to sell.
- `Q`/`E` cycles chassis, `1-3` selects weapon.
- Space toggles pause.
- Use the speed buttons (1x/5x/50x/500x) to fast-forward waves.
