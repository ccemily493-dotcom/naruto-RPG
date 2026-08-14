import { evaluateAIAudioDirector } from '../server/aiAudioDirector';
import { LocalProceduralSFXProvider } from '../server/sfxProvider';
import { generateSFXHash, getCachedSFX } from '../server/audioCache';

async function runAIAudioSuite() {
  console.log('============================================================');
  console.log('AI AUDIO SYSTEM V3 — AUTOMATED VERIFICATION SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // TEST 1: Chakra Concentration in Night Forest
  console.log('--- TEST 1: Chakra Concentration in Night Forest ---');
  const t1 = await evaluateAIAudioDirector('Rin concentra chakra en sus manos en medio del bosque nocturno.');
  assert(t1.intent.world.environment === 'forest', 'Test 1: L1 environment is forest');
  assert(t1.intent.world.time === 'night', 'Test 1: Time is night');
  assert(t1.intent.music.trackKey === 'rin_theme_ambient', 'Test 1: L3 music is ambient (NO Glued State)');
  assert(t1.intent.events.some((e) => e.event === 'chakra_charge'), 'Test 1: L4 action detected chakra_charge');
  assert(!t1.intent.events.some((e) => e.event.includes('kunai') || e.event.includes('explosion')), 'Test 1: NO explosion, NO kunai, NO footsteps');

  // TEST 2: Kunai Throw against Tree Trunk
  console.log('\n--- TEST 2: Kunai Throw against Tree Trunk ---');
  const t2 = await evaluateAIAudioDirector('Rin lanza un kunai contra un tronco.');
  assert(t2.intent.events.some((e) => e.event === 'kunai_throw' && e.type === 'action'), 'Test 2: L4 action detected kunai_throw');
  assert(t2.intent.events.some((e) => e.event === 'metal_wood_impact' && e.type === 'impact'), 'Test 2: L5 impact detected metal_wood_impact');

  // TEST 3: Looking at Kunai (Passive Observation - NO SFX)
  console.log('\n--- TEST 3: Looking at Kunai (Passive Observation -> NO SFX) ---');
  const t3 = await evaluateAIAudioDirector('Rin mira el kunai que sostiene.');
  assert(!t3.intent.events.some((e) => e.event === 'kunai_throw'), 'Test 3: NO kunai_throw for passive look');
  assert(!t3.intent.events.some((e) => e.event.includes('impact')), 'Test 3: NO kunai_impact for passive look');

  // TEST 4: Peaceful Conversation with Kakashi
  console.log('\n--- TEST 4: Peaceful Conversation with Kakashi ---');
  const t4 = await evaluateAIAudioDirector('Rin conversa tranquilamente con Kakashi.');
  assert(t4.intent.music.combat === false, 'Test 4: combat = false');
  assert(t4.intent.music.trackKey !== 'glued_state', 'Test 4: NO Glued State on peaceful conversation');
  assert(t4.intent.events.length === 0, 'Test 4: Zero impact / action SFX generated for quiet dialogue');

  // TEST 5: Roots Emerging and Binding Target
  console.log('\n--- TEST 5: Roots Emerging and Binding Target ---');
  const t5 = await evaluateAIAudioDirector('Raíces gigantescas emergen del suelo y aprisionan al enemigo.');
  assert(t5.intent.events.some((e) => e.event === 'wood_root_growth'), 'Test 5: L4 action detected wood_root_growth');
  assert(t5.intent.events.some((e) => e.event === 'wood_bind'), 'Test 5: L4 action detected wood_bind');
  assert(!t5.intent.events.some((e) => e.event === 'wood_impact'), 'Test 5: DOES NOT assume wood_impact when only binding');

  // TEST 6: Violent Root Impact Slam
  console.log('\n--- TEST 6: Violent Root Impact Slam ---');
  const t6 = await evaluateAIAudioDirector('Las raíces golpean violentamente al enemigo.');
  assert(t6.intent.events.some((e) => e.event === 'wood_impact' && e.type === 'impact'), 'Test 6: L5 impact detected wood_impact on violent hit');

  // TEST 7: AI SFX Provider & Smart Hashed Cache
  console.log('\n--- TEST 7: AI SFX Provider & Smart Hashed Cache ---');
  const provider = new LocalProceduralSFXProvider();
  const testPrompt = `unique_razor_sharp_kunai_blade_${Date.now()}`;
  const gen1 = await provider.generateSFX(testPrompt, {
    event: 'kunai_throw',
    material: 'metal',
    intensity: 0.85,
  });
  assert(Boolean(gen1.audioUrl), 'Test 7: Local AI Provider generated audio URL successfully');
  assert(gen1.isCached === false, 'Test 7: First generation is not cached');

  const gen2 = await provider.generateSFX(testPrompt, {
    event: 'kunai_throw',
    material: 'metal',
    intensity: 0.85,
  });
  assert(gen2.isCached === true, 'Test 7: Second identical generation returns instantly from Smart Cache');

  console.log('\n============================================================');
  console.log(`AI AUDIO V3 VERIFICATION: ${passed} / ${total} TESTS PASSED`);
  console.log('============================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAIAudioSuite().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
