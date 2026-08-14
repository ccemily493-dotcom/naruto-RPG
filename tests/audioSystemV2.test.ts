import { evaluateAudioDirector } from '../server/audioDirector';
import { matchSemanticAudio } from '../server/semanticMatcher';

console.log('============================================================');
console.log('AUDIO SYSTEM V2 — AUTOMATED VERIFICATION SUITE');
console.log('============================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       Details: ${details}`);
  }
}

// TEST 1: Glued State Protection on Peaceful Scenes
console.log('--- TEST GROUP 1: Glued State Protection ---');
const peacefulEval = evaluateAudioDirector('Rin camina tranquilamente por la aldea de Konoha y conversa con Kakashi en Ichiraku.');
assert(
  peacefulEval.musicMatch.matchedItem?.id !== 'track_naruto_glued_state',
  'Peaceful scene DOES NOT trigger Glued State',
  `Triggered: ${peacefulEval.musicMatch.matchedItem?.id}`
);
assert(
  peacefulEval.debug.strategyRequired === false,
  'Peaceful scene correctly evaluates strategyRequired = false'
);

// TEST 2: Glued State Activation ONLY on Combat Strategy
console.log('\n--- TEST GROUP 2: Glued State Strategic Combat Activation ---');
const combatStrategyEval = evaluateAudioDirector('Combate táctico de posicionamiento. Rin analiza el tenketsu del enemigo y coloca trampas con sellos.', {
  currentThreat: 'Enemigo Hostil',
});
assert(
  combatStrategyEval.musicMatch.matchedItem?.id === 'track_naruto_glued_state',
  'Strategic combat scene DOES trigger Glued State',
  `Triggered: ${combatStrategyEval.musicMatch.matchedItem?.id}`
);

// TEST 3: Signature Technique Sound Flows for Rin (Mokuton & Kālī)
console.log('\n--- TEST GROUP 3: Rin Signature Sound Flows ---');
const mokutonEval = evaluateAudioDirector('Rin realiza el Jutsu Ataúd de la Muerte y enormes raíces de Mokuton emergen del suelo.');
assert(
  mokutonEval.debug.rinTechniqueDetected === 'Mokuton',
  'Detected Mokuton technique for Rin'
);
assert(
  mokutonEval.sfxMatches.some((s) => s.event.event === 'wood_growth' && s.event.layer === 'action'),
  'Generated Layer 4 (Action) event for wood_growth'
);
assert(
  mokutonEval.sfxMatches.some((s) => s.event.event === 'wood_impact' && s.event.layer === 'impact'),
  'Generated Layer 5 (Impact) event for wood_impact'
);

// TEST 4: Elimination of Random library[0] Fallbacks (No-Resource Silences)
console.log('\n--- TEST GROUP 4: Zero library[0] Random Fallback ---');
const unmappedMatch = matchSemanticAudio({
  event: 'non_existent_impossible_sound_effect_xyz',
  layer: 'action',
  material: 'unobtainium',
});
assert(
  unmappedMatch.matchedItem === null,
  'Unmapped event returns matchedItem = null (No library[0] random fallback!)'
);
assert(
  unmappedMatch.reason.includes('NO_COMPATIBLE_RESOURCE'),
  'Unmapped event explicitly returns NO_COMPATIBLE_RESOURCE reason'
);

// TEST SUMMARY
console.log('\n============================================================');
console.log(`VERIFICATION COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('============================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
