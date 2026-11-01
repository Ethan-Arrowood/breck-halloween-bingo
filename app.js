(function () {
  'use strict';

  const STORAGE_KEY = 'halloween-bingo-v1';
  const SIZE = 5;
  const CELL_COUNT = SIZE * SIZE;
  const FREE_INDEX = 12;
  const FREE_TEXT = 'FREE';
  const SOFT_HYPHEN = '­';
  const LINES = buildLines();

  const board = document.getElementById('board');
  const status = document.getElementById('status');
  const confirmDialog = document.getElementById('confirm');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmOk = document.getElementById('confirm-ok');
  const winDialog = document.getElementById('win');
  const winTitle = document.getElementById('win-title');
  const winDetail = document.getElementById('win-detail');

  const itemPool = Array.from(new Set(window.BINGO_ITEMS || []));
  const canPlay = itemPool.length >= CELL_COUNT - 1;

  let card = null;

  function buildLines() {
    const lines = [];
    for (let i = 0; i < SIZE; i++) {
      const row = [];
      const column = [];
      for (let j = 0; j < SIZE; j++) {
        row.push(i * SIZE + j);
        column.push(j * SIZE + i);
      }
      lines.push(row, column);
    }
    const diagonal = [];
    const antiDiagonal = [];
    for (let i = 0; i < SIZE; i++) {
      diagonal.push(i * SIZE + i);
      antiDiagonal.push(i * SIZE + (SIZE - 1 - i));
    }
    lines.push(diagonal, antiDiagonal);
    return lines;
  }

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function generateCard() {
    const texts = shuffle(itemPool).slice(0, CELL_COUNT - 1);
    texts.splice(FREE_INDEX, 0, FREE_TEXT);
    return {
      cells: texts.map((text, index) => ({ text, checked: index === FREE_INDEX })),
      createdAt: Date.now(),
    };
  }

  // Storage

  function isValidCard(value) {
    return Boolean(value)
      && Array.isArray(value.cells)
      && value.cells.length === CELL_COUNT
      && value.cells.every((cell) => cell
        && typeof cell.text === 'string'
        && typeof cell.checked === 'boolean')
      && value.cells[FREE_INDEX].text === FREE_TEXT
      && value.cells[FREE_INDEX].checked;
  }

  function loadCard() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return isValidCard(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveCard() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(card));
      return true;
    } catch {
      return false;
    }
  }

  // Progress lives in memory only when storage is unavailable, so don't claim it saved.
  function saveAndReport() {
    if (saveCard()) {
      flashStatus('Saved ✓');
    } else {
      setStatus('Can’t save here: a refresh will lose this card.');
    }
  }

  // Rendering

  function setStatus(message) {
    status.classList.remove('status--flash');
    status.textContent = message;
  }

  function flashStatus(message) {
    setStatus(message);
    void status.offsetWidth; // restart the fade when it fires twice in a row
    status.classList.add('status--flash');
  }

  function buildBoard() {
    board.replaceChildren(...card.cells.map((cell, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.dataset.index = index;

      if (index === FREE_INDEX) {
        button.classList.add('cell--free');
        button.setAttribute('aria-disabled', 'true');
        const emoji = document.createElement('span');
        emoji.className = 'free-emoji';
        emoji.setAttribute('aria-hidden', 'true');
        emoji.textContent = '💀';
        button.append(emoji);
      }

      const text = document.createElement('span');
      text.className = 'cell-text';
      text.textContent = cell.text;
      button.append(text);
      return button;
    }));
    updateBoard();
  }

  function updateBoard() {
    const winning = new Set(completedLines().flat());
    Array.from(board.children).forEach((button, index) => {
      button.setAttribute('aria-pressed', String(card.cells[index].checked));
      button.classList.toggle('cell--win', winning.has(index));
    });
  }

  function completedLines() {
    return LINES.filter((line) => line.every((index) => card.cells[index].checked));
  }

  function hasStamps() {
    return card.cells.some((cell, index) => cell.checked && index !== FREE_INDEX);
  }

  function showHint() {
    if (!hasStamps()) {
      setStatus('Tap a square when you spot it.');
    }
  }

  // Interaction

  function toggleCell(index) {
    const before = new Set(completedLines());
    card.cells[index].checked = !card.cells[index].checked;
    navigator.vibrate?.(10);

    const hasNewLine = completedLines().some((line) => !before.has(line));
    const isBlackout = hasNewLine && card.cells.every((cell) => cell.checked);
    const isFirstBingo = hasNewLine && !isBlackout && !card.bingoShown;
    if (isFirstBingo) {
      card.bingoShown = true;
    }

    updateBoard();
    saveAndReport();

    if (isBlackout || isFirstBingo) {
      celebrate(isBlackout);
    }
  }

  function celebrate(isBlackout) {
    if (isBlackout) {
      winTitle.textContent = 'BLACKOUT! 💀';
      winDetail.textContent = 'Wow, you’re dedicated. Good job.\n\n'
        + 'Trick or treat: there is no grand prize. But if you find Ethan Arrowood and ask him nicely, maybe he’ll buy you a drink!\n\n'
        + 'Have a spooky Halloween!';
    } else {
      winTitle.textContent = 'BINGO! 👻';
      winDetail.textContent = 'Congrats! Ask a friend to buy you a drink or something.\n\n'
        + 'Now keep going and see if you can fill the board!';
    }
    winDialog.showModal();
  }

  function confirmThen(message, okLabel, onConfirm) {
    confirmMessage.textContent = message;
    confirmOk.textContent = okLabel;
    confirmDialog.returnValue = '';
    confirmDialog.onclose = () => {
      if (confirmDialog.returnValue === 'ok') {
        onConfirm();
      }
    };
    confirmDialog.showModal();
  }

  function startNewCard() {
    card = generateCard();
    buildBoard();
    if (!saveCard()) {
      setStatus('Can’t save here: a refresh will lose this card.');
    } else {
      showHint();
    }
  }

  function resetStamps() {
    card.cells.forEach((cell, index) => {
      cell.checked = index === FREE_INDEX;
    });
    delete card.bingoShown;
    updateBoard();
    if (!saveCard()) {
      setStatus('Can’t save here: a refresh will lose this card.');
    } else {
      showHint();
    }
  }

  // Save Image

  function tracePanel(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }
  }

  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    text.split(' ').forEach((word) => {
      const plainWord = word.replaceAll(SOFT_HYPHEN, '');
      const candidate = line ? `${line} ${plainWord}` : plainWord;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        return;
      }
      if (line) {
        lines.push(line);
      }
      const [start, ...rest] = word.replaceAll('-', `-${SOFT_HYPHEN}`).split(SOFT_HYPHEN);
      if (rest.length > 0 && ctx.measureText(plainWord).width > maxWidth) {
        lines.push(start.endsWith('-') ? start : `${start}-`);
        line = rest.join('');
      } else {
        line = plainWord;
      }
    });
    lines.push(line);
    return lines;
  }

  function drawCell(ctx, cell, index, x, y, size, isWinner) {
    const isFree = index === FREE_INDEX;
    const center = size / 2;

    tracePanel(ctx, x, y, size, size, 22);
    ctx.fillStyle = cell.checked && !isFree ? (isWinner ? '#23331a' : '#33190f') : '#21133a';
    ctx.fill();
    ctx.lineWidth = isWinner || isFree ? 6 : 3;
    ctx.strokeStyle = isWinner || isFree ? '#9be564' : cell.checked ? '#ff7518' : 'rgba(255, 117, 24, 0.45)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isFree) {
      ctx.font = '84px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('💀', x + center, y + center - 26);
      ctx.font = '800 38px -apple-system, Roboto, Arial, sans-serif';
      ctx.fillStyle = '#9be564';
      ctx.fillText(FREE_TEXT, x + center, y + center + 56);
      return;
    }

    if (cell.checked) {
      const tilt = [-14, 9, -8, 5, 15][index % 5];
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.translate(x + center, y + center);
      ctx.rotate((tilt * Math.PI) / 180);
      ctx.font = '124px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('🎃', 0, 6);
      ctx.restore();
    }

    ctx.save();
    ctx.font = '600 31px -apple-system, Roboto, Arial, sans-serif';
    ctx.fillStyle = cell.checked ? '#e2d8ee' : '#f6eeff';
    if (cell.checked) {
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 10;
    }
    const lines = wrapText(ctx, cell.text, size - 22);
    const lineHeight = 37;
    const firstLine = y + center - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, x + center, firstLine + lineIndex * lineHeight);
    });
    ctx.restore();
  }

  function drawCardImage() {
    const width = 1080;
    const margin = 36;
    const gap = 12;
    const top = 196;
    const cellSize = (width - margin * 2 - gap * (SIZE - 1)) / SIZE;
    const height = top + cellSize * SIZE + gap * (SIZE - 1) + margin;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#120a1f';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff7518';
    ctx.font = '104px Creepster, Impact, sans-serif';
    ctx.fillText('Spooky Bingo 👻', width / 2, 84);
    ctx.fillStyle = '#9be564';
    ctx.font = '600 32px -apple-system, Roboto, Arial, sans-serif';
    ctx.fillText('BRECKENRIDGE HALLOWEEN 2026', width / 2, 158);

    const winning = new Set(completedLines().flat());
    card.cells.forEach((cell, index) => {
      const column = index % SIZE;
      const row = Math.floor(index / SIZE);
      const x = margin + column * (cellSize + gap);
      const y = top + row * (cellSize + gap);
      drawCell(ctx, cell, index, x, y, cellSize, winning.has(index));
    });
    return canvas;
  }

  // toDataURL is synchronous on purpose: iOS Safari only allows navigator.share
  // inside the tap handler, and the async canvas.toBlob can lose that permission.
  function canvasToFile(canvas) {
    const bytes = atob(canvas.toDataURL('image/png').split(',')[1]);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      buffer[i] = bytes.charCodeAt(i);
    }
    return new File([buffer], 'spooky-bingo.png', { type: 'image/png' });
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    flashStatus('Image saved ✓');
  }

  async function saveImage() {
    let file;
    try {
      file = canvasToFile(drawCardImage());
    } catch {
      setStatus('Couldn’t make an image. Screenshot it instead!');
      return;
    }

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Spooky Bingo' });
        return;
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
      }
    }
    downloadFile(file);
  }

  // Startup

  function disableGame() {
    setStatus(`Add at least ${CELL_COUNT - 1} items to items.js to play.`);
    document.querySelectorAll('.action').forEach((button) => {
      button.disabled = true;
    });
  }

  board.addEventListener('click', (event) => {
    const button = event.target.closest('.cell');
    if (button && Number(button.dataset.index) !== FREE_INDEX) {
      toggleCell(Number(button.dataset.index));
    }
  });

  document.getElementById('new-card').addEventListener('click', () => {
    confirmThen('Start a new card? Your current one will be lost.', 'New Card', startNewCard);
  });

  document.getElementById('reset-stamps').addEventListener('click', () => {
    confirmThen('Clear all your stamps? You’ll keep this card.', 'Reset', resetStamps);
  });

  document.getElementById('save-image').addEventListener('click', saveImage);

  document.getElementById('info').addEventListener('click', () => {
    document.getElementById('about').showModal();
  });

  card = loadCard();
  if (card) {
    buildBoard();
    showHint();
  } else if (canPlay) {
    startNewCard();
  } else {
    disableGame();
  }
})();
