export type GuidePage = {
	title: string;
	region: string | null;
	body: string[];
	formula?: string;
};

export const GUIDE: GuidePage[] = [
	{
		title: 'The task: noisy XOR',
		region: 'input',
		body: [
			'Each example has twelve bits. The label is $x_1 \\oplus x_2$. The other ten bits are noise.',
			'In the training set, 40% of the labels are flipped at random. The test set is clean.',
			'The machine must find the XOR rule from these noisy examples. It has only ten clauses per class to do it.'
		]
	},
	{
		title: 'Literals',
		region: 'literals',
		body: [
			'Each bit gives two literals: the bit itself and its negation. Twelve bits give 24 literals.',
			'With negations, a clause can require $x_1 = 1$ or $x_1 = 0$. The circuit shows the current value of every literal as a filled or empty port.'
		],
		formula: 'x_k,\\quad \\lnot x_k = 1 - x_k'
	},
	{
		title: 'Tsetlin automata',
		region: 'bank',
		body: [
			'Every clause has one Tsetlin automaton per literal. Each automaton has 256 states.',
			'States 0 to 127 mean exclude. States 128 to 255 mean include. Training moves an automaton one state at a time.',
			'In the circuit, an included literal is a wire into its clause. A thicker wire means a more confident automaton. Hover over a gate to see dashed grey wires for literals close to being included.',
			'The automata matrix shows every automaton as a cell. Light cells are excluded. Dark cells are included.'
		]
	},
	{
		title: 'Clauses',
		region: 'detail',
		body: [
			'A clause $C_j$ is an AND gate over the literals its automata include. It outputs 1 only when every included literal is 1. A gate that outputs 1 is filled.',
			'A red dashed wire is an included literal that is 0 for this input. One such wire blocks the gate. Flip an input bit to watch the signal run through the circuit.',
			'Click a gate to read its rule in the inspector. After training, most rules mention only $x_1$ and $x_2$.'
		],
		formula: 'C_j = \\bigwedge_{k \\in I_j} l_k'
	},
	{
		title: 'What a clause covers',
		region: 'coverage',
		body: [
			'A clause fires on a region of the input space. The coverage map shows that region for two chosen bits.',
			'The first map shows how often the selected clause outputs 1 in each cell. The class maps show the mean class sum. Together they draw the XOR pattern.',
			'Choose a noise bit as an axis. The map goes flat, because the trained clauses ignore it.'
		]
	},
	{
		title: 'Polarity and voting',
		region: 'votes',
		body: [
			'Half the clauses in each class have positive polarity, $C^{+}_j$. They vote for the class. The other half, $C^{-}_j$, vote against it.',
			'The class sum $v$ is clipped to the range $-T$ to $+T$. The class with the highest sum is the prediction.'
		],
		formula: 'v = \\operatorname{clip}\\Big(\\sum_j C^{+}_j - \\sum_j C^{-}_j,\\ -T,\\ T\\Big)'
	},
	{
		title: 'How much feedback?',
		region: 'training',
		body: [
			'Each training example updates two classes. The target class should vote higher. One other class, chosen at random, should vote lower.',
			'Each clause receives feedback with probability $p$. Feedback fades as $v$ approaches $T$. This stops many clauses from piling onto the same pattern.',
			'Press Step one example. The step plays in six beats: the example, the class sums, the feedback dial for $p$, the picked clauses, the automata moves and the result. Pause at any beat.'
		],
		formula: 'p_{\\text{target}} = \\frac{T - v}{2T}, \\qquad p_{\\text{negative}} = \\frac{T + v}{2T}'
	},
	{
		title: 'Type I feedback',
		region: 'bank',
		body: [
			'Type I feedback makes a clause fire for the right patterns. It goes to positive clauses of the target class and negative clauses of the other class.',
			'Type Ia: if the clause outputs 1, literals that are 1 step towards include with probability $(s - 1)/s$.',
			'Type Ib: every other literal steps towards exclude with probability $1/s$. A large $s$ gives specific clauses with many literals. A small $s$ gives general clauses.',
			'In the inspector, each automaton is a bead on a track from 0 to 255. Each move shifts a bead by one state. The rule only changes when a bead crosses the dashed boundary.'
		],
		formula: '\\text{Ia: } \\Pr[\\uparrow] = \\tfrac{s-1}{s}, \\qquad \\text{Ib: } \\Pr[\\downarrow] = \\tfrac{1}{s}'
	},
	{
		title: 'Type II feedback',
		region: 'bank',
		body: [
			'Type II feedback stops a clause from firing on the wrong class. It goes to the clauses that Type I does not reach.',
			'If the clause outputs 1, every excluded literal that is 0 steps towards include. Once one of them is included, the clause outputs 0 for this input.',
			'Type II has no randomness inside the clause. It only acts when the clause fires.'
		]
	},
	{
		title: 'Try it yourself',
		region: 'chart',
		body: [
			'Press Reset to untrained, then Train to epoch 200. Watch the rules form in the circuit and the accuracy climb.',
			'Then change one setting at a time. Set $s$ to 1.5 and the clauses become too general. Set $T$ to 2 and too few clauses learn each pattern.',
			'Accuracy wobbles even late in training. The 40% label noise keeps pushing the automata.'
		]
	}
];
