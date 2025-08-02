from bisect import bisect


class PrefixSearch:
    def __init__(self, mapping):
        self.mapping = mapping
        self.keys = sorted(self.mapping)

    def get(self, key):
        if self.keys:
            i = bisect(self.keys, key)
            matched_key = self.keys[i - 1 if i else 0]

            if key.startswith(matched_key):
                return matched_key, self.mapping[matched_key]

