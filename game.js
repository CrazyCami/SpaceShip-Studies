(() => {
  const samples = {
    biology: [
      ['What is the powerhouse of the cell?', 'Mitochondria', ['Nucleus', 'Ribosome', 'Cell membrane']],
      ['What molecule carries genetic instructions?', 'DNA', ['RNA', 'Glucose', 'Protein']],
      ['What is the process plants use to make glucose?', 'Photosynthesis', ['Respiration', 'Fermentation', 'Osmosis']],
      ['Which blood cells carry oxygen?', 'Red blood cells', ['Platelets', 'White blood cells', 'Neurons']],
      ['What is the basic unit of life?', 'The cell', ['The atom', 'The tissue', 'The organ']]
    ],
    space: [
      ['Which planet is known as the Red Planet?', 'Mars', ['Venus', 'Jupiter', 'Mercury']],
      ['What is the closest star to Earth?', 'The Sun', ['Sirius', 'Proxima Centauri', 'Polaris']],
      ['What force keeps planets in orbit?', 'Gravity', ['Magnetism', 'Friction', 'Pressure']],
      ['Which planet has the most prominent rings?', 'Saturn', ['Neptune', 'Earth', 'Mars']],
      ['What is a rocky object orbiting the Sun called?', 'An asteroid', ['A comet', 'A moon', 'A nebula']]
    ],
    history: [
      ['In which year did the first Moon landing take place?', '1969', ['1959', '1975', '1981']],
      ['Which ancient civilisation built the pyramids at Giza?', 'Ancient Egyptians', ['Romans', 'Greeks', 'Persians']],
      ['Who was the first person to sail around the world?', 'Ferdinand Magellan', ['Christopher Columbus', 'James Cook', 'Marco Polo']],
      ['Which city was divided by a wall from 1961 to 1989?', 'Berlin', ['Vienna', 'Prague', 'Warsaw']],
      ['What was the name of the ship that brought the Pilgrims to America in 1620?', 'The Mayflower', ['The Endeavour', 'The Beagle', 'The Victory']]
    ]
  };
  const $ = s => document.querySelector(s);
  const arena = $('#arena'), ship = $('#ship'), laserLayer = $('#laserLayer');
  let questions = samples.biology.map(q => [...q]), index = 0, score = 0, streak = 0, lives = 3;
  let running = false, x = 50, targets = [], spawnTimer, elapsed = 0, startTime = 0, lastSpawn = 0;
  const rand = n => Math.floor(Math.random() * n);
  function renderQuestion() {
    const q = questions[index % questions.length];
    $('#question').textContent = q[0];
    $('#qCount').textContent = `${String(index % questions.length + 1).padStart(2,'0')} / ${String(questions.length).padStart(2,'0')}`;
  }
  function loadSample(name) {
    questions = samples[name].map(q => [...q]); index = 0; clearTargets(); renderQuestion();
    document.querySelectorAll('.sample-chip').forEach(b => b.classList.toggle('active', b.dataset.sample === name));
    $('#fileStatus').textContent = `Loaded ${name} sample flight · ${questions.length} questions ready.`;
    stopGame(); $('#gameOver').style.display = 'none'; $('#countdown').style.display = 'flex';
  }
  function makeQuestions(text) {
    const lines = text.split(/\n+/).map(s => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(s => s.length > 20);
    const built = [];
    for (const line of lines) {
      const explicit = line.match(/^(?:q(?:uestion)?\s*[:|-]\s*)(.+?)\s*(?:\?|\s+\|\s+|\s+::\s+)\s*(?:a(?:nswer)?\s*[:|-]\s*)?(.+)$/i);
      if (explicit) { built.push([explicit[1].replace(/[?]$/, '?'), explicit[2].trim(), []]); continue; }
      const def = line.match(/^(.{2,70}?)\s+(?:is|are|means|refers to|was|were)\s+(.{5,})[.]?$/i);
      if (def) {
        const verb = line.match(/\s+(is|are|means|refers to|was|were)\s+/i)[1].toLowerCase();
        const subject = def[1].trim(), description = def[2].replace(/[.]$/, '').trim();
        built.push([`Which term ${verb === 'are' || verb === 'were' ? 'describes' : 'means'}: ${description}?`, subject, []]); continue;
      }
      const words = line.match(/[A-Za-z][A-Za-z'-]{4,}/g);
      if (words?.length >= 4) {
        const chosen = words.slice().sort((a,b) => b.length - a.length)[0];
        if (chosen.length < line.length * .75) built.push([`Complete the statement: ${line.replace(new RegExp(`\\b${chosen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '_____')}`, chosen, []]);
      }
    }
    const unique = [...new Map(built.map(q => [q[0].toLowerCase(), q])).values()];
    if (unique.length < 2) return null;
    return unique.map((q, i) => {
      const distractors = unique.filter((_,j) => j !== i).map(other => other[1]).sort(() => Math.random() - .5).slice(0,3);
      while (distractors.length < 3) distractors.push(['None of the above', 'Not listed here', 'Another concept'][distractors.length]);
      return [q[0], q[1], distractors];
    });
  }
  async function readFiles(files) {
    const chosen = [...files]; if (!chosen.length) return;
    try {
      const content = await Promise.all(chosen.map(f => f.text()));
      const generated = makeQuestions(content.join('\n'));
      if (!generated) { $('#fileStatus').textContent = 'Could not find enough study points. Try notes with a few complete sentences.'; return; }
      questions = generated; index = 0; renderQuestion(); stopGame(); clearTargets();
      $('#countdown').style.display = 'flex'; $('#gameOver').style.display = 'none';
      document.querySelectorAll('.sample-chip').forEach(b => b.classList.remove('active'));
      $('#fileStatus').textContent = `${chosen.length} file${chosen.length === 1 ? '' : 's'} loaded · ${generated.length} questions generated in your browser.`;
    } catch { $('#fileStatus').textContent = 'These files could not be read. Please try a plain text, Markdown, or CSV file.'; }
  }
  function clearTargets() { targets.forEach(t => t.el.remove()); targets = []; }
  function optionsForQuestion() {
    const [question, answer, distractors] = questions[index % questions.length];
    const plausible = [...distractors].sort(() => Math.random() - .5).slice(0, 2);
    while (plausible.length < 2) plausible.push(['None of the above', 'Another answer'][plausible.length]);
    return [answer, ...plausible].sort(() => Math.random() - .5);
  }
  function spawn() {
    if (!running || targets.length >= 5) return;
    const opts = optionsForQuestion(), count = Math.min(opts.length, 3 + Math.floor(elapsed / 20));
    opts.slice(0, count).forEach((label, i) => {
      const el = document.createElement('button'); el.className = 'meteor'; el.textContent = label;
      const left = 11 + i * (78 / Math.max(count - 1, 1)) + (rand(13) - 6);
      const target = {el, y: -70 - rand(38), left, correct: label === questions[index % questions.length][1]};
      el.style.left = `${Math.max(5, Math.min(85, left))}%`; el.style.top = `${target.y}px`;
      el.addEventListener('click', () => shoot(target, true)); arena.appendChild(el); targets.push(target);
    });
    lastSpawn = performance.now();
  }
  function shoot(target, clicked = false) {
    if (!running || !targets.includes(target)) return;
    if (!clicked) {
      const candidates = targets.filter(t => t.y < 255).sort((a,b) => Math.abs(a.left-x)-Math.abs(b.left-x));
      target = candidates[0]; if (!target) return;
    }
    const beam = document.createElement('i'); beam.className = 'laser'; beam.style.left = `${x}%`; beam.style.bottom = '88px'; laserLayer.appendChild(beam); setTimeout(() => beam.remove(), 240);
    target.el.classList.add(target.correct ? 'correct' : 'wrong');
    if (target.correct) {
      score += 100 + streak * 20; streak++; $('#score').textContent = String(score).padStart(4,'0'); $('#streak').textContent = `× ${String(streak).padStart(2,'0')}`;
      flash('DIRECT HIT!', '#80f4d1'); index++; renderQuestion();
      setTimeout(() => { target.el.remove(); targets = targets.filter(t => t !== target); clearTargets(); }, 370);
      $('#wave').textContent = String(1 + Math.floor(elapsed / 20)).padStart(2,'0');
    } else {
      streak = 0; $('#streak').textContent = '× 00'; lives--; $('#lives').textContent = '◆ '.repeat(lives).trim() || '—';
      flash('WRONG TARGET', '#ff7d91'); setTimeout(() => { target.el.remove(); targets = targets.filter(t => t !== target); }, 350);
      if (lives <= 0) endGame();
    }
  }
  function flash(message, color) { const f = $('#feedback'); f.textContent = message; f.style.color = color; f.classList.remove('show'); void f.offsetWidth; f.classList.add('show'); }
  function tick(now) {
    if (!running) return;
    elapsed = (now - startTime) / 1000;
    const speed = Math.min(3.5, 1 + elapsed / 32);
    $('#speedMeter').style.width = `${14 + (speed - 1) / 2.5 * 86}%`; $('#speedText').textContent = `${speed.toFixed(1)}×`;
    targets.forEach(t => { t.y += .24 * speed; t.el.style.top = `${t.y}px`; if (t.y > 275) { t.el.remove(); targets = targets.filter(o => o !== t); } });
    if (now - lastSpawn > Math.max(2300 - elapsed * 20, 800)) spawn();
    requestAnimationFrame(tick);
  }
  function startGame() {
    stopGame(); running = true; score = 0; streak = 0; lives = 3; elapsed = 0; x = 50; startTime = performance.now(); lastSpawn = 0;
    $('#score').textContent = '0000'; $('#streak').textContent = '× 00'; $('#lives').textContent = '◆ ◆ ◆'; $('#speedMeter').style.width = '14%'; $('#speedText').textContent = '1.0×'; $('#wave').textContent = '01';
    ship.style.left = `${x}%`; $('#countdown').style.display = 'none'; $('#gameOver').style.display = 'none'; $('#hint').style.opacity = '0';
    spawn(); requestAnimationFrame(tick);
  }
  function stopGame() { running = false; clearTimeout(spawnTimer); }
  function endGame() { stopGame(); $('#finalScore').textContent = String(score).padStart(4,'0'); $('#gameOver').style.display = 'flex'; }
  document.addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft') x = Math.max(6, x - 4);
    if (e.key === 'ArrowRight') x = Math.min(94, x + 4);
    if (e.key === ' ' && running) shoot(null);
    ship.style.left = `${x}%`;
  });
  $('#startGame').addEventListener('click', startGame); $('#replay').addEventListener('click', startGame);
  $('#prevQ').addEventListener('click', () => { index = (index - 1 + questions.length) % questions.length; renderQuestion(); clearTargets(); });
  $('#nextQ').addEventListener('click', () => { index++; renderQuestion(); clearTargets(); });
  document.querySelectorAll('.sample-chip').forEach(b => b.addEventListener('click', () => loadSample(b.dataset.sample)));
  const input = $('#fileInput'), drop = $('#dropzone');
  input.addEventListener('change', () => readFiles(input.files));
  drop.addEventListener('click', () => input.click()); $('#uploadTop').addEventListener('click', () => { $('#uploadCard').scrollIntoView({behavior:'smooth',block:'center'}); input.click(); });
  ['dragenter','dragover'].forEach(event => drop.addEventListener(event, e => { e.preventDefault(); drop.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(event => drop.addEventListener(event, e => { e.preventDefault(); drop.classList.remove('dragging'); }));
  drop.addEventListener('drop', e => readFiles(e.dataTransfer.files));
  loadSample('biology');
})();
