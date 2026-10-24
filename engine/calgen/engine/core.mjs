// calgen core: deterministic calendar skeleton from the Tonatsoyts rules. No reference sources. See ../README.md.
// Dates are handled as UTC day numbers to avoid timezone effects.
export const DAY = 86400000;
export const utc = (y, m, d) => Date.UTC(y, m - 1, d);
export const ymd = (t) => { const x = new Date(t); return [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()]; };
export const iso = (t) => { const [y, m, d] = ymd(t); return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; };
export const weekday = (t) => (new Date(t).getUTCDay() + 6) % 7;           // Mon=0 .. Sun=6
export const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// RULE R-EASTER (owner decision: Gregorian computus; Hador 2 p.189 table only computes Easter).
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
  return utc(y, month, day);
}

// RULE R-MODE: on Poon Paregentan (Easter-49) the mode resets to DK (8th) and advances one per day through the year.
export const MODES = ['ԱՁ', 'ԱԿ', 'ԲՁ', 'ԲԿ', 'ԳՁ', 'ԳԿ', 'ԴՁ', 'ԴԿ'];
export function modeOfDay(t) {
  const y = ymd(t)[0];
  const pp = easter(y) - 49 * DAY, base = t >= pp ? pp : easter(y - 1) - 49 * DAY;
  const i = (7 + Math.round((t - base) / DAY)) % 8;
  return { number: i + 1, armenian: MODES[i], since: iso(base) };
}

// RULE R-TABLE (Hador 2 preface + note under Feb 28 of table Ք): non-leap year -> the table whose Easter date equals the year's Easter.
// Leap year -> Jan 1-Feb 29 use the table of Easter+1 day (letter before the Easter letter; Ք when Easter is Apr 25), Mar 1-Dec 31 the Easter table.
export function tablesForYear(H2, y) {
  const e = easter(y), [, em, ed] = ymd(e);
  const byEaster = (m, d) => H2.tables.find((t) => !t.leap_table && t.easter[0] === m && t.easter[1] === d);
  const base = byEaster(em, ed);
  if (!isLeap(y)) return { easter: e, leap: false, segments: [{ table: base, from: [1, 1], to: [12, 31] }] };
  const [, nm, nd] = ymd(e + DAY);
  const early = (nm === 4 && nd === 26) ? H2.tables.find((t) => t.leap_table) : byEaster(nm, nd);
  return { easter: e, leap: true, segments: [{ table: early, from: [1, 1], to: [2, 29] }, { table: base, from: [3, 1], to: [12, 31] }] };
}

export function tableForDate(sel, m, d) {
  return sel.segments.find((s) => (m > s.from[0] || (m === s.from[0] && d >= s.from[1])) && (m < s.to[0] || (m === s.to[0] && d <= s.to[1])));
}

// Hador 2 rows that fall on this civil date (explicit, source-stated).
export function rowsFor(sel, m, d) {
  const seg = tableForDate(sel, m, d);
  return { table: seg.table, rows: seg.table.rows.filter((r) => r.m === m && r.d === d) };
}

// RULE R-TABLE-JAN1-5 (verified on the data: each table prints its Jan 1-5 rows at the END of the table, carrying the weekdays of the FOLLOWING civil
// year: 174 of 175 non-leap tables match year+1, 1 matches the same year): civil Jan 1-5 of year Y are read from the table in force at the end of year Y-1.
export function tableAndRows(H2, t) {
  const [y, m, d] = ymd(t);
  if (m === 1 && d <= 5) {
    const seg = tablesForYear(H2, y - 1).segments.slice(-1)[0];
    return { table: seg.table, rows: seg.table.rows.filter((r) => r.m === 1 && r.d === d), viaPreviousYear: true };
  }
  const sel = tablesForYear(H2, y), { table, rows } = rowsFor(sel, m, d);
  return { table, rows, viaPreviousYear: false };
}

export function dayCore(H2, t) {
  const [y, m, d] = ymd(t), sel = tablesForYear(H2, y), { table, rows } = tableAndRows(H2, t);
  return {
    date: iso(t), weekday: WD[weekday(t)], easterOffset: Math.round((t - sel.easter) / DAY), mode: modeOfDay(t),
    table: { id: table.id, letter: table.letter }, hador2Rows: rows,
    fast: rows.some((r) => r.fast) ? { status: 'fast', basis: 'Hador 2 row marked as a fast day' } : null,
  };
}
