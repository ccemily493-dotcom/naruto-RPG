import { IGMProvider, GMProviderId, GMGenerateParams } from './types';

export type MockState = 'working' | 'quota_exhausted' | 'timeout' | 'unavailable';

export interface MockScenarioConfig {
  proState: MockState;
  flashState: MockState;
  qwenState: MockState;
}

export const PRESET_SCENARIOS = {
  // Scenario 1: Gemini Pro working
  PRO_WORKING: {
    proState: 'working',
    flashState: 'working',
    qwenState: 'working',
  } as MockScenarioConfig,

  // Scenario 2: Gemini Pro exhausted (falls back to Flash)
  PRO_EXHAUSTED: {
    proState: 'quota_exhausted',
    flashState: 'working',
    qwenState: 'working',
  } as MockScenarioConfig,

  // Scenario 3: Gemini Pro + Flash exhausted (falls back to Qwen)
  PRO_FLASH_EXHAUSTED: {
    proState: 'quota_exhausted',
    flashState: 'quota_exhausted',
    qwenState: 'working',
  } as MockScenarioConfig,

  // Scenario 4: Gemini completely unavailable
  GEMINI_UNAVAILABLE: {
    proState: 'unavailable',
    flashState: 'unavailable',
    qwenState: 'working',
  } as MockScenarioConfig,

  // Scenario 5: Qwen working as fallback
  QWEN_FALLBACK: {
    proState: 'quota_exhausted',
    flashState: 'quota_exhausted',
    qwenState: 'working',
  } as MockScenarioConfig,

  // Scenario 6: All providers unavailable
  ALL_UNAVAILABLE: {
    proState: 'unavailable',
    flashState: 'unavailable',
    qwenState: 'unavailable',
  } as MockScenarioConfig,
};

let activeScenario: MockScenarioConfig = PRESET_SCENARIOS.PRO_WORKING;

export function setMockScenario(config: MockScenarioConfig | keyof typeof PRESET_SCENARIOS) {
  if (typeof config === 'string' && PRESET_SCENARIOS[config]) {
    activeScenario = PRESET_SCENARIOS[config];
  } else if (typeof config === 'object') {
    activeScenario = { ...activeScenario, ...config };
  }
}

export function getActiveMockScenario(): MockScenarioConfig {
  return activeScenario;
}

export class MockProvider implements IGMProvider {
  public id: GMProviderId;
  public name: string;
  public isFree = true;
  public isLocal: boolean;
  private stateKey: 'proState' | 'flashState' | 'qwenState';

  constructor(
    id: GMProviderId,
    name: string,
    stateKey: 'proState' | 'flashState' | 'qwenState',
    isLocal = false
  ) {
    this.id = id;
    this.name = name;
    this.stateKey = stateKey;
    this.isLocal = isLocal;
  }

  public async isAvailable(): Promise<boolean> {
    const currentState = activeScenario[this.stateKey];
    return currentState !== 'unavailable';
  }

  public async generateStream(
    params: GMGenerateParams,
    onChunk: (text: string) => void
  ): Promise<void> {
    const currentState = activeScenario[this.stateKey];

    if (currentState === 'unavailable') {
      const err = new Error(`Provider ${this.name} is unavailable (503 Service Unavailable).`);
      (err as any).status = 503;
      throw err;
    }

    if (currentState === 'quota_exhausted') {
      const err = new Error(`Provider ${this.name} quota limit exceeded (429 RESOURCE_EXHAUSTED).`);
      (err as any).status = 429;
      (err as any).code = 'RESOURCE_EXHAUSTED';
      throw err;
    }

    if (currentState === 'timeout') {
      const err = new Error(`Provider ${this.name} connection timed out (ETIMEDOUT).`);
      (err as any).code = 'ETIMEDOUT';
      throw err;
    }

    // Working simulation: stream response chunks
    const simulatedText = `[Respuesta de ${this.name}]: El destino de Rin se despliega con calma en el enclave.`;
    const chunks = simulatedText.split(' ');
    for (const chunk of chunks) {
      onChunk(chunk + ' ');
    }
  }
}
