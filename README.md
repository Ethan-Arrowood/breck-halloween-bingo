# Haunted Bingo

A mobile-first Halloween bingo card for a night out in Breckenridge. It's a static page with no build step: each player gets a random card, taps squares to stamp them, and their progress is saved in that browser's `localStorage`.

## Edit the items

Open `items.js` and add, remove or reword strings in the `window.BINGO_ITEMS` array.

- A card uses 24 items plus the FREE square, so keep at least 24. Around 40 or more keeps cards different between players.
- Aim for under 28 characters so items fit in a square on a phone.
- Anyone who already has a card keeps it until they tap **New Card**. List changes only show up on new cards.

## Run it locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

## Deploy

In the repo's **Settings → Pages**, deploy from the `main` branch root.
