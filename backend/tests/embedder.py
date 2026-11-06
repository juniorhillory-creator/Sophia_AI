import hashlib
import math

_DIM = 128


class HashEmbedder:
    """Bag of hashed tokens. Tests use this in place of Sentence Transformers."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [_vector(text) for text in texts]


def _vector(text: str) -> list[float]:
    vector = [0.0] * _DIM
    for token in text.lower().split():
        digest = hashlib.sha256(token.encode()).digest()
        slot = int.from_bytes(digest[:2], "big") % _DIM
        vector[slot] += 1.0 if digest[2] % 2 == 0 else -1.0
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]
