// Tests for "Move to a New Device". Run with: node --test tests/*.test.mjs
//
// The game is one HTML file, so the transfer logic is read straight out of
// index.html (between its save-transfer markers) and run here with a
// Map-backed storage. The level curve, fact list, achievements and stickers
// are taken from the game too, so the preview cannot drift from the game.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

function markedBlock(name) {
  const begin = html.indexOf(`/* ${name}:begin */`);
  const end = html.indexOf(`/* ${name}:end */`);
  assert.ok(begin >= 0 && end > begin, `missing ${name} markers`);
  return html.slice(begin, end);
}

// Returns the source from `start` to its matching closing bracket, skipping
// over string literals and comments.
function balancedFrom(start, open, close) {
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (ch === '\'' || ch === '"' || ch === '`') {
      for (i++; i < html.length && html[i] !== ch; i++) if (html[i] === '\\') i++;
      continue;
    }
    if (ch === '/' && html[i + 1] === '/') {
      i = html.indexOf('\n', i);
      continue;
    }
    if (ch === '/' && html[i + 1] === '*') {
      i = html.indexOf('*/', i + 2) + 1;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced');
}

function gameFunction(name) {
  const at = html.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `missing function ${name}`);
  return html.slice(at, html.indexOf('{', at)) + balancedFrom(html.indexOf('{', at), '{', '}');
}

function gameArray(name) {
  const at = html.indexOf(`const ${name} = [`);
  assert.ok(at >= 0, `missing ${name}`);
  return new Function(`return ${balancedFrom(html.indexOf('[', at), '[', ']')};`)();
}

const T = new Function(`${markedBlock('save-transfer')}\nreturn SaveTransfer;`)();
const levelFromXP = new Function(`${gameFunction('xpForLevel')}\n${gameFunction('levelFromXP')}\nreturn levelFromXP;`)();
const generateMathFacts = new Function(`${gameFunction('generateMathFacts')}\nreturn generateMathFacts;`)();
const ACHIEVEMENTS = gameArray('ACHIEVEMENTS');
const STICKERS = gameArray('STICKERS');
const FACTS = generateMathFacts();

const AVATAR_NAMES = { mango: 'Mango', panda: 'Taio', hippo: 'Hippy', lion: 'Shasha', unicorn: 'Uncorn' };
const catalog = {
  levelFromXP,
  avatarName: id => AVATAR_NAMES[id] || 'Mango',
  achievementIds: ACHIEVEMENTS.map(a => a.id),
  stickerTotal: STICKERS.length,
  factIds: new Set(FACTS.map(f => f.id)),
};

const NOW = Date.parse('2026-09-23T19:41:07.000Z');
const { TRANSFER_KEYS, NOT_TRANSFERRED, TRANSFER_BACKUP_KEY, MESSAGES, BLOCK_BEGIN, BLOCK_END, MAX_TRANSFER_CHARS } = T;

function makeStorage(entries = {}, { failSetOn = null, failRemoveOn = null } = {}) {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem(key, value) {
      if (failSetOn && failSetOn(key)) throw new Error('QuotaExceededError');
      map.set(key, String(value));
    },
    removeItem(key) {
      if (failRemoveOn && failRemoveOn(key)) throw new Error('blocked');
      map.delete(key);
    },
  };
}

// Every fact the way _flushFactState writes it, with a few answered.
function factState(practiced = {}) {
  const state = {};
  for (const f of FACTS) {
    state[f.id] = { ef: 2.5, interval: 1, repetitions: 0, nextReview: NOW, lastReview: null };
  }
  Object.assign(state, practiced);
  return JSON.stringify(state);
}

// A child who has really played: every transferred key, shaped the way the
// game writes it.
function playedSave(overrides = {}) {
  const [a1, a2] = ACHIEVEMENTS.map(a => a.id);
  const [s1, s2] = STICKERS.map(s => s.id);
  return {
    mathblaster_version: '4',
    mathblaster_xp: '1234',
    mathblaster_coins: '587',
    mathblaster_purchased_costumes: '["hat-pirate","acc-sunglasses"]',
    mathblaster_costumes: '{"hat":"hat-pirate","outfit":"outfit-none","accessory":"acc-sunglasses"}',
    mathblaster_avatar: '"panda"',
    mathblaster_dances: '["dance-wiggle","dance-spin"]',
    mathblaster_equippedDance: '"dance-spin"',
    mathblaster_trails: '["trail-none","trail-hearts"]',
    mathblaster_equippedTrail: '"trail-hearts"',
    mathblaster_pets: '["pet-none","pet-bee"]',
    mathblaster_equippedPet: '"pet-bee"',
    mathblaster_stickers: JSON.stringify([s1, s2]),
    mathblaster_box_progress: '{"correctSinceLastBox":12,"nextBoxThreshold":63}',
    mathblaster_achievements: JSON.stringify([a1, a2, 'retired_badge']),
    mathblaster_stats: '{"bossesDefeated":7,"mysteryBoxesOpened":2,"uniqueBossesDefeated":{"boss-tiki":true},"scenesUnlocked":["beach"],"themesUnlocked":["tropical","rain"]}',
    mathblaster_facts_sm2: factState({
      mul_3_4: { ef: 2.36, interval: 6, repetitions: 2, nextReview: NOW, lastReview: NOW - 1000, avgMs: 2345, attempts: 4, correctCount: 3 },
      add_2_5: { ef: 2.5, interval: 1, repetitions: 0, nextReview: NOW, lastReview: NOW - 5000, avgMs: 4100, attempts: 1, correctCount: 0 },
      sub_9_4: { ef: 2.6, interval: 1, repetitions: 1, nextReview: NOW, lastReview: NOW - 9000 },
      not_a_fact: { ef: 2.5, interval: 1, repetitions: 0, nextReview: NOW, lastReview: NOW, attempts: 50 },
    }),
    mathblaster_tiers: '{"add":2,"subtract":1,"multiply":3,"divide":1}',
    mathblaster_tier_tracking: '{"add":{"correct":7,"total":9}}',
    mathblaster_op_accuracy: '{"add":[true,false,true]}',
    mathblaster_last_session_ts: String(NOW - 3600000),
    mathblaster_selected_ops: '["add","multiply"]',
    mathblaster_theme: '"rain"',
    mathblaster_scene: '"sunset"',
    mathblaster_sound: 'false',
    mathblaster_welcome_seen: 'true',
    ...overrides,
  };
}

// What a brand-new device holds after opening the game, tapping Play and
// switching apps once.
function freshDevice() {
  return {
    mathblaster_version: '4',
    mathblaster_xp: '0',
    mathblaster_coins: '0',
    mathblaster_purchased_costumes: '[]',
    mathblaster_costumes: '{"hat":"hat-none","outfit":"outfit-none","accessory":"acc-none"}',
    mathblaster_last_session_ts: String(NOW),
    mathblaster_welcome_seen: 'true',
    mathblaster_facts_sm2: factState(),
    mathblaster_stats: '{"bossesDefeated":0,"mysteryBoxesOpened":0,"uniqueBossesDefeated":{},"scenesUnlocked":["beach"],"themesUnlocked":["tropical"]}',
    mathblaster_stickers: '[]',
    mathblaster_box_progress: '{"correctSinceLastBox":0,"nextBoxThreshold":57}',
  };
}

function exportFrom(entries) {
  return T.buildTransferCode(makeStorage(entries), { now: NOW, catalog });
}

function encodeEnvelope(envelope, { frame = true } = {}) {
  const b64 = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
  return frame ? `${BLOCK_BEGIN}\n${b64}\n${BLOCK_END}\n` : b64;
}

function envelopeFor(keys, overrides = {}) {
  return {
    app: 'mokulua-math',
    kind: 'save-transfer',
    format: 1,
    exportedAt: new Date(NOW).toISOString(),
    check: T.fnv1a32(JSON.stringify(keys)),
    keys,
    ...overrides,
  };
}

function codeWith(overrides) {
  return encodeEnvelope(envelopeFor(playedSave(overrides)));
}

// ---------------------------------------------------------------------------

test('the fact list and catalogs read from the game look right', () => {
  assert.equal(FACTS.length, 1152);
  assert.equal(ACHIEVEMENTS.length, 32);
  assert.equal(STICKERS.length, 80);
  assert.equal(levelFromXP(0), 1);
  assert.equal(levelFromXP(900), 10);
  assert.equal(levelFromXP(3975), 25);
});

test('a played save round trips byte-exact for every key', () => {
  const save = playedSave();
  assert.deepEqual(Object.keys(save).sort(), [...TRANSFER_KEYS].sort(), 'fixture covers every key');
  const parsed = T.parseTransferCode(exportFrom(save).text);
  assert.equal(parsed.ok, true, parsed.message);
  assert.deepEqual(parsed.keys, save);
  const target = makeStorage();
  assert.equal(T.applyTransfer(target, parsed.keys, { now: NOW }).ok, true);
  for (const key of TRANSFER_KEYS) assert.equal(target.getItem(key), save[key], key);
});

test('odd characters and large values survive exactly', () => {
  const odd = 'pañda 🐼 "quoted" back\\slash\r\nline \ud800 end';
  const big = 'x'.repeat(50000);
  const save = playedSave({
    mathblaster_avatar: JSON.stringify(odd),
    mathblaster_stickers: JSON.stringify([odd, big]),
  });
  const parsed = T.parseTransferCode(exportFrom(save).text);
  assert.equal(parsed.ok, true, parsed.message);
  assert.equal(parsed.keys.mathblaster_avatar, save.mathblaster_avatar);
  assert.equal(parsed.keys.mathblaster_stickers, save.mathblaster_stickers);
});

test('replace rule: file keys set, missing keys removed, other apps untouched', () => {
  const save = playedSave();
  delete save.mathblaster_theme;
  delete save.mathblaster_pets;
  const target = makeStorage({
    ...playedSave({ mathblaster_avatar: '"hippo"' }),
    cosmicMathProgress: '{"totalStars":9}',
    plink_state: 'keep me',
  });
  const parsed = T.parseTransferCode(exportFrom(save).text);
  assert.equal(T.applyTransfer(target, parsed.keys, { now: NOW }).ok, true);
  assert.equal(target.getItem('mathblaster_theme'), null);
  assert.equal(target.getItem('mathblaster_pets'), null);
  assert.equal(target.getItem('mathblaster_avatar'), '"panda"');
  assert.equal(target.getItem('cosmicMathProgress'), '{"totalStars":9}');
  assert.equal(target.getItem('plink_state'), 'keep me');
});

test('parsing tolerates wrapping, CRLF, surrounding text, URL-safe letters and bare codes', () => {
  const { text } = exportFrom(playedSave());
  const block = text.slice(text.indexOf(BLOCK_BEGIN));
  const bare = block.slice(BLOCK_BEGIN.length, block.indexOf(BLOCK_END)).replace(/\s+/g, '');
  const variants = [
    text.replace(/\n/g, '\r\n'),
    `Hey, here is the save!\n\n${block}\nSent from my iPad`,
    `${BLOCK_BEGIN}\n${bare.match(/.{1,40}/g).join('\n')}\n${BLOCK_END}`,
    bare,
    bare.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    `  ${bare.match(/.{1,60}/g).join(' \n ')}  `,
  ];
  for (const v of variants) {
    const parsed = T.parseTransferCode(v);
    assert.equal(parsed.ok, true, parsed.message);
    assert.deepEqual(parsed.keys, playedSave());
  }
});

test('every bad input is refused with its exact message', () => {
  const save = playedSave();
  const withoutVersion = { ...save };
  delete withoutVersion.mathblaster_version;
  const withoutXp = { ...save };
  delete withoutXp.mathblaster_xp;
  const cases = [
    ['', 'empty'],
    ['   \n ', 'empty'],
    [null, 'empty'],
    ['a'.repeat(MAX_TRANSFER_CHARS + 1), 'tooBig'],
    [`${BLOCK_BEGIN}\nabc`, 'damaged'],
    ['hello there, how are you?', 'notASave'],
    [`${BLOCK_BEGIN}\n!!!!\n${BLOCK_END}`, 'damaged'],
    [Buffer.from('not json at all').toString('base64'), 'notASave'],
    [`${BLOCK_BEGIN}\n${Buffer.from('not json').toString('base64')}\n${BLOCK_END}`, 'damaged'],
    [encodeEnvelope(envelopeFor(save, { app: 'cosmic-home' })), 'notASave'],
    [encodeEnvelope(envelopeFor(save, { kind: 'transfer-backup' })), 'notASave'],
    [encodeEnvelope(['a']), 'notASave'],
    [encodeEnvelope(envelopeFor(save, { format: 0 })), 'damaged'],
    [encodeEnvelope(envelopeFor(save, { format: 1.5 })), 'damaged'],
    [encodeEnvelope(envelopeFor(save, { format: 2 })), 'tooNew'],
    [encodeEnvelope(envelopeFor(save, { keys: [] })), 'damaged'],
    [encodeEnvelope(envelopeFor(save, { check: '00000000' })), 'damaged'],
    [encodeEnvelope(envelopeFor({ ...save, mathblaster_xp: 1234 })), 'damaged'],
    [encodeEnvelope(envelopeFor(withoutVersion)), 'noProgress'],
    [encodeEnvelope(envelopeFor(withoutXp)), 'noProgress'],
    [encodeEnvelope(envelopeFor({})), 'noProgress'],
    [codeWith({ mathblaster_version: '3' }), 'damaged'],
    [codeWith({ mathblaster_version: '"4"' }), 'damaged'],
    [codeWith({ mathblaster_xp: '"1234"' }), 'damaged'],
    [codeWith({ mathblaster_xp: 'NaN' }), 'damaged'],
    [codeWith({ mathblaster_coins: 'null' }), 'damaged'],
    [codeWith({ mathblaster_costumes: 'null' }), 'damaged'],
    [codeWith({ mathblaster_purchased_costumes: '{}' }), 'damaged'],
    [codeWith({ mathblaster_pets: '"pet-bee"' }), 'damaged'],
    [codeWith({ mathblaster_dances: '[1,2]' }), 'damaged'],
    [codeWith({ mathblaster_achievements: 'null' }), 'damaged'],
    [codeWith({ mathblaster_stats: '{"themesUnlocked":null}' }), 'damaged'],
    [codeWith({ mathblaster_stats: '[]' }), 'damaged'],
    [codeWith({ mathblaster_facts_sm2: '{"mul_3_4":null}' }), 'damaged'],
    [codeWith({ mathblaster_facts_sm2: '{"mul_3_4":{"answer":99}}' }), 'damaged'],
    [codeWith({ mathblaster_tiers: '5' }), 'damaged'],
    [codeWith({ mathblaster_sound: '"off"' }), 'damaged'],
    [codeWith({ mathblaster_theme: 'null' }), 'damaged'],
    [codeWith({ mathblaster_xp: '{not json' }), 'damaged'],
    [codeWith({ mathblaster_version: 'four' }), 'damaged'],
    [codeWith({ mathblaster_stats: '{"scenesUnlocked":null}' }), 'damaged'],
    [codeWith({ mathblaster_stats: '{"uniqueBossesDefeated":[]}' }), 'damaged'],
    [codeWith({ mathblaster_facts_sm2: '{"mul_3_4":{"ef":2.5,"num1":9}}' }), 'damaged'],
  ];
  for (const [input, error] of cases) {
    const parsed = T.parseTransferCode(input);
    assert.equal(parsed.ok, false, `accepted: ${String(input).slice(0, 80)}`);
    assert.equal(parsed.error, error, `for: ${String(input).slice(0, 80)}`);
    assert.equal(parsed.message, MESSAGES[error]);
  }
});

test('a Cosmic Home save file is refused as not a Mokulua Math save', () => {
  const keys = { cosmicMathProgress: '{"totalStars":3}' };
  const env = { app: 'cosmic-home', kind: 'save-transfer', format: 1, exportedAt: new Date(NOW).toISOString(), check: T.fnv1a32(JSON.stringify(keys)), keys };
  const text = `Cosmic Home save file\n\n[COSMIC-HOME-SAVE]\n${Buffer.from(JSON.stringify(env)).toString('base64')}\n[END COSMIC-HOME-SAVE]\n`;
  assert.equal(T.parseTransferCode(text).error, 'notASave');
});

test('keys that are not ours are ignored and never written', () => {
  const keys = {
    ...playedSave(),
    cosmicMathProgress: '{"totalStars":999}',
    [TRANSFER_BACKUP_KEY]: '{"app":"mokulua-math"}',
    mathblaster_adaptive: '{}',
  };
  const parsed = T.parseTransferCode(encodeEnvelope(envelopeFor(keys)));
  assert.equal(parsed.ok, true, parsed.message);
  assert.deepEqual(parsed.ignoredKeys.sort(), ['cosmicMathProgress', 'mathblaster_adaptive', TRANSFER_BACKUP_KEY].sort());
  const target = makeStorage();
  T.applyTransfer(target, parsed.keys, { now: NOW });
  assert.equal(target.getItem('cosmicMathProgress'), null);
  assert.equal(target.getItem('mathblaster_adaptive'), null);
});

test('import keeps an Undo copy, and Undo swaps so nothing is ever thrown away', () => {
  const before = { ...freshDevice(), mathblaster_avatar: '"lion"', other_app: 'x' };
  const target = makeStorage(before);
  const parsed = T.parseTransferCode(exportFrom(playedSave()).text);
  assert.equal(T.applyTransfer(target, parsed.keys, { now: NOW }).ok, true);
  const backup = T.readBackup(target);
  assert.equal(backup.savedAt, NOW);
  assert.equal(backup.reason, 'import');
  assert.equal(backup.keys.mathblaster_avatar, '"lion"');
  const moved = Object.fromEntries([...target.map].filter(([k]) => k !== TRANSFER_BACKUP_KEY));

  assert.equal(T.undoLastImport(target, { now: NOW + 1000 }).ok, true);
  const afterUndo = Object.fromEntries([...target.map].filter(([k]) => k !== TRANSFER_BACKUP_KEY));
  assert.deepEqual(afterUndo, before);
  const setAside = T.readBackup(target);
  assert.equal(setAside.reason, 'undo');
  assert.equal(setAside.savedAt, NOW + 1000);
  for (const key of TRANSFER_KEYS) assert.equal(setAside.keys[key] ?? null, moved[key] ?? null, key);

  // Tapping it again brings the moved progress back, and Undo is offered again.
  assert.equal(T.undoLastImport(target, { now: NOW + 2000 }).ok, true);
  const afterRedo = Object.fromEntries([...target.map].filter(([k]) => k !== TRANSFER_BACKUP_KEY));
  assert.deepEqual(afterRedo, moved);
  assert.equal(T.readBackup(target).reason, 'import');
  assert.equal(T.readBackup(target).keys.mathblaster_avatar, '"lion"');
});

test('an Undo copy without a reason is read as undoing an import', () => {
  const raw = JSON.stringify({ app: 'mokulua-math', kind: 'transfer-backup', format: 1, savedAt: new Date(NOW).toISOString(), keys: { mathblaster_xp: '5' } });
  assert.equal(T.readBackup(makeStorage({ [TRANSFER_BACKUP_KEY]: raw })).reason, 'import');
});

test('a broken Undo copy is treated as no Undo', () => {
  for (const raw of ['nope', '{}', '[]', JSON.stringify({ app: 'mokulua-math', kind: 'transfer-backup', keys: { mathblaster_xp: 5 } }),
    JSON.stringify({ app: 'mokulua-math', kind: 'transfer-backup', keys: { cosmicMathProgress: '{}' } }),
    JSON.stringify({ app: 'cosmic-home', kind: 'transfer-backup', keys: {} })]) {
    const s = makeStorage({ [TRANSFER_BACKUP_KEY]: raw });
    assert.equal(T.readBackup(s), null, raw);
    assert.equal(T.undoLastImport(s).error, 'noBackup');
  }
});

test('a failed write mid-import puts every key back, including the old Undo copy', () => {
  const oldBackup = JSON.stringify({ app: 'mokulua-math', kind: 'transfer-backup', format: 1, savedAt: new Date(NOW - 1e6).toISOString(), keys: { mathblaster_xp: '5' } });
  const before = { ...freshDevice(), [TRANSFER_BACKUP_KEY]: oldBackup };
  const target = makeStorage(before, { failSetOn: key => key === 'mathblaster_facts_sm2' });
  const parsed = T.parseTransferCode(exportFrom(playedSave()).text);
  const result = T.applyTransfer(target, parsed.keys, { now: NOW });
  assert.equal(result.error, 'storageFailed');
  assert.equal(result.message, MESSAGES.storageFailed);
  assert.deepEqual(Object.fromEntries(target.map), before);
});

test('a failed Undo copy write changes nothing', () => {
  const before = freshDevice();
  const target = makeStorage(before, { failSetOn: key => key === TRANSFER_BACKUP_KEY });
  const parsed = T.parseTransferCode(exportFrom(playedSave()).text);
  assert.equal(T.applyTransfer(target, parsed.keys, { now: NOW }).error, 'storageFailed');
  assert.deepEqual(Object.fromEntries(target.map), before);
});

test('a failed import on a nearly full device leaves every key and the old Undo copy as they were', () => {
  const oldBackup = JSON.stringify({ app: 'mokulua-math', kind: 'transfer-backup', format: 1, savedAt: new Date(NOW - 1e6).toISOString(), keys: freshDevice() });
  const before = { ...playedSave({ mathblaster_avatar: '"hippo"' }), [TRANSFER_BACKUP_KEY]: oldBackup };
  const QUOTA = [...Object.entries(before)].reduce((n, [k, v]) => n + k.length + v.length, 0) + 2000;
  const map = new Map(Object.entries(before));
  const used = () => [...map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  const target = {
    map,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem(key, value) {
      const prev = map.has(key) ? key.length + map.get(key).length : 0;
      if (used() - prev + key.length + String(value).length > QUOTA) throw new Error('QuotaExceededError');
      map.set(key, String(value));
    },
    removeItem: key => map.delete(key),
  };
  // The incoming save is bigger than what is here, so the Undo copy fits but
  // the new values do not.
  const bigger = playedSave({ mathblaster_stickers: JSON.stringify(['x'.repeat(20000)]) });
  const parsed = T.parseTransferCode(exportFrom(bigger).text);
  assert.equal(T.applyTransfer(target, parsed.keys, { now: NOW }).error, 'storageFailed');
  assert.deepEqual(Object.fromEntries(map), before);
});

test('export only reads', () => {
  const save = playedSave();
  const locked = makeStorage(save, { failSetOn: () => true, failRemoveOn: () => true });
  const { text } = T.buildTransferCode(locked, { now: NOW, catalog });
  assert.ok(text.includes(BLOCK_BEGIN));
  assert.deepEqual(Object.fromEntries(locked.map), save);
});

test('sameSaves spots a save that is already here', () => {
  const save = playedSave();
  assert.equal(T.sameSaves(save, makeStorage(save)), true);
  assert.equal(T.sameSaves(save, makeStorage({ ...save, other_app: 'x' })), true);
  assert.equal(T.sameSaves(save, makeStorage({ ...save, mathblaster_coins: '588' })), false);
  assert.equal(T.sameSaves(save, makeStorage({ ...save, mathblaster_last_session_ts: String(NOW + 5) })), true);
  const fewer = { ...save };
  delete fewer.mathblaster_theme;
  assert.equal(T.sameSaves(fewer, makeStorage(save)), false);
  assert.equal(T.sameSaves(save, makeStorage(fewer)), false);
});

test('the preview reads the save the way the game shows it', () => {
  const s = T.describeSave(playedSave(), catalog);
  assert.equal(s.level, levelFromXP(1234));
  assert.equal(s.coins, 587);
  assert.equal(s.character, 'Taio');
  assert.equal(s.avatarId, 'panda');
  // Answered facts and older saves with only a review date count; the unknown
  // fact id does not.
  assert.equal(s.factsPracticed, 3);
  assert.equal(s.factsTotal, 1152);
  assert.equal(s.answers, 5);
  assert.equal(s.achievements, 2, 'retired achievement ids are not counted');
  assert.equal(s.achievementsTotal, 32);
  assert.equal(s.stickers, 2);
  assert.equal(s.stickersTotal, 80);
  assert.equal(s.isEmpty, false);

  const fresh = T.describeSave(freshDevice(), catalog);
  assert.equal(fresh.isEmpty, true);
  assert.equal(fresh.character, 'Mango');
  assert.equal(fresh.level, 1);

  // Picking a character alone is not progress.
  assert.equal(T.describeSave({ ...freshDevice(), mathblaster_avatar: '"unicorn"' }, catalog).isEmpty, true);
  assert.equal(T.describeSave({}, catalog).isEmpty, true);
  // A child who has only answered wrong still has progress to keep.
  const wrongOnly = { ...freshDevice(), mathblaster_facts_sm2: factState({ add_1_1: { ef: 2.3, interval: 1, repetitions: 0, nextReview: NOW, lastReview: NOW, attempts: 1, correctCount: 0 } }) };
  assert.equal(T.describeSave(wrongOnly, catalog).isEmpty, false);
  // Commutative credit and re-entry decay change repetitions and intervals on
  // unanswered facts; those are not practice.
  const credited = { ...freshDevice(), mathblaster_facts_sm2: factState({ mul_4_3: { ef: 2.6, interval: 6, repetitions: 2, nextReview: NOW, lastReview: null } }) };
  assert.equal(T.describeSave(credited, catalog).factsPracticed, 0);
  // Unreadable values fall back to nothing rather than throwing.
  assert.equal(T.describeSave({ mathblaster_xp: '{oops', mathblaster_facts_sm2: '[]' }, catalog).isEmpty, true);
});

test('more progress compares things that keep growing, and never counts spending', () => {
  const base = T.describeSave(playedSave(), catalog);
  const empty = T.describeSave(freshDevice(), catalog);
  assert.equal(T.hasMoreProgress(base, empty), true);
  assert.equal(T.hasMoreProgress(empty, base), false);
  assert.equal(T.hasMoreProgress(empty, empty), false);
  const moreXp = T.describeSave(playedSave({ mathblaster_xp: '1300' }), catalog);
  assert.equal(T.hasMoreProgress(moreXp, base), true);
  const spent = T.describeSave(playedSave({ mathblaster_coins: '12' }), catalog);
  assert.equal(T.hasMoreProgress(base, spent), false, 'fewer coins after shopping is not less progress');
  assert.equal(T.hasMoreProgress(spent, base), false);
});

test('file name and header show the character, level and date, never storage details', () => {
  const { text, fileName, summary } = exportFrom(playedSave());
  const localDate = (() => {
    const d = new Date(NOW);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  assert.equal(fileName, `Mokulua Math save - Taio - Level ${summary.level} - ${localDate}.txt`);
  const header = text.slice(0, text.indexOf(BLOCK_BEGIN));
  assert.match(header, /^Mokulua Math save file\n/);
  assert.match(header, /Character: Taio/);
  assert.match(header, new RegExp(`Level: ${summary.level}`));
  assert.match(header, /Move to a New Device, then Receive progress/);
  assert.ok(!/mathblaster/i.test(header));
  assert.equal(T.transferFileName({ ...summary, character: 'A/B:C*D?"E<F>G|H\\' }, NOW), `Mokulua Math save - ABCDEFGH - Level ${summary.level} - ${localDate}.txt`);
});

test('every storage key the game uses is either moved or knowingly left behind', () => {
  const used = new Set();
  for (const m of html.matchAll(/\b(?:store|load)\(\s*['"`]([A-Za-z0-9_]+)['"`]/g)) used.add(`mathblaster_${m[1]}`);
  for (const m of html.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*[,)]/g)) used.add(m[1]);
  const outside = html.slice(0, html.indexOf('/* save-transfer:begin */')) + html.slice(html.indexOf('/* save-transfer:end */'));
  for (const m of outside.matchAll(/['"`](mathblaster_[A-Za-z0-9_]+)['"`]/g)) used.add(m[1]);
  assert.ok(used.size >= 26);
  const known = new Set([...TRANSFER_KEYS, ...NOT_TRANSFERRED, TRANSFER_BACKUP_KEY]);
  for (const key of used) assert.ok(known.has(key), `${key} is neither moved nor left behind on purpose`);
  for (const key of TRANSFER_KEYS) assert.ok(used.has(key), `${key} is moved but the game never uses it`);
});

test('saving is frozen before a move writes, so old progress cannot land on top', () => {
  assert.match(gameFunction('store'), /^function store\(key, val\) \{\s*if \(savesFrozen\) return;/);
  const commit = gameFunction('commitTransfer');
  const freeze = commit.indexOf('savesFrozen = true');
  assert.ok(freeze > 0 && freeze < commit.indexOf('action()'), 'freeze comes before the write');
  assert.ok(commit.indexOf('location.reload()') > commit.indexOf('action()'));
});

test('no em dashes in the transfer code or its copy', () => {
  for (const name of ['save-transfer', 'transfer-sheet']) {
    assert.ok(!markedBlock(name).includes('\u2014'), `${name} has an em dash`);
  }
});

test('saves from before February 2026 with bare-text theme, scene or character still move', () => {
  // Builds from Jan 18 to Feb 11 2026 stored these three without JSON. The game
  // reads them as its defaults, so they are left behind instead of refusing.
  const save = playedSave({ mathblaster_theme: 'tropical', mathblaster_scene: 'beach', mathblaster_avatar: 'panda' });
  const { text, summary } = exportFrom(save);
  assert.equal(summary.character, 'Mango', 'the game shows the default for an unreadable character');
  const parsed = T.parseTransferCode(text);
  assert.equal(parsed.ok, true, parsed.message);
  assert.deepEqual(parsed.ignoredKeys.sort(), ['mathblaster_avatar', 'mathblaster_scene', 'mathblaster_theme']);
  const target = makeStorage({ mathblaster_theme: '"rain"' });
  assert.equal(T.applyTransfer(target, parsed.keys, { now: NOW }).ok, true);
  assert.equal(target.getItem('mathblaster_theme'), null, 'left behind means the game default here too');
  assert.equal(target.getItem('mathblaster_xp'), save.mathblaster_xp);
});

function quotaStorage(entries, quota) {
  const map = new Map(Object.entries(entries));
  const used = () => [...map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    map,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem(key, value) {
      const prev = map.has(key) ? key.length + map.get(key).length : 0;
      if (used() - prev + key.length + String(value).length > quota) throw new Error('QuotaExceededError');
      map.set(key, String(value));
    },
    removeItem: key => map.delete(key),
  };
}

test('rollback on a full device frees the new Undo copy first and restores the old one last', () => {
  const pad = n => JSON.stringify(['x'.repeat(n)]);
  const oldValues = playedSave({ mathblaster_purchased_costumes: pad(6000) });
  const oldBackup = JSON.stringify({ app: 'mokulua-math', kind: 'transfer-backup', format: 1,
    savedAt: new Date(NOW - 1e6).toISOString(), keys: oldValues });
  const before = { ...oldValues, [TRANSFER_BACKUP_KEY]: oldBackup };
  const start = Object.entries(before).reduce((n, [k, v]) => n + k.length + v.length, 0);
  const s = quotaStorage(before, start + 500);
  // An early key shrinks, a later one grows into the freed room, then a still
  // later one does not fit: putting things back needs the rollback order.
  const incoming = playedSave({
    mathblaster_purchased_costumes: '[]',
    mathblaster_dances: pad(6000),
    mathblaster_stickers: pad(20000),
  });
  assert.equal(T.applyTransfer(s, incoming, { now: NOW }).error, 'storageFailed');
  assert.deepEqual(Object.fromEntries(s.map), before);
});

test('a failed write mid-Undo puts every key back, including the Undo copy', () => {
  const map = new Map(Object.entries(freshDevice()));
  const storage = {
    map, fail: false,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem(k, v) { if (this.fail && k === 'mathblaster_facts_sm2') throw new Error('QuotaExceededError'); map.set(k, String(v)); },
    removeItem: k => map.delete(k),
  };
  const parsed = T.parseTransferCode(exportFrom(playedSave()).text);
  assert.equal(T.applyTransfer(storage, parsed.keys, { now: NOW }).ok, true);
  const afterImport = Object.fromEntries(map);
  storage.fail = true;
  assert.equal(T.undoLastImport(storage, { now: NOW + 1 }).error, 'storageFailed');
  assert.deepEqual(Object.fromEntries(map), afterImport);
});

test('a URL-safe code with real + and / in it still reads', () => {
  const save = playedSave({ mathblaster_avatar: JSON.stringify('???~~~>>>') });
  const { text } = exportFrom(save);
  const bare = text.slice(text.indexOf(BLOCK_BEGIN) + BLOCK_BEGIN.length, text.indexOf(BLOCK_END)).replace(/\s+/g, '');
  assert.ok(/\+/.test(bare) && /\//.test(bare), 'fixture must produce both + and /');
  const parsed = T.parseTransferCode(bare.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  assert.equal(parsed.ok, true, parsed.message);
  assert.deepEqual(parsed.keys, save);
});

test('every moved key refuses a readable value of the wrong shape', () => {
  const wrong = {
    mathblaster_version: '"4"', mathblaster_xp: '"1"', mathblaster_coins: '"1"',
    mathblaster_purchased_costumes: '5', mathblaster_costumes: '5', mathblaster_avatar: '5',
    mathblaster_dances: '5', mathblaster_equippedDance: '5', mathblaster_trails: '5',
    mathblaster_equippedTrail: '5', mathblaster_pets: '5', mathblaster_equippedPet: '5',
    mathblaster_stickers: '5', mathblaster_box_progress: '5', mathblaster_achievements: '5',
    mathblaster_stats: '5', mathblaster_facts_sm2: '5', mathblaster_tiers: '5',
    mathblaster_tier_tracking: '5', mathblaster_op_accuracy: '5', mathblaster_last_session_ts: '"1"',
    mathblaster_selected_ops: '5', mathblaster_theme: '5', mathblaster_scene: '5',
    mathblaster_sound: '5', mathblaster_welcome_seen: '5',
  };
  assert.deepEqual(Object.keys(wrong).sort(), [...TRANSFER_KEYS].sort());
  for (const [key, bad] of Object.entries(wrong)) {
    assert.equal(T.parseTransferCode(codeWith({ [key]: bad })).error, 'damaged', key);
  }
});

test('the move flushes, then freezes saving, writes and restarts; a failed move turns saving back on', () => {
  const run = ok => {
    const log = [];
    const frozen = new Function('log', 'okResult', `
      let savesFrozen = false;
      const setTransferBusy = on => log.push('busy:' + on);
      const transferStatus = () => {};
      const flushPendingSaves = () => log.push('flush frozen=' + savesFrozen);
      const SaveTransfer = { MESSAGES: { storageFailed: 'x' } };
      const navigator = {};
      const window = { location: { reload: () => log.push('reload frozen=' + savesFrozen) } };
      const document = { activeElement: null, getElementById: () => ({ contains: () => true, focus() {} }) };
      const setTimeout = (fn, ms) => { if (ms < 1000) fn(); };
      ${gameFunction('commitTransfer')}
      commitTransfer({}, () => { log.push('action frozen=' + savesFrozen); return okResult ? { ok: true } : { ok: false, message: 'm' }; });
      return savesFrozen;
    `)(log, ok);
    return { frozen, log };
  };
  const good = run(true);
  assert.deepEqual(good.log, ['busy:true', 'flush frozen=false', 'action frozen=true', 'reload frozen=true']);
  assert.equal(good.frozen, true, 'saving stays frozen until the restart');
  const bad = run(false);
  assert.ok(!bad.log.some(line => line.startsWith('reload')));
  assert.equal(bad.frozen, false, 'a failed move must turn saving back on');
});

test('another open copy of the game stops saving and restarts when a move lands', () => {
  const sheet = markedBlock('transfer-sheet');
  assert.match(sheet, /addEventListener\('storage', e => \{\s*if \(e\.key !== SaveTransfer\.TRANSFER_BACKUP_KEY \|\| savesFrozen\) return;\s*savesFrozen = true;/);
});

test('the sheet avoids calls that old iPads (iOS 12) do not have', () => {
  const sheet = markedBlock('transfer-sheet');
  for (const api of ['replaceChildren', '?.', '??', 'structuredClone', '.at(']) {
    assert.ok(!sheet.includes(api), `transfer sheet uses ${api}`);
  }
});
