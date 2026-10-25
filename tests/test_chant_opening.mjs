// R1: opening (Alleluia prefix) rules for the Psalm / Mesedi / Alleluia chants. Run: node tests/test_chant_opening.mjs
import fs from 'fs';
import assert from 'assert';
import { openingFor, interleave } from '../chant-order.mjs';
const layer = JSON.parse(fs.readFileSync(new URL('../data/calendar/chants_layer.json', import.meta.url), 'utf8'));
assert(layer.opening_rules && layer.opening_rules.rules.length >= 6, 'rules present');
const ARM = 'Ալէլուիա, ալէլուիա:', EN = 'Alleluia, alleluia:';
let o = openingFor('psalm', 1, { verbatim: 'Սաղմոս Բ.' }, layer);
assert.equal(o.rule_id, 'R1-PSALM-FIRST'); assert.equal(o.armenian_prefix, ARM); assert.equal(o.english_prefix, EN); assert.equal(o.applies, true);
o = openingFor('mesedi', 2, { verbatim: 'Մեսեդի' }, layer);
assert.equal(o.rule_id, 'R1-MESEDI-SECOND'); assert.equal(o.applies, false); assert.equal(o.armenian_prefix, null); assert.equal(o.english_prefix, null);
o = openingFor('mesedi', 1, { verbatim: 'Մեսեդի' }, layer);
assert.equal(o.rule_id, 'R1-MESEDI-FIRST'); assert.equal(o.applies, false); assert.equal(o.review_status, 'unconfirmed');
o = openingFor('psalm', 2, {}, layer); assert.equal(o.rule_id, 'R1-PSALM-LATER'); assert.equal(o.applies, true); assert.equal(o.review_status, 'unconfirmed');
o = openingFor('alleluia', 3, { verbatim: 'Ալէլուիա. Յարութեան ՚ի ձայնէն' }, layer);
assert.equal(o.rule_id, 'R1-ALLELUIA-TONE'); assert.equal(o.applies, true); assert.equal(o.review_status, 'unconfirmed');
o = openingFor('alleluia', 3, { verbatim: 'Ալէլուիա. Այսօր ծնաւ' }, layer);
assert.equal(o.rule_id, 'R1-ALLELUIA-VERSE'); assert.equal(o.applies, true); assert.equal(o.review_status, 'rule_applied');
assert.equal(openingFor('hymn', 1, {}, layer), null);
assert.equal(openingFor('psalm', 1, {}, {}), null);
// through interleave: psalm, apostle reading, mesedi, gospel: psalm gets the prefix, mesedi none, alleluia prefix
const day = { readings: [{ passage: { book: 'Isaiah' }, citationKey: 'a', service: { class: 'jashoo' } }, { passage: { book: 'Romans' }, citationKey: 'b', service: { class: 'jashoo' } }, { passage: { book: 'John' }, citationKey: 'c', service: { class: 'jashoo' } }],
  chants: [{ kind: 'psalm', service: 'Jashoo', verbatim: 'Սաղմոս' }, { kind: 'mesedi', service: 'Jashoo', verbatim: 'Մեսեդի' }, { kind: 'alleluia', service: 'Jashoo', verbatim: 'Ալէլուիա' }] };
const lay = interleave(day, layer);
const ch = lay.groups[0].items.filter((x) => x.type === 'chant');
assert.deepEqual(ch.map((x) => [x.kind, x.opening.rule_id, x.opening.applies]), [['psalm', 'R1-PSALM-FIRST', true], ['mesedi', 'R1-MESEDI-SECOND', false], ['alleluia', 'R1-ALLELUIA-VERSE', true]]);
console.log('chant opening tests OK');
