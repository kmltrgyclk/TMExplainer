# TMExplainer

TMExplainer is an interactive visualisation of the Tsetlin Machine. It runs a complete Tsetlin Machine in your browser, so you can watch it predict and watch it learn.

**Live demo:** https://kmltrgyclk.github.io/TMExplainer/

## Datasets

- **Noisy XOR.** Twelve input bits, with the label given by the first two. 40% of the training labels are flipped.
- **Digits.** 8 × 8 handwritten digits, one bit per pixel, with 1,438 training and 359 test images. Draw your own digit or load one from the test set.

## Features

- **Circuit view** (Noisy XOR). Each clause is an AND gate wired to the literals its automata include. Wire thickness shows how confident each automaton is. Signals flow from the input through the clauses and votes to the prediction.
- **Automata matrix** (Noisy XOR). Every Tsetlin automaton is shown as a cell, coloured by its state.
- **Clause stencils** (Digits). Each clause is drawn as a small image of the pixels it needs inked or blank. Stencils that fire on your drawing light up, and broken requirements are marked.
- **Coverage and evidence maps.** For Noisy XOR, a map shows which inputs each clause covers. For Digits, a heatmap shows which pixels push the vote for or against a class.
- **Clause inspector.** Each clause appears as a formula, with its evaluation on the current input and the state of every automaton.
- **Live training.** Step through one example at a time or train for many epochs. Each step plays in six beats: the example, the class sums, the feedback probabilities, the picked clauses, the automaton moves and the result.
- **Guide.** A short tour for each dataset explains literals, automata, clauses, voting and feedback.

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

The tests check clause evaluation, the feedback rules, reproducibility, the maths notation, and learning on both datasets. They also compare inference with a model trained by [tmu](https://github.com/cair/tmu): class sums and predictions match on all 6,000 test inputs. `scripts/export_tmu_golden.py` regenerates that model with Python 3.11, NumPy 1.x and tmu 0.7.1.

## Project structure

```
src/lib/tm/          Tsetlin Machine engine and the noisy XOR generator
src/lib/data/        Dataset definitions, digits data and pre-trained models
src/lib/components/  Interface panels
src/lib/lab.svelte.ts  Application state
src/lib/guide.ts     Guide text
src/lib/tex.ts       KaTeX rendering
scripts/             Pre-training, digits export and tmu export
tests/               Unit tests
```

`npm run pretrain` rebuilds the models the page opens with. `scripts/export_digits.py` rebuilds the digits data from scikit-learn's copy of the UCI set.

## References

Ole-Christoffer Granmo. *The Tsetlin Machine: A Game Theoretic Bandit Driven Approach to Optimal Pattern Recognition with Propositional Logic.* arXiv:1804.01508, 2018.

E. Alpaydin and C. Kaynak. *Optical Recognition of Handwritten Digits* [Dataset]. UCI Machine Learning Repository, 1998. https://doi.org/10.24432/C50P49. Licensed under CC BY 4.0. TMExplainer converts the images to black and white.
