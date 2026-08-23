/**
 * Framework-agnostic runtime for output/mobile_support_package.json.
 * React Native, Flutter bridges, web views, or native screens can call the
 * same small session API without knowing the dataset's internal schemas.
 */

export type SupportAnswer = 'YES' | 'NO' | 'UNKNOWN' | 'OTHER';
export type SupportLocale = 'tr' | 'en';

export interface SupportPackage {
  default_locale: SupportLocale;
  machines: Array<{ machine_id: string; name: string; model: string | null }>;
  flows: Array<{
    flow_id: string;
    title: Record<string, string>;
    machine_id: string;
    model_scope: string[];
    root_node_id: string;
    system_id: string | null;
  }>;
  nodes: Array<{
    node_id: string;
    question: Record<string, string>;
    help: Record<string, string> | null;
    choices: Array<{
      answer: SupportAnswer;
      label: Record<string, string>;
      target_type: 'NODE' | 'RESULT';
      target_id: string;
    }>;
  }>;
  results: Array<{
    result_id: string;
    diagnosis: { certainty: 'CONFIRMED' | 'UNKNOWN'; text: Record<string, string> | null };
    actions: Array<{ order: number; text: Record<string, string> | null }>;
    service_cta: 'CONTACT_AUTHORIZED_SERVICE' | 'NONE';
  }>;
  safety: Array<{
    safety_id: string;
    machine_id: string;
    model_scope: string[];
    severity: string;
    hazard_category: string;
    text: Record<string, string>;
  }>;
}

export interface SupportSession {
  flowId: string;
  machineId: string;
  nodeId: string;
  history: Array<{ nodeId: string; answer: SupportAnswer }>;
  safetyAcknowledged: boolean;
}

export type SupportStep =
  | { kind: 'QUESTION'; session: SupportSession; node: SupportPackage['nodes'][number]; safety: SupportPackage['safety'] }
  | { kind: 'RESULT'; session: SupportSession; result: SupportPackage['results'][number]; safety: SupportPackage['safety'] };

export class MobileSupportRuntime {
  private readonly nodeById: Map<string, SupportPackage['nodes'][number]>;
  private readonly resultById: Map<string, SupportPackage['results'][number]>;
  private readonly flowById: Map<string, SupportPackage['flows'][number]>;

  constructor(private readonly data: SupportPackage) {
    this.nodeById = new Map(data.nodes.map((node) => [node.node_id, node]));
    this.resultById = new Map(data.results.map((result) => [result.result_id, result]));
    this.flowById = new Map(data.flows.map((flow) => [flow.flow_id, flow]));
  }

  listMachines() {
    return this.data.machines;
  }

  listFlows(machineId?: string, query?: string) {
    const q = query?.trim().toLocaleLowerCase('tr-TR');
    return this.data.flows.filter((flow) => {
      const machineMatch = !machineId
        || flow.machine_id === machineId
        || flow.model_scope.includes(machineId);
      const text = `${flow.title.tr || ''} ${flow.title.en || ''}`.toLocaleLowerCase('tr-TR');
      return machineMatch && (!q || text.includes(q));
    });
  }

  start(flowId: string, machineId?: string): SupportStep {
    const flow = this.flowById.get(flowId);
    if (!flow) throw new Error(`Unknown support flow: ${flowId}`);
    const selectedMachine = machineId || flow.machine_id;
    if (selectedMachine !== flow.machine_id && !flow.model_scope.includes(selectedMachine)) {
      throw new Error(`Flow ${flowId} is not published for machine ${selectedMachine}`);
    }
    const session: SupportSession = {
      flowId,
      machineId: selectedMachine,
      nodeId: flow.root_node_id,
      history: [],
      safetyAcknowledged: false,
    };
    return this.questionStep(session);
  }

  answer(session: SupportSession, answer: SupportAnswer): SupportStep {
    const node = this.nodeById.get(session.nodeId);
    if (!node) throw new Error(`Unknown node: ${session.nodeId}`);
    const choice = node.choices.find((item) => item.answer === answer);
    if (!choice) throw new Error(`Answer ${answer} is not available at ${session.nodeId}`);
    const nextSession: SupportSession = {
      ...session,
      history: [...session.history, { nodeId: node.node_id, answer }],
      safetyAcknowledged: false,
    };
    if (choice.target_type === 'NODE') {
      const nextNode = this.nodeById.get(choice.target_id);
      if (!nextNode) throw new Error(`Broken node target: ${choice.target_id}`);
      return this.questionStep({ ...nextSession, nodeId: nextNode.node_id });
    }
    const result = this.resultById.get(choice.target_id);
    if (!result) throw new Error(`Broken result target: ${choice.target_id}`);
    return this.resultStep(nextSession, result);
  }

  acknowledgeSafety(session: SupportSession): SupportSession {
    return { ...session, safetyAcknowledged: true };
  }

  canShowAction(session: SupportSession) {
    return session.safetyAcknowledged;
  }

  private questionStep(session: SupportSession): SupportStep {
    const node = this.nodeById.get(session.nodeId);
    if (!node) throw new Error(`Unknown node: ${session.nodeId}`);
    return { kind: 'QUESTION', session, node, safety: this.safetyFor(session) };
  }

  private resultStep(session: SupportSession, result: SupportPackage['results'][number]): SupportStep {
    return { kind: 'RESULT', session, result, safety: this.safetyFor(session) };
  }

  private safetyFor(session: SupportSession) {
    const flow = this.flowById.get(session.flowId);
    return this.data.safety.filter((item) => item.machine_id === session.machineId
      || item.machine_id === flow?.machine_id
      || item.model_scope.includes(session.machineId));
  }
}
