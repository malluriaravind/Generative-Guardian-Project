import logging
import threading

from typing import cast, Literal, Protocol, TypedDict, ContextManager
from pathlib import Path
from huggingface_hub import snapshot_download

from trussed.utils.cache import cache
from trussed.utils.lockfile import Lockfile
from trussed.env import env

from core import syscheck
from core.errors import ResourceIsNotReadyError


log = logging.getLogger(__name__)


PipelineTask = Literal[
    'text-classification',
    'zero-shot-classification',
]


class ClassificationResult(TypedDict):
    label: str
    score: float


class TextClassificationPipeline(Protocol):
    def __call__(self, input: str | list[str]) -> list[ClassificationResult]:
        pass


class ZeroShotResult(TypedDict):
    sequence: str
    labels: list[str]
    scores: list[float]


class ZeroShotClassificationPipeline(Protocol):
    def __call__(self, input: str, labels: list[str], multi_label=False) -> ZeroShotResult:
        pass


@cache
def get_trf_tokenizer(
    model_id: str,
    revision: str | None = None,
    local_files_only: bool | None = None,
    **kwargs,
):
    from transformers import AutoTokenizer

    if local_files_only is None:
        local_files_only = env.bool(
            'LOCAL_FILES_ONLY',
            env.bool('TRF_LOCAL_TOKENIZERS_ONLY', False),
        )

    log.info('Loading tokenizer: %s revision=%s', model_id, revision)
    return AutoTokenizer.from_pretrained(
        model_id, revision=revision, local_files_only=local_files_only, **kwargs
    )


@cache
def get_trf_pipeline(
    task: PipelineTask,
    model_id: str,
    revision: str | None = None,
    max_length: int | None = None,
    truncation: bool = True,
    local_files_only: bool | None = None,
    cpu_require_ram: int | None = None,
    blocking=False,
    **model_kwargs,
):
    """
    Retrieves the specified Transformer pipeline.

    Args:
        task (PipelineTask): The type of pipeline task.
        model_id (str): The identifier of the model to use.
        revision (str | None): The specific model revision.
        max_length (int | None): The maximum length of the input sequence.
        truncation (bool): Whether to truncate the input if it's too long.

    Returns:
        A transformer pipeline instance.
    """
    log.info('Getting pipeline: model=%s revision=%s for %s', model_id, revision, task)

    if local_files_only is None:
        local_files_only = cast(bool, env.bool('LOCAL_FILES_ONLY', False))

    if local_files_only and not Path(model_id).is_dir():
        # Prevent internet access
        model_id = snapshot_download(model_id, revision=revision, local_files_only=True)

    syscheck.ram(log, cpu_require_ram)

    def load(*, local_files_only: bool):
        from transformers import AutoTokenizer, pipeline
        from optimum.onnxruntime import ORTModelForSequenceClassification as Model

        log.info('Loading model: %s revision=%s', model_id, revision)
        model = Model.from_pretrained(
            model_id,
            revision=revision,
            subfolder='onnx',
            provider='CPUExecutionProvider',
            local_files_only=local_files_only,
            **model_kwargs,
        )

        log.info('Loading tokenizer: %s revision=%s', model_id, revision)
        tokenizer = AutoTokenizer.from_pretrained(
            model_id, revision=revision, local_files_only=local_files_only
        )

        log.info('Creating pipeline: model=%s revision=%s for %s', model_id, revision, task)
        pipeline_instance = pipeline(
            task=task,
            model=model,
            tokenizer=tokenizer,
            max_length=max_length,
            truncation=truncation,
        )

        return pipeline_instance

    def download(lock: ContextManager):
        with lock:
            load(local_files_only=False)

    if blocking:
        return load(local_files_only=local_files_only)

    try:
        return load(local_files_only=True)
    except FileNotFoundError:
        if local_files_only:
            raise ResourceIsNotReadyError(
                'Resource could not be located on the local disk and outgoing traffic has been disabled.'
            )

        try:
            lock = Lockfile(unsafe_name=model_id)
        except BlockingIOError:
            raise ResourceIsNotReadyError from None
        else:
            thread = threading.Thread(target=lambda: download(lock))
            thread.start()
            raise ResourceIsNotReadyError from None
