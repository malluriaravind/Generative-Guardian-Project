import regex

from typing import Pattern
from presidio_analyzer import RecognizerResult
from presidio_analyzer.nlp_engine import NlpArtifacts
from presidio_analyzer.predefined_recognizers import SpacyRecognizer


class NerPatternRecognizer(SpacyRecognizer):
    base_entity: str
    pattern: Pattern
    score: float | None

    def __init__(
        self,
        base_entity: str,
        supported_entity: str,
        supported_language: str,
        pattern: str,
        score: float | None = None,
        context: list[str] | None = None,
        global_regex_flags: int = regex.DOTALL | regex.MULTILINE | regex.IGNORECASE,
        *args,
        **kwargs,
    ):
        self.base_entity = base_entity
        self.supported_entity = supported_entity
        self.pattern = regex.compile(pattern, global_regex_flags)
        self.score = score

        super().__init__(
            supported_entities=[supported_entity],
            supported_language=supported_language,
            context=context,
            *args,
            **kwargs,
        )

    def analyze(self, text: str, entities, nlp_artifacts: NlpArtifacts = None):
        if nlp_artifacts is None:
            return []

        for entity, score in zip(nlp_artifacts.entities, nlp_artifacts.scores):
            if entity.label_ == self.base_entity:
                if self.pattern.search(text[entity.start_char : entity.end_char]):
                    if self.score is not None:
                        score = self.score

                    result = RecognizerResult(
                        entity_type=self.supported_entity,
                        start=entity.start_char,
                        end=entity.end_char,
                        score=score,
                        analysis_explanation=self.build_explanation(
                            score,
                            self.DEFAULT_EXPLANATION.format(entity.label_),
                        ),
                        recognition_metadata={
                            RecognizerResult.RECOGNIZER_NAME_KEY: self.name,
                            RecognizerResult.RECOGNIZER_IDENTIFIER_KEY: self.id,
                        },
                    )

                    return [result]
                else:
                    break

        return []
