import json
import sys

import numpy as np
from sklearn.datasets import load_digits

THRESHOLD = 8
TEST_SHARE = 0.2
SEED = 2026


def encode(bits):
    return ''.join(f'{int("".join(map(str, bits[i:i + 4])), 2):x}' for i in range(0, len(bits), 4))


def main(out_path):
    digits = load_digits()
    images = (digits.data >= THRESHOLD).astype(int)
    labels = digits.target.astype(int)
    rng = np.random.default_rng(SEED)
    test = []
    for label in range(10):
        indices = np.flatnonzero(labels == label)
        rng.shuffle(indices)
        test.extend(indices[: int(round(len(indices) * TEST_SHARE))].tolist())
    test_set = set(test)
    train = [i for i in rng.permutation(len(labels)).tolist() if i not in test_set]
    test = rng.permutation(test).tolist()
    data = {
        'train': [encode(images[i]) for i in train],
        'trainLabels': [int(labels[i]) for i in train],
        'test': [encode(images[i]) for i in test],
        'testLabels': [int(labels[i]) for i in test],
    }
    with open(out_path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print('train', len(train), 'test', len(test), 'ink share', round(images.mean(), 3))


if __name__ == '__main__':
    main(sys.argv[1])
