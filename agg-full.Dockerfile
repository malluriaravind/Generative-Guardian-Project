ARG VERSION

FROM adankar/trussed_ai_dp:$VERSION
RUN poetry run python nlp_prefetch.py all

ENV LOCAL_FILES_ONLY 1
ENV HF_HUB_OFFLINE 1
