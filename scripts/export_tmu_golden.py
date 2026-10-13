import json
import sys

import numpy as np
from tmu.tsetlin_machine import TMClassifier

FEATURES = 12
CLAUSES = 10
T = 15
S = 3.9
EPOCHS = 200


def noisy_xor(rng, size, noise):
    X = rng.integers(0, 2, size=(size, FEATURES), dtype=np.uint32)
    Y = X[:, 0] ^ X[:, 1]
    flip = rng.random(size) < noise
    Y = np.where(flip, 1 - Y, Y).astype(np.uint32)
    return X, Y


def class_sums(tm, X):
    encoded = tm.clause_banks[0].prepare_X(X)
    sums = []
    for e in range(X.shape[0]):
        row = []
        for c in range(tm.number_of_classes):
            outputs = tm.clause_banks[c].calculate_clause_outputs_predict(encoded, e)
            vote = int(np.dot(tm.weight_banks[c].get_weights(), outputs))
            row.append(int(np.clip(vote, -T, T)))
        sums.append(row)
    return sums


def states(tm):
    literals = 2 * FEATURES
    half = CLAUSES // 2
    result = []
    for c in range(tm.number_of_classes):
        flat = []
        for j in range(CLAUSES):
            polarity, clause = (0, j) if j < half else (1, j - half)
            flat.extend(int(tm.get_ta_state(c, polarity, clause, k)) for k in range(literals))
        result.append(flat)
    return result


def main(out_path):
    rng = np.random.default_rng(2026)
    X_train, Y_train = noisy_xor(rng, 5000, 0.4)
    X_test, Y_test = noisy_xor(rng, 5000, 0.0)
    X_probe = rng.integers(0, 2, size=(1000, FEATURES), dtype=np.uint32)

    np.random.seed(2026)
    tm = TMClassifier(CLAUSES, T, S, platform='CPU', boost_true_positive_feedback=0, weighted_clauses=False)
    for _ in range(EPOCHS):
        tm.fit(X_train, Y_train)

    X_eval = np.vstack([X_test, X_probe])
    golden = {
        'config': {'features': FEATURES, 'classes': 2, 'clauses': CLAUSES, 'T': T, 's': S, 'boost': False, 'seed': 0},
        'states': states(tm),
        'X': X_eval.astype(int).tolist(),
        'predictions': tm.predict(X_eval).astype(int).tolist(),
        'sums': class_sums(tm, X_eval),
        'testAccuracy': float((tm.predict(X_test) == Y_test).mean()),
    }
    with open(out_path, 'w') as f:
        json.dump(golden, f)
    print('tmu test accuracy', golden['testAccuracy'])


if __name__ == '__main__':
    main(sys.argv[1])
