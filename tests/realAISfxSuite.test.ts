import { WooshSFXProvider } from '../server/wooshProvider';
import { DashengSFXProvider } from '../server/dashengProvider';
import { ExistingAssetProvider } from '../server/existingAssetProvider';
import { generateSFXHash } from '../server/audioCache';
import { matchSemanticAudio } from '../server/semanticMatcher';

async function runRealAISuite() {
  console.log('============================================================');
  console.log('REAL AI SFX PROVIDER V4 — AUTOMATED VERIFICATION SUITE');
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

  // TEST 1: Woosh Provider Capabilities & Acoustic Prompt Formatting
  console.log('--- TEST 1: SonyResearch/Woosh Provider ---');
  const woosh = new WooshSFXProvider();
  const caps = woosh.getCapabilities();
  assert(caps.providerName.includes('SonyResearch/Woosh'), 'Test 1: Provider name correctly set to SonyResearch/Woosh');
  assert(caps.isLocal === true, 'Test 1: Woosh is configured as a Local AI Provider');

  const acousticPrompt = woosh.buildAcousticPrompt('sharp blade slash', {
    event: 'kunai_throw',
    material: 'metal',
    intensity: 0.9,
  });
  assert(
    acousticPrompt.includes('metal') && acousticPrompt.includes('high impact') && acousticPrompt.includes('crisp transient'),
    'Test 1: Formatted rich acoustic prompt for Woosh inference engine'
  );

  // TEST 2: Dasheng-AudioGen Secondary Provider Capabilities
  console.log('\n--- TEST 2: Dasheng-AudioGen C++ Provider ---');
  const dasheng = new DashengSFXProvider();
  const dashengCaps = dasheng.getCapabilities();
  assert(dashengCaps.providerName.includes('Dasheng-AudioGen C++'), 'Test 2: Secondary provider is Dasheng-AudioGen');

  // TEST 3: ExistingAssetProvider Strict Filter (Score >= 0.85)
  console.log('\n--- TEST 3: ExistingAssetProvider Strict Score >= 0.85 Filter ---');
  const assetProvider = new ExistingAssetProvider();

  // High score query (wood_growth -> wood_creak.ogg)
  const highMatch = await assetProvider.evaluateAsset('wood_growth', { material: 'wood', intensity: 0.8 });
  assert(
    highMatch.match.confidence >= 85 && highMatch.result !== null,
    `Test 3: High-scoring match (Score ${highMatch.match.confidence}%) returns valid asset`,
    `File: ${highMatch.result?.audioUrl}`
  );

  // Low score query (unmapped_exotic_sound -> Score < 85)
  const lowMatch = await assetProvider.evaluateAsset('unmapped_exotic_nonexistent_sound', { material: 'plasma' });
  assert(
    lowMatch.result === null,
    'Test 3: Score < 0.85 returns result = null (Pure Silence / NO SFX)',
    `Confidence: ${lowMatch.match.confidence}`
  );
  assert(
    lowMatch.match.matchedItem === null,
    'Test 3: NEVER returns library[0] or random fallbacks when score < 85'
  );

  // TEST 4: Smart SHA-256 Audio Cache Hashing
  console.log('\n--- TEST 4: SHA-256 Smart Audio Cache Hash ---');
  const hash1 = generateSFXHash('kunai_throw', 'razor-sharp blade slice', 'metal', 0.85, 'combat');
  const hash2 = generateSFXHash('kunai_throw', 'razor-sharp blade slice', 'metal', 0.85, 'combat');
  const hash3 = generateSFXHash('wood_growth', 'roots erupting', 'wood', 0.9, 'combat');

  assert(hash1 === hash2, 'Test 4: Identical semantic parameters generate identical SHA-256 hash');
  assert(hash1 !== hash3, 'Test 4: Different events generate distinct SHA-256 hashes');
  assert(hash1.length === 16, 'Test 4: Hash string length is 16 hex characters');

  console.log('\n============================================================');
  console.log(`REAL AI SFX V4 VERIFICATION: ${passed} / ${total} TESTS PASSED`);
  console.log('============================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runRealAISuite().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
