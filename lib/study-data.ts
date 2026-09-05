export type Difficulty = 1 | 2 | 3;

export type StudyQuestion = {
  id: string;
  conceptId: string;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  choices: [string, string, string, string];
  answerIndex: number;
  explanation: string;
  variant: number;
};

export type StudySet = {
  id: string;
  version: string;
  title: string;
  course: string;
  description: string;
  questions: StudyQuestion[];
};

export const biologyDemo: StudySet = {
  id: 'cellular-respiration',
  version: 'biology-demo-v1',
  title: 'Cellular Respiration',
  course: 'BIO 101',
  description: 'From glycolysis to the electron transport chain.',
  questions: [
    {
      id: 'glycolysis-location-a',
      conceptId: 'glycolysis-location',
      topic: 'Glycolysis',
      difficulty: 1,
      prompt: 'Where in a eukaryotic cell does glycolysis occur?',
      choices: [
        'Cytosol',
        'Mitochondrial matrix',
        'Nucleus',
        'Golgi apparatus',
      ],
      answerIndex: 0,
      explanation:
        'Glycolysis takes place in the cytosol and does not require a mitochondrion.',
      variant: 0,
    },
    {
      id: 'glycolysis-location-b',
      conceptId: 'glycolysis-location',
      topic: 'Glycolysis',
      difficulty: 1,
      prompt:
        'A cell has no mitochondria. Which stage of glucose breakdown can still happen?',
      choices: [
        'Glycolysis',
        'Citric acid cycle',
        'Electron transport',
        'Chemiosmosis',
      ],
      answerIndex: 0,
      explanation:
        'Glycolysis happens in the cytosol, so it can proceed without mitochondria.',
      variant: 1,
    },
    {
      id: 'glycolysis-atp-a',
      conceptId: 'glycolysis-atp',
      topic: 'Glycolysis',
      difficulty: 2,
      prompt: 'What is the net ATP gain from glycolysis per glucose molecule?',
      choices: ['1 ATP', '2 ATP', '4 ATP', '30 ATP'],
      answerIndex: 1,
      explanation:
        'Glycolysis produces four ATP but spends two, for a net gain of two ATP.',
      variant: 0,
    },
    {
      id: 'glycolysis-atp-b',
      conceptId: 'glycolysis-atp',
      topic: 'Glycolysis',
      difficulty: 2,
      prompt:
        'Glycolysis makes 4 ATP and consumes 2 ATP. What is its net yield?',
      choices: ['2 ATP', '4 ATP', '6 ATP', '8 ATP'],
      answerIndex: 0,
      explanation:
        'Net yield is ATP produced minus ATP invested: 4 − 2 = 2 ATP.',
      variant: 1,
    },
    {
      id: 'pyruvate-a',
      conceptId: 'pyruvate-oxidation',
      topic: 'Pyruvate oxidation',
      difficulty: 2,
      prompt:
        'Before entering the citric acid cycle, pyruvate is converted into what molecule?',
      choices: ['Acetyl-CoA', 'Lactate', 'Glucose', 'Oxaloacetate'],
      answerIndex: 0,
      explanation:
        'Pyruvate oxidation produces acetyl-CoA, NADH, and carbon dioxide.',
      variant: 0,
    },
    {
      id: 'pyruvate-b',
      conceptId: 'pyruvate-oxidation',
      topic: 'Pyruvate oxidation',
      difficulty: 2,
      prompt:
        'Which molecule delivers pyruvate-derived carbon into the citric acid cycle?',
      choices: ['Acetyl-CoA', 'NADH', 'ATP synthase', 'Oxygen'],
      answerIndex: 0,
      explanation:
        'The two-carbon acetyl group enters the cycle attached to coenzyme A.',
      variant: 1,
    },
    {
      id: 'citric-carbon-a',
      conceptId: 'citric-carbon',
      topic: 'Citric acid cycle',
      difficulty: 3,
      prompt:
        'What happens to the carbon atoms that enter the citric acid cycle?',
      choices: [
        'They leave as CO₂',
        'They become oxygen',
        'They form ATP directly',
        'They remain in NADH',
      ],
      answerIndex: 0,
      explanation:
        'Oxidation reactions release carbon atoms as carbon dioxide while capturing energy in electron carriers.',
      variant: 0,
    },
    {
      id: 'citric-carbon-b',
      conceptId: 'citric-carbon',
      topic: 'Citric acid cycle',
      difficulty: 3,
      prompt:
        'A labeled carbon enters the citric acid cycle in acetyl-CoA. In what waste product can it eventually appear?',
      choices: ['Carbon dioxide', 'Molecular oxygen', 'Ammonia', 'Water only'],
      answerIndex: 0,
      explanation:
        'Carbon is oxidized and released from the cycle in carbon dioxide.',
      variant: 1,
    },
    {
      id: 'oxygen-a',
      conceptId: 'oxygen-role',
      topic: 'Electron transport',
      difficulty: 3,
      prompt: 'What is oxygen’s direct role in the electron transport chain?',
      choices: [
        'Final electron acceptor',
        'ATP donor',
        'Proton pump',
        'Glucose carrier',
      ],
      answerIndex: 0,
      explanation:
        'Oxygen accepts electrons and protons at the end of the chain, forming water.',
      variant: 0,
    },
    {
      id: 'oxygen-b',
      conceptId: 'oxygen-role',
      topic: 'Electron transport',
      difficulty: 3,
      prompt: 'Without oxygen, why does the electron transport chain stop?',
      choices: [
        'Electrons have no final acceptor',
        'ATP synthase disappears',
        'Glucose cannot enter cells',
        'The cytosol runs out',
      ],
      answerIndex: 0,
      explanation:
        'Without the terminal electron acceptor, carriers remain reduced and electron flow stalls.',
      variant: 1,
    },
  ],
};

export const studySets = [biologyDemo];

export function buildLap(set: StudySet, lap: number): StudyQuestion[] {
  const concepts = new Map<string, StudyQuestion[]>();

  for (const question of set.questions) {
    const group = concepts.get(question.conceptId) ?? [];
    group.push(question);
    concepts.set(question.conceptId, group);
  }

  return Array.from(concepts.values()).map((variants) => {
    const ordered = [...variants].sort((a, b) => a.variant - b.variant);
    return ordered[lap % ordered.length];
  });
}
