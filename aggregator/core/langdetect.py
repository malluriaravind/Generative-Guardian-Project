import attrs
import logging

from typing import Iterable, ClassVar
from trussed.utils.cache import cache
from lingua import Language, LanguageDetector, LanguageDetectorBuilder


# Obtain a logger instance for this module
log = logging.getLogger(__name__)

@attrs.define(init=False, eq=False)
class Lingua:
    """A helper for the Lingua language detection library"""

    detector: LanguageDetector
    codes: dict[str, Language]
    working_set: dict[str, Language]
    suggested_working_set: ClassVar[tuple[str, ...]] = ('en', 'fr', 'de', 'es', 'pt')
    """Some combination of superfluous languages for accuracy"""

    def __init__(
        self,
        codes: Iterable[str],
        working_set: Iterable[str] = (),
        preload=True,
        low_accuracy=False,
    ):
        log.debug(
            "Initializing Lingua with codes: %s, working_set: %s, preload: %s, low_accuracy: %s",
            codes,
            working_set,
            preload,
            low_accuracy,
        )
        try:
            self.codes = {i: self.codemap()[i] for i in codes}
            self.working_set = {i: self.codemap()[i] for i in working_set}
            log.info("Codes and working_set initialized successfully.")
        except KeyError as e:
            log.error("Unknown language code encountered: %s", e.args[0])
            raise ValueError(f'unknown language code: {e.args[0]}', *e.args)

        builder = LanguageDetectorBuilder.from_languages(
            *self.codes.values(),
            *self.working_set.values(),
        )
        log.debug("LanguageDetectorBuilder created with specified languages.")

        if preload:
            builder = builder.with_preloaded_language_models()
            log.debug("Preloaded language models added to the builder.")

        if low_accuracy:
            self.detector = builder.with_low_accuracy_mode().build()
            log.info("LanguageDetector initialized in low accuracy mode.")
        else:
            self.detector = builder.build()
            log.info("LanguageDetector initialized with default accuracy settings.")

    def detect(self, text: str):
        log.debug("Detecting language for text: %s", text)
        if language := self.detector.detect_language_of(text):
            detected_language = language.iso_code_639_1.name.lower()
            log.info("Detected language: %s", detected_language)
            return detected_language
        else:
            log.warning("No language detected for the provided text.")
            return None

    @classmethod
    @cache
    def codemap(cls) -> dict[str, Language]:
        log.debug("Generating language code map.")
        return {i.iso_code_639_1.name.lower(): i for i in Language.all()}
