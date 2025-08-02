from typing import Any


def flatten_onelevel(d: dict) -> dict:
    """
    Flatten one level of a dictionary using dot-notation.

    Args:
        d (dict): The input dictionary to be flattened.

    Returns:
        dict: The resulting flattened dictionary.
    """
    resulting = d.copy()

    for k, v in d.items():
        if isinstance(v, dict):
            resulting.pop(k)

            for kk, vv in v.items():
                resulting[f'{k}.{kk}'] = vv

    return resulting


def find_first_exception[T: Exception](e: Exception, base: type[T]) -> T | None:
    """
    Find the first exception of a given type in the exception chain.
    The helper is written mainly for terrible LiteLLM exceptions

    :param e: The current exception being handled
    :param base: The base exception type to search for
    :return: The first exception of the given type found in the exception chain
    """
    candidate = None

    while e:
        if isinstance(e, base):
            candidate = e

        e = e.__context__

    return candidate


def extract_strings(input: str | list[str] | Any) -> list[str]:
    if isinstance(input, str):
        return [input]

    if isinstance(input, list):
        if input and isinstance(input[0], str):
            return input

    return []