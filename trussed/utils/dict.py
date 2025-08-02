class MyDict[K, V](dict[K, V]):
    __hash__ = object.__hash__

    def __copy__(self):
        return self.copy()

    def copy(self):
        copy = type(self)(self)
        copy.__dict__ = self.__dict__.copy()
        return copy
