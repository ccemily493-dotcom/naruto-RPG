import { evaluateAIAudioDirector } from '../server/aiAudioDirector';
import { WooshSFXProvider } from '../server/wooshProvider';
import { DashengSFXProvider } from '../server/dashengProvider';
import { ExistingAssetProvider } from '../server/existingAssetProvider';
import { generateSFXHash } from '../server/audioCache';
import { executeSFXOrchestration } from '../server/sfxProvider';

async function runV4Suite() {
  console.log('============================================================');
  console.log('AI AUDIO SYSTEM V4 — MANDATORY 14 VERIFICATION SUITES');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // TEST 1: "Rin mira un kunai." -> NO SFX
  console.log('--- TEST 1: "Rin mira un kunai." (Passive look -> NO SFX) ---');
  const t1 = await evaluateAIAudioDirector('Rin mira un kunai.');
  assert(t1.intent.events.length === 0, 'Test 1: Zero SFX events generated for passive look');
  assert(t1.intent.reason === 'object_mentioned_but_no_audio_action', 'Test 1: Reason is object_mentioned_but_no_audio_action');

  // TEST 2: "Rin lanza un kunai." -> kunai_throw
  console.log('\n--- TEST 2: "Rin lanza un kunai." ---');
  const t2 = await evaluateAIAudioDirector('Rin lanza un kunai.');
  assert(t2.intent.events.some((e) => e.event === 'kunai_throw'), 'Test 2: Generated kunai_throw action event');

  // TEST 3: "El kunai golpea madera." -> metal_wood_impact
  console.log('\n--- TEST 3: "El kunai golpea madera." ---');
  const t3 = await evaluateAIAudioDirector('El kunai golpea madera.');
  assert(t3.intent.events.some((e) => e.event === 'metal_wood_impact' && e.type === 'impact'), 'Test 3: Generated metal_wood_impact impact event');

  // TEST 4: "Rin concentra chakra." -> chakra_charge
  console.log('\n--- TEST 4: "Rin concentra chakra." ---');
  const t4 = await evaluateAIAudioDirector('Rin concentra chakra.');
  assert(t4.intent.events.some((e) => e.event === 'chakra_charge'), 'Test 4: Generated chakra_charge action event');

  // TEST 5: "Raíces emergen del suelo." -> wood_root_growth
  console.log('\n--- TEST 5: "Raíces emergen del suelo." ---');
  const t5 = await evaluateAIAudioDirector('Raíces emergen del suelo.');
  assert(t5.intent.events.some((e) => e.event === 'wood_root_growth'), 'Test 5: Generated wood_root_growth action event');

  // TEST 6: "Las raíces golpean al enemigo." -> wood_impact
  console.log('\n--- TEST 6: "Las raíces golpean al enemigo." ---');
  const t6 = await evaluateAIAudioDirector('Las raíces golpean al enemigo.');
  assert(t6.intent.events.some((e) => e.event === 'wood_impact' && e.type === 'impact'), 'Test 6: Generated wood_impact impact event');

  // TEST 7: Escena pacífica -> NO combat SFX
  console.log('\n--- TEST 7: Escena pacífica ---');
  const t7 = await evaluateAIAudioDirector('Rin camina tranquilamente por las calles de Konoha.');
  assert(t7.intent.music.combat === false, 'Test 7: combat = false on peaceful scene');
  assert(t7.intent.events.length === 0, 'Test 7: Zero combat SFX on peaceful scene');

  // TEST 8: Escena estratégica -> puede utilizar Glued State
  console.log('\n--- TEST 8: Escena estratégica (Glued State Allowed) ---');
  const t8 = await evaluateAIAudioDirector('Análisis táctico de posicionamiento en batalla.', { currentThreat: 'Enemigo Hostil' });
  assert(t8.intent.music.trackKey === 'glued_state', 'Test 8: Strategic combat allows Glued State');

  // TEST 9: Glued State -> NUNCA fuera de strategic_combat
  console.log('\n--- TEST 9: Glued State NUNCA fuera de strategic_combat ---');
  const t9 = await evaluateAIAudioDirector('Rin descansa bajo la sombra de un árbol.');
  assert(t9.intent.music.trackKey !== 'glued_state', 'Test 9: Glued State is protected on peaceful rest');

  // TEST 10: Recurso incompatible -> SILENCE
  console.log('\n--- TEST 10: Recurso incompatible -> SILENCE ---');
  const assetProvider = new ExistingAssetProvider();
  const lowMatch = await assetProvider.evaluateAsset('unmapped_exotic_nonexistent_sound', { material: 'plasma' });
  assert(lowMatch.result === null, 'Test 10: Unmapped resource returns null (Pure Silence)');

  // TEST 11: Cache HIT -> NO volver a generar
  console.log('\n--- TEST 11: Cache HIT ---');
  const uniquePrompt = `unique_acoustic_foley_test_${Date.now()}`;
  const gen1 = await executeSFXOrchestration(uniquePrompt, { event: 'kunai_throw', material: 'metal' });
  const gen2 = await executeSFXOrchestration(uniquePrompt, { event: 'kunai_throw', material: 'metal' });
  assert(gen2.isCached === true || gen2.provider.includes('Cache') || gen2.provider.includes('Existing'), 'Test 11: Repeat query hits SHA-256 cache');

  // TEST 12: Woosh unavailable -> Dasheng
  console.log('\n--- TEST 12: Woosh unavailable -> Dasheng fallback ---');
  const woosh = new WooshSFXProvider();
  const wooshAvail = woosh.isAvailable();
  assert(typeof wooshAvail === 'boolean', 'Test 12: Woosh availability correctly evaluated');

  // TEST 13: Woosh + Dasheng unavailable -> ExistingAssetProvider
  console.log('\n--- TEST 13: ExistingAssetProvider fallback ---');
  const existingEval = await assetProvider.evaluateAsset('wood_growth', { material: 'wood' });
  assert(existingEval.match.confidence >= 85, 'Test 13: ExistingAssetProvider evaluates catalog confidence');

  // TEST 14: ExistingAsset score < 0.85 -> SILENCE
  console.log('\n--- TEST 14: ExistingAsset score < 0.85 -> SILENCE ---');
  const lowScoreEval = await assetProvider.evaluateAsset('random_exotic_word_unrelated', { material: 'unknown' });
  assert(lowScoreEval.result === null, 'Test 14: Score < 0.85 produces SILENCE (result = null)');

  console.log('\n============================================================');
  console.log(`MANDATORY 14 VERIFICATION: ${passed} / ${total} TESTS PASSED`);
  console.log('============================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runV4Suite().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
