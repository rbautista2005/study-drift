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
  subject?: string;
  description: string;
  questionsPerLap?: number;
  questions: StudyQuestion[];
};

export type StudySessionConfig = {
  conceptCount: number;
  questionCount: number;
  variantCount: 2 | 3;
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

type QuestionDraft = Pick<
  StudyQuestion,
  'prompt' | 'choices' | 'answerIndex' | 'explanation'
>;

type ConceptDraft = {
  id: string;
  topic: string;
  difficulty: Difficulty;
  questions: QuestionDraft[];
};

function question(
  prompt: string,
  choices: StudyQuestion['choices'],
  answerIndex: number,
  explanation: string,
): QuestionDraft {
  return { prompt, choices, answerIndex, explanation };
}

function createStudySet(
  details: Omit<StudySet, 'questions'>,
  concepts: ConceptDraft[],
): StudySet {
  return {
    ...details,
    questions: concepts.flatMap((concept) =>
      concept.questions.map((draft, variant) => ({
        ...draft,
        id: `${concept.id}-${variant + 1}`,
        conceptId: concept.id,
        topic: concept.topic,
        difficulty: concept.difficulty,
        variant,
      })),
    ),
  };
}

const geneticsFoundations = createStudySet(
  {
    id: 'genetics-foundations',
    version: 'biology-genetics-v1',
    title: 'Genetics Foundations',
    course: 'BIO 102',
    description: 'Inheritance, DNA, and the language of traits.',
  },
  [
    { id: 'allele', topic: 'Inheritance', difficulty: 1, questions: [
      question('What is an allele?', ['A version of a gene', 'A whole chromosome', 'A protein factory', 'A cell division stage'], 0, 'Alleles are alternative versions of the same gene.'),
      question('Brown-eye and blue-eye forms of a gene are examples of what?', ['Alleles', 'Gametes', 'Codons', 'Tissues'], 0, 'Different forms of one gene are alleles.'),
    ] },
    { id: 'genotype', topic: 'Inheritance', difficulty: 1, questions: [
      question('Which term describes an organism’s allele combination?', ['Genotype', 'Phenotype', 'Mutation', 'Karyotype'], 0, 'Genotype refers to the alleles an organism carries.'),
      question('The notation Bb describes a plant’s what?', ['Genotype', 'Observable trait', 'Chromosome number', 'Protein shape'], 0, 'Letter pairs represent the alleles in a genotype.'),
    ] },
    { id: 'phenotype', topic: 'Inheritance', difficulty: 1, questions: [
      question('What is a phenotype?', ['An observable trait', 'A DNA sequence only', 'A pair of chromosomes', 'A type of cell'], 0, 'A phenotype is the observable expression of traits.'),
      question('Purple flowers in a pea plant are its what?', ['Phenotype', 'Genotype', 'Gamete', 'Allele pair'], 0, 'Flower color is an observable characteristic.'),
    ] },
    { id: 'meiosis', topic: 'Cell division', difficulty: 2, questions: [
      question('What is the main result of meiosis?', ['Four haploid cells', 'Two identical diploid cells', 'One protein molecule', 'A copied chromosome only'], 0, 'Meiosis produces four cells with half the usual chromosome number.'),
      question('Why does meiosis reduce chromosome number?', ['So gametes can combine at fertilization', 'So cells can make ATP', 'To duplicate DNA twice', 'To prevent protein synthesis'], 0, 'Halving in gametes lets fertilization restore the species chromosome number.'),
    ] },
    { id: 'dna-base-pairing', topic: 'DNA structure', difficulty: 2, questions: [
      question('Which base pairs with adenine in DNA?', ['Thymine', 'Cytosine', 'Guanine', 'Uracil'], 0, 'In DNA, adenine pairs with thymine.'),
      question('A DNA strand contains C. Its complementary partner is which base?', ['Guanine', 'Adenine', 'Thymine', 'Uracil'], 0, 'Cytosine and guanine form a complementary base pair.'),
    ] },
    { id: 'mutation', topic: 'DNA structure', difficulty: 3, questions: [
      question('What is a mutation?', ['A change in DNA sequence', 'A guaranteed harmful trait', 'A duplicated cell', 'A type of allele pair'], 0, 'A mutation is any change in nucleotide sequence; effects can vary.'),
      question('Why can a DNA mutation have no visible effect?', ['Some changes do not alter protein function', 'DNA never affects traits', 'All mutations are repaired', 'Mutations only occur in gametes'], 0, 'Because of redundancy or location, some sequence changes do not change function.'),
    ] },
  ],
);

const dataStructures = createStudySet(
  {
    id: 'data-structures', version: 'cs-data-structures-v1', title: 'Data Structures', course: 'CS 201', description: 'Choose the right structure for fast, clear programs.',
  },
  [
    { id: 'array-access', topic: 'Arrays', difficulty: 1, questions: [
      question('What is the typical time complexity of accessing an array item by index?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 0, 'Arrays support direct indexing.'), question('Why is arr[7] usually fast to retrieve?', ['Its address is calculated directly', 'The array is always sorted', 'It searches every item', 'It uses recursion'], 0, 'An index maps directly to an array offset.'), question('Which operation is an array especially good at?', ['Reading a known index', 'Inserting at the front', 'Finding an unsorted value', 'Removing every duplicate'], 0, 'Random access is the core strength of arrays.'), question('A program needs the fifth score repeatedly. Which structure offers direct lookup?', ['An array', 'A queue only', 'A stack only', 'A linked list only'], 0, 'Arrays provide constant-time indexed access.'),
    ] },
    { id: 'stack-lifo', topic: 'Stacks', difficulty: 1, questions: [
      question('A stack follows which ordering rule?', ['Last in, first out', 'First in, first out', 'Random order', 'Sorted order'], 0, 'The newest item is removed first from a stack.'), question('Which real-world object models a stack?', ['A pile of plates', 'A checkout line', 'A phone book', 'A calendar'], 0, 'The top plate is removed first.'), question('What operation adds an item to a stack?', ['Push', 'Dequeue', 'Traverse', 'Hash'], 0, 'Push places a new item on the top.'), question('Which operation removes the most recent stack item?', ['Pop', 'Enqueue', 'Append', 'Merge'], 0, 'Pop removes the item at the top.'),
    ] },
    { id: 'queue-fifo', topic: 'Queues', difficulty: 1, questions: [
      question('A queue follows which ordering rule?', ['First in, first out', 'Last in, first out', 'Random order', 'Reverse sorted order'], 0, 'The earliest arrival leaves a queue first.'), question('Which scenario best fits a queue?', ['Print jobs waiting their turn', 'Undo history', 'Nested function calls', 'A binary search'], 0, 'Queued jobs are normally processed in arrival order.'), question('What operation adds an item to a queue?', ['Enqueue', 'Pop', 'Peek only', 'Binary search'], 0, 'Enqueue adds an item at the rear.'), question('What does dequeue do?', ['Removes the front item', 'Adds to the front', 'Sorts the queue', 'Duplicates each item'], 0, 'Dequeue removes the oldest waiting item.'),
    ] },
    { id: 'hash-lookup', topic: 'Hash tables', difficulty: 2, questions: [
      question('What does a hash table use to find a value by key?', ['A hash function', 'Only a sorted list', 'A recursive call', 'A stack pointer'], 0, 'A hash function maps a key to a storage location.'), question('What is a hash collision?', ['Two keys map to the same location', 'A key is deleted', 'A list is sorted', 'A stack is empty'], 0, 'Collisions occur when different keys receive the same hash location.'), question('What is the typical average lookup time in a well-designed hash table?', ['O(1)', 'O(n)', 'O(n²)', 'O(2ⁿ)'], 0, 'Hashing typically supports constant-time average lookup.'), question('Which task is a hash table well suited for?', ['Looking up a user by ID', 'Maintaining sorted order', 'Undoing actions in reverse', 'Visiting nodes level by level'], 0, 'Key-to-value lookup is a hash table’s central use.'),
    ] },
    { id: 'binary-search', topic: 'Searching', difficulty: 2, questions: [
      question('What must be true before binary search is used?', ['The data is sorted', 'The data is a stack', 'Every value is unique', 'The list has an odd length'], 0, 'Binary search relies on sorted order to discard half the range.'), question('Binary search reduces the remaining search range by about what factor each step?', ['One half', 'One tenth', 'Nothing', 'Two extra items'], 0, 'Each comparison eliminates roughly half the candidates.'), question('What is binary search’s time complexity?', ['O(log n)', 'O(1)', 'O(n)', 'O(n²)'], 0, 'Repeated halving produces logarithmic time.'), question('Why can’t ordinary binary search work reliably on an unsorted list?', ['Comparison gives no direction to discard half', 'Indexes do not exist', 'Lists cannot contain numbers', 'It requires duplicate values'], 0, 'Without order, a midpoint comparison cannot rule out either side.'),
    ] },
    { id: 'tree-traversal', topic: 'Trees', difficulty: 3, questions: [
      question('Which traversal visits left subtree, node, then right subtree?', ['In-order', 'Pre-order', 'Post-order', 'Breadth-first only'], 0, 'In-order traversal follows left, node, right.'), question('For a binary search tree, what does an in-order traversal produce?', ['Values in sorted order', 'Values in reverse insertion order', 'Only leaf values', 'A hash table'], 0, 'BST ordering makes in-order output sorted.'), question('What is the root of a tree?', ['The topmost node', 'Any leaf node', 'The last inserted value', 'A duplicate key'], 0, 'The root is the starting node with no parent.'), question('What is a leaf node?', ['A node with no children', 'A node with two parents', 'The root only', 'A sorted array'], 0, 'Leaves have no child nodes.'),
    ] },
  ],
);

const calculusDerivatives = createStudySet(
  { id: 'calculus-derivatives', version: 'calc-derivatives-v1', title: 'Derivative Essentials', course: 'MATH 151', description: 'Rates of change, tangent lines, and core derivative rules.' },
  [
    { id: 'derivative-meaning', topic: 'Rates of change', difficulty: 1, questions: [question('What does a derivative represent at a point?', ['Instantaneous rate of change', 'Total area only', 'A constant average', 'The x-intercept'], 0, 'A derivative measures how a quantity is changing at that instant.'), question('On a graph, f′(a) is the slope of what?', ['The tangent line at x = a', 'The y-axis', 'A secant through all points', 'The area under the curve'], 0, 'Derivative value equals tangent-line slope.'),] },
    { id: 'power-rule', topic: 'Rules', difficulty: 1, questions: [question('What is the derivative of x⁵?', ['5x⁴', 'x⁴', '5x⁵', 'x⁶'], 0, 'The power rule multiplies by the exponent and lowers it by one.'), question('What is d/dx of 7x³?', ['21x²', '7x²', '21x³', '7x⁴'], 0, 'Keep the coefficient and apply the power rule.'),] },
    { id: 'constant-rule', topic: 'Rules', difficulty: 1, questions: [question('What is the derivative of the constant 12?', ['0', '1', '12', 'x'], 0, 'A constant has no rate of change.'), question('Why is d/dx of a constant zero?', ['Its value does not change as x changes', 'Constants are undefined', 'It has an infinite slope', 'It is always negative'], 0, 'No change in output gives a zero rate of change.'),] },
    { id: 'product-rule', topic: 'Rules', difficulty: 2, questions: [question('Which expression is the product rule for f(x)g(x)?', ["f′g + fg′", "f′g′", 'f + g', 'f′/g′'], 0, 'Differentiate one factor at a time while keeping the other.'), question('When differentiating x²sin x, which rule is needed?', ['Product rule', 'Power rule only', 'Constant rule only', 'Inverse rule'], 0, 'It is a product of two functions that both vary.'),] },
    { id: 'chain-rule', topic: 'Rules', difficulty: 2, questions: [question('When is the chain rule used?', ['For a function inside another function', 'For adding constants', 'For sorting data', 'For finding roots only'], 0, 'The chain rule handles composition.'), question('What is d/dx of (3x + 1)²?', ['6(3x + 1)', '2(3x + 1)', '6x', '3x + 1'], 0, 'Differentiate the outer square, then multiply by inner derivative 3.'),] },
    { id: 'critical-point', topic: 'Applications', difficulty: 3, questions: [question('Where can a differentiable function have a local maximum or minimum?', ['Where f′(x) = 0', 'Only where f(x) = 0', 'Only at x = 0', 'Where f′ is always positive'], 0, 'Interior extrema of differentiable functions occur at critical points.'), question('What is a critical point?', ['A point where f′ is zero or undefined', 'Every point on a line', 'Only an x-intercept', 'A point with y = 0'], 0, 'Critical points are candidates for local extrema.'),] },
  ],
);

const chemicalBonding = createStudySet(
  { id: 'chemical-bonding', version: 'chem-bonding-v1', title: 'Chemical Bonding', course: 'CHEM 101', description: 'How atoms share, transfer, and organize electrons.' },
  [
    { id: 'ionic-bond', topic: 'Bond types', difficulty: 1, questions: [question('An ionic bond forms primarily through what?', ['Electron transfer', 'Equal electron sharing', 'Neutron exchange', 'Proton loss only'], 0, 'Ionic bonding follows electron transfer and attraction of oppositely charged ions.'), question('Which pair is most likely to form an ionic bond?', ['A metal and a nonmetal', 'Two noble gases', 'Two identical nonmetals only', 'Two neutrons'], 0, 'Metals tend to lose and nonmetals tend to gain electrons.'),] },
    { id: 'covalent-bond', topic: 'Bond types', difficulty: 1, questions: [question('A covalent bond involves what?', ['Sharing electrons', 'Transferring neutrons', 'Destroying atoms', 'Adding protons'], 0, 'Covalent bonds result from shared electron pairs.'), question('What type of bond holds the atoms in H₂O together?', ['Covalent', 'Ionic only', 'Metallic', 'Nuclear'], 0, 'Hydrogen and oxygen share electrons in water.'),] },
    { id: 'electronegativity', topic: 'Polarity', difficulty: 2, questions: [question('What does electronegativity describe?', ['An atom’s pull on shared electrons', 'Its number of neutrons', 'Its melting point only', 'Its mass number'], 0, 'Electronegativity measures attraction for bonding electrons.'), question('A large electronegativity difference usually makes a bond more what?', ['Polar', 'Neutral', 'Radioactive', 'Metallic'], 0, 'Unequal electron pull creates bond polarity.'),] },
    { id: 'polarity-water', topic: 'Polarity', difficulty: 2, questions: [question('Why is water a polar molecule?', ['Its bonds and bent shape create uneven charge', 'It contains only one element', 'It has no electrons', 'It is always frozen'], 0, 'Polar O–H bonds do not cancel in water’s bent geometry.'), question('Which end of a water molecule is partially negative?', ['The oxygen end', 'The hydrogen end', 'Both equally', 'Neither end'], 0, 'Oxygen attracts shared electrons more strongly.'),] },
    { id: 'metallic-bond', topic: 'Bond types', difficulty: 2, questions: [question('Why do metals conduct electricity well?', ['Their electrons are mobile through the lattice', 'They have no atoms', 'They contain only ions with no charge', 'Their protons move freely'], 0, 'Delocalized electrons can carry charge through a metal.'), question('Metallic bonding is often described as metal ions in a sea of what?', ['Delocalized electrons', 'Neutrons', 'Water molecules', 'Covalent chains'], 0, 'Valence electrons are shared across the metal lattice.'),] },
    { id: 'intermolecular', topic: 'Forces', difficulty: 3, questions: [question('What is a hydrogen bond?', ['Attraction involving H bonded to N, O, or F', 'A covalent bond between all hydrogens', 'A nuclear force', 'An ionic bond in every molecule'], 0, 'Hydrogen bonding is a strong intermolecular attraction in specific polar molecules.'), question('Which property of water is strongly supported by hydrogen bonding?', ['High surface tension', 'No boiling point', 'Electrical neutrality of protons', 'Metallic luster'], 0, 'Hydrogen bonds create strong cohesion at water’s surface.'),] },
  ],
);

const worldHistory = createStudySet(
  { id: 'world-history-trade', version: 'history-trade-v1', title: 'Global Trade & Exchange', course: 'HIST 110', description: 'Routes, empires, and ideas moving across the world.' },
  [
    { id: 'silk-road', topic: 'Trade networks', difficulty: 1, questions: [question('The Silk Roads connected East Asia most directly with which region?', ['The Mediterranean and Southwest Asia', 'Antarctica only', 'Australia only', 'The Arctic only'], 0, 'Silk Road networks linked East Asia through Central Asia to western markets.'), question('Besides goods, the Silk Roads helped spread what?', ['Ideas, religions, and diseases', 'Only silk', 'No cultural practices', 'Only coins'], 0, 'Trade routes move people and culture as well as products.'),] },
    { id: 'indian-ocean', topic: 'Trade networks', difficulty: 1, questions: [question('What helped sailors navigate Indian Ocean trade routes?', ['Seasonal monsoon winds', 'Railroads', 'Glacier roads', 'Air travel'], 0, 'Predictable monsoons supported regular sailing patterns.'), question('Indian Ocean trade connected East Africa, the Middle East, South Asia, and what?', ['Southeast Asia and China', 'Only northern Europe', 'Antarctica', 'No coastal regions'], 0, 'The network linked major ports across these regions.'),] },
    { id: 'columbian-exchange', topic: 'Exchange', difficulty: 2, questions: [question('What was the Columbian Exchange?', ['Transfer of organisms and goods between hemispheres', 'A single peace treaty', 'A European banking system', 'A type of ship'], 0, 'After 1492, crops, animals, people, and diseases moved between hemispheres.'), question('Which crop moved from the Americas to Europe during the Columbian Exchange?', ['Potato', 'Wheat', 'Rice', 'Olive'], 0, 'Potatoes originated in the Americas and spread eastward.'),] },
    { id: 'mercantilism', topic: 'Empires', difficulty: 2, questions: [question('Mercantilism encouraged colonies to do what for the mother country?', ['Supply raw materials and buy finished goods', 'Trade freely with every rival', 'Avoid all exports', 'Create no wealth'], 0, 'Mercantilist policies directed colonial trade to enrich the home state.'), question('What was a major goal of mercantilist governments?', ['Accumulate wealth and a favorable trade balance', 'Eliminate all commerce', 'End overseas travel', 'Give colonies equal political power'], 0, 'States sought exports, bullion, and controlled trade.'),] },
    { id: 'industrialization', topic: 'Industrial change', difficulty: 2, questions: [question('Which change was central to the Industrial Revolution?', ['Machine-based factory production', 'A return to hunting and gathering', 'The end of urbanization', 'No use of energy'], 0, 'Factories and machinery reshaped production.'), question('Why did many people move to cities during industrialization?', ['Factory jobs were concentrated there', 'Farms disappeared instantly', 'Cities banned work', 'Ocean trade ended'], 0, 'Urban factories drew workers seeking wages.'),] },
    { id: 'nationalism', topic: 'Ideas', difficulty: 3, questions: [question('What is nationalism?', ['Strong identification with a shared nation', 'A system of no government', 'Trade by sea only', 'Rule by religious leaders only'], 0, 'Nationalism emphasizes loyalty to a nation and shared identity.'), question('How could nationalism affect multiethnic empires?', ['It could fuel independence movements', 'It guaranteed stability', 'It ended all conflicts', 'It removed borders immediately'], 0, 'National groups often sought autonomy or nation-states.'),] },
  ],
);

const psychologyLearning = createStudySet(
  { id: 'psychology-learning', version: 'psych-learning-v1', title: 'Learning & Memory', course: 'PSY 101', description: 'Conditioning, reinforcement, and how memories take shape.' },
  [
    { id: 'classical-conditioning', topic: 'Conditioning', difficulty: 1, questions: [question('Classical conditioning links what?', ['Two stimuli', 'A behavior and its consequence', 'Two memories only', 'A gene and a trait'], 0, 'Classical conditioning forms an association between stimuli.'), question('In Pavlov’s experiment, the bell became a what after pairing with food?', ['Conditioned stimulus', 'Unconditioned response', 'Punishment', 'Primary reinforcer'], 0, 'The bell gained the ability to trigger a learned response.'),] },
    { id: 'operant-conditioning', topic: 'Conditioning', difficulty: 1, questions: [question('Operant conditioning focuses on what?', ['Consequences of behavior', 'Pairing two neutral stimuli only', 'DNA replication', 'Sleep stages only'], 0, 'Behavior becomes more or less likely based on its consequences.'), question('A student studies more because praise follows good work. This is what?', ['Positive reinforcement', 'Positive punishment', 'Extinction', 'Classical conditioning only'], 0, 'Adding praise to increase studying is positive reinforcement.'),] },
    { id: 'negative-reinforcement', topic: 'Conditioning', difficulty: 2, questions: [question('Negative reinforcement increases behavior by doing what?', ['Removing an unpleasant stimulus', 'Adding an unpleasant stimulus', 'Ignoring every behavior', 'Giving a reward randomly'], 0, 'It strengthens behavior through removal, not punishment.'), question('Buckling a seatbelt to stop a loud alarm is an example of what?', ['Negative reinforcement', 'Positive punishment', 'Extinction', 'Observational learning'], 0, 'The behavior increases because it removes an aversive sound.'),] },
    { id: 'working-memory', topic: 'Memory', difficulty: 2, questions: [question('What is working memory used for?', ['Holding and manipulating current information', 'Storing every lifelong memory permanently', 'Controlling reflexes only', 'Producing hormones'], 0, 'Working memory is the limited mental workspace for active tasks.'), question('Keeping a phone number in mind while dialing uses what?', ['Working memory', 'Procedural memory only', 'Sensory adaptation', 'Classical conditioning'], 0, 'You temporarily hold information while using it.'),] },
    { id: 'long-term-memory', topic: 'Memory', difficulty: 2, questions: [question('Which memory system stores information over long periods?', ['Long-term memory', 'Sensory memory only', 'Working memory only', 'Echoic memory only'], 0, 'Long-term memory preserves information beyond the brief active span.'), question('Knowing how to ride a bicycle is largely what kind of long-term memory?', ['Procedural memory', 'Iconic memory', 'Short-term sensory memory', 'A conditioned stimulus'], 0, 'Skills and habits are stored as procedural memory.'),] },
    { id: 'retrieval-practice', topic: 'Study strategies', difficulty: 3, questions: [question('Why is retrieval practice an effective study strategy?', ['Recalling strengthens access to learning', 'It avoids all effort', 'It replaces sleep', 'It guarantees no mistakes'], 0, 'Actively recalling information improves later retrieval.'), question('Which study activity is retrieval practice?', ['Answering a question without notes', 'Highlighting every sentence', 'Rereading once passively', 'Organizing a desk'], 0, 'Testing yourself requires pulling information from memory.'),] },
  ],
);

type Term = { term: string; definition: string; difficulty?: Difficulty };

function createTermStudySet(
  details: Omit<StudySet, 'questions'> & { questionsPerLap: number },
  variants: 3 | 5,
  terms: Term[],
): StudySet {
  return createStudySet(
    details,
    terms.map(({ term, definition, difficulty = 2 }, index) => {
      const definitions = terms.map((item) => item.definition);
      const choices = (variant: number): StudyQuestion['choices'] => {
        const answerIndex = variant % 4;
        const distractors = definitions
          .filter((item) => item !== definition)
          .slice(index % (definitions.length - 3), index % (definitions.length - 3) + 3);
        const values = [...distractors];
        values.splice(answerIndex, 0, definition);
        return values as StudyQuestion['choices'];
      };
      const prompts = [
        `What best describes ${term}?`,
        `Choose the definition of ${term}.`,
        `${term} refers to which idea?`,
        `Which statement is accurate about ${term}?`,
        `In this course, what does ${term} mean?`,
      ];
      return {
        id: `term-${index + 1}`,
        topic: term,
        difficulty,
        questions: Array.from({ length: Math.min(2, variants) }, (_, variant) =>
          question(
            prompts[variant],
            choices(variant),
            variant % 4,
            `${term}: ${definition}`,
          ),
        ),
      };
    }),
  );
}

const expandedStudySets = [
  createTermStudySet({ id: 'programming-basics', version: 'cs-101-v1', title: 'Programming Basics', course: 'CS 101', subject: 'Computer Science', description: 'Variables, control flow, and program design.', questionsPerLap: 8 }, 3, [
    { term: 'Variable', definition: 'A named storage location whose value can change.', difficulty: 1 }, { term: 'Loop', definition: 'A control structure that repeats instructions.', difficulty: 1 }, { term: 'Function', definition: 'A reusable named block of code that performs a task.', difficulty: 1 }, { term: 'Boolean', definition: 'A value that is either true or false.', difficulty: 1 }, { term: 'Parameter', definition: 'An input named in a function definition.', difficulty: 2 }, { term: 'Debugging', definition: 'Finding and correcting defects in a program.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'algorithms-analysis', version: 'cs-301-v1', title: 'Algorithms & Analysis', course: 'CS 301', subject: 'Computer Science', description: 'Efficiency, correctness, and problem-solving strategies.', questionsPerLap: 9 }, 5, [
    { term: 'Big O notation', definition: 'A notation describing an algorithm’s growth rate as input size increases.' }, { term: 'Greedy algorithm', definition: 'An approach that makes the best local choice at each step.' }, { term: 'Dynamic programming', definition: 'A method that stores solutions to overlapping subproblems.' }, { term: 'Recurrence', definition: 'An equation defining a problem in terms of smaller instances.' }, { term: 'Invariant', definition: 'A condition that remains true throughout an algorithm.' }, { term: 'Divide and conquer', definition: 'A strategy that splits a problem, solves parts, and combines results.', difficulty: 3 },
  ]),
  createTermStudySet({ id: 'database-systems', version: 'cs-320-v1', title: 'Database Systems', course: 'CS 320', subject: 'Computer Science', description: 'Model data, query it, and preserve its integrity.', questionsPerLap: 7 }, 3, [
    { term: 'Primary key', definition: 'A field or fields that uniquely identify a table row.' }, { term: 'Foreign key', definition: 'A field that references a key in another table.' }, { term: 'Normalization', definition: 'Organizing tables to reduce redundancy and update anomalies.' }, { term: 'SQL', definition: 'A language for defining and querying relational data.' }, { term: 'Index', definition: 'A data structure that speeds data retrieval.' }, { term: 'Transaction', definition: 'A group of operations treated as one unit of work.', difficulty: 3 },
  ]),
  createTermStudySet({ id: 'operating-systems', version: 'cs-350-v1', title: 'Operating Systems', course: 'CS 350', subject: 'Computer Science', description: 'Processes, memory, files, and concurrency.', questionsPerLap: 10 }, 5, [
    { term: 'Process', definition: 'A program that is currently executing.' }, { term: 'Thread', definition: 'A lightweight execution path within a process.' }, { term: 'Virtual memory', definition: 'An abstraction that gives programs the appearance of large private memory.' }, { term: 'Deadlock', definition: 'A state where processes wait indefinitely for resources held by each other.' }, { term: 'Scheduler', definition: 'The operating-system component that selects work for the CPU.' }, { term: 'Mutex', definition: 'A lock that allows only one thread at a time into a critical section.', difficulty: 3 },
  ]),
  createTermStudySet({ id: 'computer-networks', version: 'cs-360-v1', title: 'Computer Networks', course: 'CS 360', subject: 'Computer Science', description: 'How data moves reliably across connected systems.', questionsPerLap: 8 }, 3, [
    { term: 'IP address', definition: 'A logical network address used to route packets.' }, { term: 'TCP', definition: 'A transport protocol that provides reliable ordered delivery.' }, { term: 'DNS', definition: 'A system that maps domain names to network addresses.' }, { term: 'Router', definition: 'A device that forwards packets between networks.' }, { term: 'Packet', definition: 'A formatted unit of data transmitted over a network.' }, { term: 'Latency', definition: 'The delay between sending data and receiving it.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'linear-algebra', version: 'math-220-v1', title: 'Linear Algebra', course: 'MATH 220', subject: 'Mathematics', description: 'Vectors, matrices, and linear transformations.', questionsPerLap: 7 }, 3, [
    { term: 'Vector', definition: 'An ordered collection of numbers representing magnitude and direction.' }, { term: 'Matrix', definition: 'A rectangular arrangement of numbers.' }, { term: 'Determinant', definition: 'A scalar associated with a square matrix that indicates scaling and invertibility.' }, { term: 'Eigenvector', definition: 'A nonzero vector whose direction is unchanged by a transformation.' }, { term: 'Basis', definition: 'A linearly independent set that spans a vector space.' }, { term: 'Linear transformation', definition: 'A mapping that preserves vector addition and scalar multiplication.', difficulty: 3 },
  ]),
  createTermStudySet({ id: 'probability-statistics', version: 'stat-200-v1', title: 'Probability & Statistics', course: 'STAT 200', subject: 'Mathematics', description: 'Reason from data, uncertainty, and distributions.', questionsPerLap: 9 }, 5, [
    { term: 'Population', definition: 'The complete group a study aims to understand.' }, { term: 'Sample', definition: 'A subset of a population used to collect data.' }, { term: 'Mean', definition: 'The arithmetic average of a set of values.' }, { term: 'Standard deviation', definition: 'A measure of how spread out values are around the mean.' }, { term: 'Confidence interval', definition: 'A range of plausible values for a population parameter.' }, { term: 'P-value', definition: 'The probability of results at least as extreme under a null hypothesis.', difficulty: 3 },
  ]),
  createTermStudySet({ id: 'classical-mechanics', version: 'phys-201-v1', title: 'Classical Mechanics', course: 'PHYS 201', subject: 'Physics', description: 'Forces, motion, energy, and momentum.', questionsPerLap: 8 }, 3, [
    { term: 'Velocity', definition: 'The rate of change of position including direction.' }, { term: 'Acceleration', definition: 'The rate of change of velocity.' }, { term: 'Net force', definition: 'The vector sum of all forces on an object.' }, { term: 'Momentum', definition: 'The product of mass and velocity.' }, { term: 'Kinetic energy', definition: 'Energy an object has because of its motion.' }, { term: 'Conservation law', definition: 'A principle stating a quantity remains constant in an isolated system.', difficulty: 3 },
  ]),
  createTermStudySet({ id: 'electricity-magnetism', version: 'phys-202-v1', title: 'Electricity & Magnetism', course: 'PHYS 202', subject: 'Physics', description: 'Charges, fields, circuits, and induction.', questionsPerLap: 10 }, 5, [
    { term: 'Electric field', definition: 'A region where a charge experiences an electric force.' }, { term: 'Voltage', definition: 'Electric potential energy per unit charge.' }, { term: 'Current', definition: 'The rate of flow of electric charge.' }, { term: 'Resistance', definition: 'Opposition to electric current in a circuit.' }, { term: 'Magnetic field', definition: 'A field that exerts force on moving charges and magnetic materials.' }, { term: 'Induction', definition: 'Production of voltage by a changing magnetic field.', difficulty: 3 },
  ]),
  createTermStudySet({ id: 'organic-chemistry', version: 'chem-301-v1', title: 'Organic Chemistry', course: 'CHEM 301', subject: 'Chemistry', description: 'Structure and reactivity of carbon compounds.', questionsPerLap: 8 }, 3, [
    { term: 'Functional group', definition: 'A specific atom group that gives a molecule characteristic reactions.' }, { term: 'Isomer', definition: 'A compound sharing a formula but differing in structure.' }, { term: 'Nucleophile', definition: 'An electron-pair donor that forms a bond.' }, { term: 'Electrophile', definition: 'An electron-pair acceptor that forms a bond.' }, { term: 'Stereochemistry', definition: 'The three-dimensional arrangement of atoms in molecules.' }, { term: 'Resonance', definition: 'Delocalization represented by multiple valid electron structures.', difficulty: 3 },
  ]),
  createTermStudySet({ id: 'human-anatomy', version: 'bio-210-v1', title: 'Human Anatomy', course: 'BIO 210', subject: 'Biology & Health', description: 'Structures that support the human body.', questionsPerLap: 7 }, 3, [
    { term: 'Homeostasis', definition: 'Maintenance of stable internal conditions.' }, { term: 'Tissue', definition: 'A group of similar cells performing a common function.' }, { term: 'Neuron', definition: 'A cell specialized to transmit nervous signals.' }, { term: 'Alveoli', definition: 'Tiny lung sacs where gas exchange occurs.' }, { term: 'Artery', definition: 'A vessel carrying blood away from the heart.' }, { term: 'Synapse', definition: 'A junction where one neuron communicates with another.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'ecology', version: 'bio-330-v1', title: 'Ecology', course: 'BIO 330', subject: 'Biology & Health', description: 'Organisms, populations, and environmental systems.', questionsPerLap: 9 }, 5, [
    { term: 'Population', definition: 'Members of one species living in the same area.' }, { term: 'Community', definition: 'All interacting populations in an area.' }, { term: 'Ecosystem', definition: 'A community plus its physical environment.' }, { term: 'Carrying capacity', definition: 'The largest population an environment can sustain over time.' }, { term: 'Trophic level', definition: 'A feeding position in an ecosystem.' }, { term: 'Biodiversity', definition: 'The variety of life in a place or system.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'microeconomics', version: 'econ-101-v1', title: 'Microeconomics', course: 'ECON 101', subject: 'Economics & Business', description: 'Choices, markets, incentives, and prices.', questionsPerLap: 8 }, 3, [
    { term: 'Opportunity cost', definition: 'The value of the next best alternative forgone.' }, { term: 'Demand', definition: 'The quantities consumers are willing and able to buy at prices.' }, { term: 'Supply', definition: 'The quantities producers are willing and able to sell at prices.' }, { term: 'Equilibrium', definition: 'The price and quantity where supply and demand meet.' }, { term: 'Elasticity', definition: 'How responsive one variable is to a change in another.' }, { term: 'Marginal cost', definition: 'The added cost of producing one more unit.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'macroeconomics', version: 'econ-202-v1', title: 'Macroeconomics', course: 'ECON 202', subject: 'Economics & Business', description: 'Growth, inflation, employment, and policy.', questionsPerLap: 10 }, 5, [
    { term: 'GDP', definition: 'The market value of final goods and services produced in an economy.' }, { term: 'Inflation', definition: 'A sustained rise in the general price level.' }, { term: 'Unemployment rate', definition: 'The share of the labor force without work and seeking it.' }, { term: 'Fiscal policy', definition: 'Government taxation and spending used to affect the economy.' }, { term: 'Monetary policy', definition: 'Central-bank actions that influence money and credit.' }, { term: 'Recession', definition: 'A significant broad decline in economic activity.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'sociology', version: 'soc-101-v1', title: 'Introduction to Sociology', course: 'SOC 101', subject: 'Social Sciences', description: 'Groups, institutions, and the patterns of social life.', questionsPerLap: 7 }, 3, [
    { term: 'Culture', definition: 'Shared beliefs, practices, symbols, and values of a group.' }, { term: 'Socialization', definition: 'The lifelong process of learning social norms and roles.' }, { term: 'Norm', definition: 'A shared expectation for behavior.' }, { term: 'Institution', definition: 'An organized system meeting major social needs.' }, { term: 'Stratification', definition: 'Structured inequality among social groups.' }, { term: 'Social mobility', definition: 'Movement between positions in a social hierarchy.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'political-science', version: 'pols-210-v1', title: 'Political Science', course: 'POLS 210', subject: 'Social Sciences', description: 'Institutions, power, representation, and law.', questionsPerLap: 8 }, 3, [
    { term: 'Constitution', definition: 'A foundational framework for government and political authority.' }, { term: 'Federalism', definition: 'A system dividing power between national and regional governments.' }, { term: 'Separation of powers', definition: 'Division of government functions among branches.' }, { term: 'Judicial review', definition: 'Court authority to evaluate laws against a constitution.' }, { term: 'Public policy', definition: 'A course of action adopted by government.' }, { term: 'Civil liberties', definition: 'Basic freedoms protected from government interference.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'academic-writing', version: 'engl-101-v1', title: 'Academic Writing', course: 'ENGL 101', subject: 'Languages & Humanities', description: 'Build clear arguments from evidence and revision.', questionsPerLap: 8 }, 3, [
    { term: 'Thesis', definition: 'A focused claim that guides an essay’s argument.' }, { term: 'Topic sentence', definition: 'A sentence stating the main idea of a paragraph.' }, { term: 'Evidence', definition: 'Information used to support a claim.' }, { term: 'Counterargument', definition: 'A reasonable opposing view addressed by an argument.' }, { term: 'Citation', definition: 'Acknowledgment of a source used in writing.' }, { term: 'Revision', definition: 'Substantive rethinking and improvement of a draft.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'spanish-foundations', version: 'span-101-v1', title: 'Spanish Foundations', course: 'SPAN 101', subject: 'Languages & Humanities', description: 'Core grammar and everyday communication.', questionsPerLap: 7 }, 3, [
    { term: 'Sustantivo', definition: 'A noun: a word naming a person, place, thing, or idea.' }, { term: 'Verbo', definition: 'A verb: a word expressing an action or state.' }, { term: 'Adjetivo', definition: 'An adjective: a word that describes a noun.' }, { term: 'Conjugación', definition: 'A change in a verb form for person, number, tense, or mood.' }, { term: 'Género', definition: 'A grammatical category such as masculine or feminine.' }, { term: 'Artículo', definition: 'A word used with a noun, such as el, la, un, or una.', difficulty: 1 },
  ]),
  createTermStudySet({ id: 'art-history', version: 'arth-200-v1', title: 'Art History Survey', course: 'ARTH 200', subject: 'Arts & Design', description: 'Analyze form, context, and visual meaning.', questionsPerLap: 9 }, 5, [
    { term: 'Composition', definition: 'The arrangement of visual elements in an artwork.' }, { term: 'Medium', definition: 'The material used to create an artwork.' }, { term: 'Perspective', definition: 'A technique for suggesting depth on a flat surface.' }, { term: 'Iconography', definition: 'The symbols and subject matter used in visual art.' }, { term: 'Patronage', definition: 'Financial or institutional support for artists and art.' }, { term: 'Context', definition: 'The historical, cultural, and social circumstances surrounding art.', difficulty: 2 },
  ]),
  createTermStudySet({ id: 'ethics', version: 'phil-310-v1', title: 'Ethics & Moral Reasoning', course: 'PHIL 310', subject: 'Languages & Humanities', description: 'Frameworks for evaluating choices and obligations.', questionsPerLap: 10 }, 5, [
    { term: 'Utilitarianism', definition: 'An ethical view favoring actions that maximize overall well-being.' }, { term: 'Deontology', definition: 'An ethical view emphasizing duties, rules, and rights.' }, { term: 'Virtue ethics', definition: 'An ethical view focused on character and human flourishing.' }, { term: 'Autonomy', definition: 'The capacity to make informed, self-directed choices.' }, { term: 'Justice', definition: 'Fair treatment and distribution of benefits and burdens.' }, { term: 'Moral dilemma', definition: 'A situation where important ethical reasons conflict.', difficulty: 3 },
  ]),
];

function subjectFor(set: StudySet) {
  if (set.subject) return set.subject;
  if (set.course.startsWith('BIO')) return 'Biology & Health';
  if (set.course.startsWith('CS')) return 'Computer Science';
  if (set.course.startsWith('MATH')) return 'Mathematics';
  if (set.course.startsWith('CHEM')) return 'Chemistry';
  if (set.course.startsWith('HIST')) return 'History';
  if (set.course.startsWith('PSY')) return 'Social Sciences';
  return 'Other subjects';
}

type SupplementalFact = { term: string; definition: string };

const supplementalFacts: Record<string, SupplementalFact[]> = {
  'Biology & Health': [
    ['Cell membrane', 'A selectively permeable boundary surrounding a cell'], ['Ribosome', 'A cellular structure that builds proteins'], ['Enzyme', 'A protein that speeds a chemical reaction'], ['Osmosis', 'Diffusion of water across a selectively permeable membrane'], ['Mitosis', 'Cell division producing two genetically identical cells'], ['Chromosome', 'A DNA-protein structure carrying genetic information'], ['Homeostasis', 'Maintenance of stable internal conditions'], ['Immune response', 'The body’s coordinated defense against pathogens'], ['Hormone', 'A chemical messenger carried to target cells'], ['Natural selection', 'Differential survival and reproduction based on inherited traits'], ['Ecological niche', 'A species’ role and resource use in an ecosystem'], ['Photosynthesis', 'Using light energy to make sugars from carbon dioxide and water'], ['ATP', 'The cell’s immediate energy-carrying molecule'], ['Gene expression', 'Using genetic information to produce a functional product'], ['Microbiome', 'The community of microorganisms living in a habitat or host'],
  ].map(([term, definition]) => ({ term, definition })),
  'Computer Science': [
    ['Compiler', 'A program that translates source code into another form'], ['Recursion', 'A method where a function solves a problem by calling itself'], ['API', 'A defined interface through which software components communicate'], ['Object', 'A value that bundles state with related behavior'], ['Unit test', 'An automated check of a small isolated piece of code'], ['Version control', 'A system for tracking and coordinating changes to files'], ['Encryption', 'Transforming data so only authorized parties can read it'], ['Cache', 'Fast storage holding frequently used data'], ['Protocol', 'A shared set of rules for data communication'], ['Concurrency', 'Managing multiple tasks that make progress during overlapping time'], ['Runtime', 'The period or environment in which a program executes'], ['Abstraction', 'Hiding implementation details behind a simpler interface'], ['Load balancer', 'A component that distributes work across computing resources'], ['Garbage collection', 'Automatic recovery of memory no longer in use'], ['Authentication', 'Verifying the identity of a user or system'],
  ].map(([term, definition]) => ({ term, definition })),
  Mathematics: [
    ['Function', 'A rule assigning exactly one output to each allowed input'], ['Limit', 'The value a quantity approaches as an input approaches a point'], ['Integral', 'A mathematical accumulation often interpreted as area'], ['Derivative', 'An instantaneous rate of change'], ['Vector space', 'A set of vectors closed under addition and scalar multiplication'], ['Probability', 'A numerical measure of how likely an event is'], ['Correlation', 'A measure of association between two variables'], ['Hypothesis test', 'A procedure for evaluating evidence against a claim'], ['Random variable', 'A numerical outcome assigned to a random process'], ['Gradient', 'A vector pointing in the direction of greatest increase'], ['Orthogonal', 'Perpendicular in the sense of having zero dot product'], ['Inverse', 'An operation that reverses another operation'], ['Domain', 'The set of allowed inputs to a function'], ['Range', 'The set of outputs a function can produce'], ['Distribution', 'A description of possible values and their frequencies'],
  ].map(([term, definition]) => ({ term, definition })),
  Chemistry: [
    ['Atom', 'The smallest unit of an element that retains its identity'], ['Mole', 'An amount of substance containing Avogadro’s number of entities'], ['Stoichiometry', 'Quantitative relationships among reactants and products'], ['Catalyst', 'A substance that changes reaction rate without being consumed'], ['Oxidation', 'Loss of electrons in a chemical process'], ['Reduction', 'Gain of electrons in a chemical process'], ['Equilibrium', 'A dynamic state where forward and reverse reaction rates match'], ['Acid', 'A species that donates a proton or accepts an electron pair'], ['Base', 'A species that accepts a proton or donates an electron pair'], ['Molarity', 'Moles of solute per liter of solution'], ['Orbital', 'A region of high probability for finding an electron'], ['Reaction rate', 'The speed at which reactants become products'], ['Le Châtelier’s principle', 'A system at equilibrium shifts to oppose a disturbance'], ['Alkane', 'A hydrocarbon containing only single bonds'], ['pH', 'A logarithmic measure of acidity based on hydrogen ion concentration'],
  ].map(([term, definition]) => ({ term, definition })),
  History: [
    ['Primary source', 'Evidence created by someone with direct experience of an event'], ['Secondary source', 'An interpretation that analyzes or explains past events'], ['Imperialism', 'Extending power over other territories or peoples'], ['Revolution', 'A rapid, fundamental change in political or social order'], ['Colonialism', 'Control and settlement of one territory by another power'], ['Diaspora', 'A dispersed population sharing an ancestral homeland'], ['Treaty', 'A formal agreement between states or political groups'], ['Feudalism', 'A medieval system of land-based obligations and hierarchy'], ['Enlightenment', 'An intellectual movement emphasizing reason and individual rights'], ['Decolonization', 'The process by which colonies gain political independence'], ['Propaganda', 'Information designed to influence attitudes for a political cause'], ['Sovereignty', 'Supreme authority within a territory'], ['Migration', 'Movement of people from one place to another'], ['Civilization', 'A complex society with institutions, cities, and cultural systems'], ['Industrial capitalism', 'An economy organized around private ownership and factory production'],
  ].map(([term, definition]) => ({ term, definition })),
  'Social Sciences': [
    ['Social norm', 'A shared expectation for behavior within a group'], ['Bias', 'A systematic tendency that distorts judgment or measurement'], ['Correlation', 'An observed relationship between two variables'], ['Causation', 'A relationship in which one factor produces change in another'], ['Survey', 'A method of gathering information by asking participants questions'], ['Representative sample', 'A sample that reflects important features of a larger population'], ['Social identity', 'The part of self-concept based on group membership'], ['Cognitive dissonance', 'Discomfort caused by conflicting beliefs or behavior'], ['Motivation', 'Processes that initiate and sustain goal-directed behavior'], ['Public opinion', 'Collective attitudes held by a population'], ['Interest group', 'An organized group seeking to influence public policy'], ['Legitimacy', 'Public acceptance of political authority'], ['Social capital', 'Resources available through social relationships and networks'], ['Experiment', 'A study that manipulates a variable to test an effect'], ['Ethnocentrism', 'Judging another culture by the standards of one’s own'],
  ].map(([term, definition]) => ({ term, definition })),
  Physics: [
    ['Work', 'Energy transferred when a force acts through a displacement'], ['Power', 'The rate at which energy is transferred or work is done'], ['Torque', 'A turning effect produced by a force about an axis'], ['Angular momentum', 'Rotational motion quantity related to moment of inertia and angular velocity'], ['Wave', 'A disturbance that transfers energy without net transport of matter'], ['Frequency', 'The number of cycles passing a point per unit time'], ['Wavelength', 'The distance between matching points on successive waves'], ['Refraction', 'Bending of a wave as it enters a different medium'], ['Charge', 'A property of matter causing electric interactions'], ['Capacitance', 'Ability of a system to store electric charge per voltage'], ['Ohm’s law', 'The relationship V = IR for an ideal resistor'], ['Photon', 'A quantum of electromagnetic radiation'], ['Relativity', 'The framework relating space, time, motion, and gravity'], ['Entropy', 'A measure connected to energy dispersal and possible arrangements'], ['Impulse', 'Force applied over time, equal to change in momentum'],
  ].map(([term, definition]) => ({ term, definition })),
  'Economics & Business': [
    ['Scarcity', 'The condition of limited resources relative to wants'], ['Comparative advantage', 'Ability to produce at lower opportunity cost'], ['Market structure', 'The competitive organization of buyers and sellers'], ['Externality', 'A cost or benefit affecting people outside a transaction'], ['Productivity', 'Output produced per unit of input'], ['Interest rate', 'The price paid for borrowing money'], ['Exchange rate', 'The value of one currency in terms of another'], ['Aggregate demand', 'Total planned spending on domestic output'], ['Aggregate supply', 'Total output firms are willing to produce at price levels'], ['Budget deficit', 'When government spending exceeds revenue'], ['Bond', 'A debt security representing a loan to an issuer'], ['Asset', 'A resource with economic value'], ['Liability', 'A financial obligation owed to another party'], ['Market failure', 'An outcome where markets do not allocate resources efficiently'], ['Entrepreneurship', 'Organizing resources to create or operate a venture'],
  ].map(([term, definition]) => ({ term, definition })),
  'Languages & Humanities': [
    ['Rhetoric', 'The strategic use of language to persuade an audience'], ['Audience', 'The intended readers, listeners, or viewers of a work'], ['Tone', 'The attitude conveyed by a writer or speaker'], ['Diction', 'A writer’s choice of words'], ['Narrative', 'A structured account of connected events'], ['Metaphor', 'A comparison that describes one thing as another'], ['Thesis statement', 'A central claim guiding an argument'], ['Close reading', 'Careful analysis of language and form in a text'], ['Translation', 'Rendering meaning from one language into another'], ['Register', 'The level of formality appropriate to a situation'], ['Pronoun', 'A word that stands in for a noun'], ['Tense', 'A grammatical form locating an action in time'], ['Syntax', 'The arrangement of words into phrases and sentences'], ['Ethos', 'An appeal based on credibility or character'], ['Pathos', 'An appeal to emotion'],
  ].map(([term, definition]) => ({ term, definition })),
  'Arts & Design': [
    ['Line', 'A mark that guides the eye through a composition'], ['Color theory', 'Study of how colors relate and create visual effects'], ['Value', 'The lightness or darkness of a color'], ['Texture', 'The surface quality, actual or implied, of an artwork'], ['Scale', 'The size of an element relative to another or to the viewer'], ['Contrast', 'A noticeable difference between visual elements'], ['Balance', 'Distribution of visual weight in a composition'], ['Motif', 'A recurring visual element or idea'], ['Curator', 'A person who selects and interprets works for an exhibition'], ['Modernism', 'Artistic movements that broke with established traditions'], ['Fresco', 'Painting made on fresh wet plaster'], ['Sculpture', 'Three-dimensional art created by shaping materials'], ['Printmaking', 'Art made by transferring an image from a prepared surface'], ['Negative space', 'The empty area around and between visual forms'], ['Provenance', 'The documented ownership history of an artwork'],
  ].map(([term, definition]) => ({ term, definition })),
};

function supplementalQuestion(
  fact: SupplementalFact,
  facts: SupplementalFact[],
  index: number,
): StudyQuestion {
  const answerIndex = index % 4;
  const distractors = facts
    .filter((item) => item.term !== fact.term)
    .slice(index % (facts.length - 3), (index % (facts.length - 3)) + 3)
    .map((item) => item.definition);
  const choices = [...distractors];
  choices.splice(answerIndex, 0, fact.definition);
  const id = `supplemental-${fact.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return {
    id,
    conceptId: id,
    topic: fact.term,
    difficulty: 2,
    prompt: `What best defines ${fact.term}?`,
    choices: choices as StudyQuestion['choices'],
    answerIndex,
    explanation: `${fact.term}: ${fact.definition}`,
    variant: 0,
  };
}

function ensureQuestionBank(set: StudySet, minimum = 25): StudySet {
  if (set.questions.length >= minimum) return set;
  const facts = supplementalFacts[subjectFor(set)] ?? supplementalFacts['Social Sciences'];
  const questions = [...set.questions];

  for (const [index, fact] of facts.entries()) {
    if (questions.length >= minimum) break;
    questions.push(supplementalQuestion(fact, facts, index));
  }

  return { ...set, questions };
}

export const studySets = [
  biologyDemo,
  geneticsFoundations,
  dataStructures,
  calculusDerivatives,
  chemicalBonding,
  worldHistory,
  psychologyLearning,
  ...expandedStudySets,
].map((set) => ensureQuestionBank(set));

export const studySetGroups = Array.from(
  new Set(studySets.map(subjectFor)),
).map((subject) => ({
  subject,
  sets: studySets.filter((set) => subjectFor(set) === subject),
}));

export function guideReviewCost(set: StudySet) {
  const averageDifficulty =
    set.questions.reduce((total, question) => total + question.difficulty, 0) /
    set.questions.length;
  return Math.round((1000 + (averageDifficulty - 1) * 500) / 50) * 50;
}

export function buildLap(
  set: StudySet,
  lap: number,
  config?: Partial<StudySessionConfig>,
  variantOffset = 0,
): StudyQuestion[] {
  const concepts = new Map<string, StudyQuestion[]>();

  for (const question of set.questions) {
    const group = concepts.get(question.conceptId) ?? [];
    group.push(question);
    concepts.set(question.conceptId, group);
  }

  const conceptGroups = Array.from(concepts.values());
  const defaultConceptCount = Math.min(10, conceptGroups.length);
  const conceptCount = Math.max(
    5,
    Math.min(10, config?.conceptCount ?? defaultConceptCount),
  );
  const defaultQuestionCount = Math.min(
    10,
    Math.max(conceptCount, set.questionsPerLap ?? conceptCount),
  );
  const questionCount = Math.max(
    conceptCount,
    Math.min(10, config?.questionCount ?? defaultQuestionCount),
  );
  const selectedGroups = Array.from(
    { length: conceptCount },
    (_, index) => conceptGroups[index % conceptGroups.length],
  );
  const lapQuestions = selectedGroups.map((variants, index) => {
    const ordered = [...variants].sort((a, b) => a.variant - b.variant);
    return ordered[
      (lap + variantOffset + Math.floor(index / conceptGroups.length)) %
        ordered.length
    ];
  });

  const extraCount = questionCount - lapQuestions.length;

  for (let offset = 0; offset < extraCount; offset += 1) {
    const variants = [...selectedGroups[(lap + offset) % selectedGroups.length]].sort(
      (a, b) => a.variant - b.variant,
    );
    lapQuestions.push(
      variants[(lap + variantOffset + offset + 1) % variants.length],
    );
  }

  return lapQuestions;
}

/** Returns fresh question objects so every solo lap has unpredictable answer slots. */
export function shuffleAnswerChoices<
  T extends Pick<StudyQuestion, 'choices' | 'answerIndex'>,
>(
  questions: T[],
  random: () => number = Math.random,
): T[] {
  return questions.map((question) => {
    const indexedChoices = question.choices.map((choice, index) => ({
      choice,
      isAnswer: index === question.answerIndex,
    }));

    for (let index = indexedChoices.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [indexedChoices[index], indexedChoices[swapIndex]] = [
        indexedChoices[swapIndex],
        indexedChoices[index],
      ];
    }

    return {
      ...question,
      choices: indexedChoices.map((item) => item.choice) as StudyQuestion['choices'],
      answerIndex: indexedChoices.findIndex((item) => item.isAnswer),
    } as T;
  });
}
