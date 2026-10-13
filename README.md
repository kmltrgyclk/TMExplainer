# TMExplainer

TMExplainer is an interactive visualisation of the Tsetlin Machine. It runs a complete Tsetlin Machine in your browser, so you can watch it predict and watch it learn.

**Live demo:** https://kmltrgyclk.github.io/TMExplainer/

## Features

- **Circuit view.** Each clause is an AND gate wired to the literals its automata include. Wire thickness shows how confident each automaton is. Signals flow from the input through the clauses and votes to the prediction.
- **Automata matrix.** Every Tsetlin automaton is shown as a cell, coloured by its state.
- **Clause inspector.** Each clause appears as a formula, with its evaluation on the current input and the state of every automaton.
- **Live training.** Step through one example at a time or train for many epochs. Each step shows the class sums, the feedback probabilities and every Type Ia, Type Ib and Type II update.
- **Guide.** A short tour explains literals, automata, clauses, voting and feedback.
- **Noisy XOR.** Twelve input bits, with the label given by the first two. 40% of the training labels are flipped.

## Run locally

Requires Node.js 20 or later.

```bash
npm ci
npm run dev
```

Then open http://localhost:5173.

## Build

```bash
npm run build
```

The static site is written to `build/`. Set `BASE_PATH` when the site is served from a subpath, for example `BASE_PATH=/TMExplainer npm run build`.

## Tests

```bash
npm test
```

The tests check clause evaluation, the feedback rules, reproducibility and learning on noisy XOR. They also compare inference with a model trained by [tmu](https://github.com/cair/tmu): class sums and predictions match on all 6,000 test inputs. `scripts/export_tmu_golden.py` regenerates that model with Python 3.11, NumPy 1.x and tmu 0.7.1.

## Project structure

```
src/lib/tm/          Tsetlin Machine engine, dataset and default settings
src/lib/components/  Interface panels
src/lib/lab.svelte.ts  Application state
src/lib/guide.ts     Guide text
src/lib/tex.ts       KaTeX rendering
scripts/             Pre-training and tmu export
tests/               Unit tests
```

`npm run pretrain` rebuilds the model the page opens with.

## Reference

Ole-Christoffer Granmo. *The Tsetlin Machine: A Game Theoretic Bandit Driven Approach to Optimal Pattern Recognition with Propositional Logic.* arXiv:1804.01508, 2018.
