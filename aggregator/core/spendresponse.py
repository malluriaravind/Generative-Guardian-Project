import core.budget
from operator import itemgetter
import logging
from trussed.models.usage import Usage
from litellm.utils import Usage as UsageResponse

log = logging.getLogger(__name__)

remaininggetter = itemgetter('remaining')


def set_cost_details(usageresponse: UsageResponse, usage: Usage):
    log.debug("Starting set_cost_details() function.")
    
    usageresponse.total_tokens = usage.total_tokens
    usageresponse.prompt_cost = usage.prompt_cost
    usageresponse.completion_cost = usage.completion_cost
    usageresponse.total_cost = usage.total_cost
    log.debug('UsageResponse: %s', usageresponse)

    budget: core.budget.CachedBudgetStats | None = None
    app_budget = core.budget.cache_get(usage.metadata['key_id'], ttl=10)
    llm_budget = core.budget.cache_get(usage.metadata['llm_id'], ttl=10)
    log.debug("Retrieved app_budget: %s, llm_budget: %s", app_budget, llm_budget)

    if app_budget and llm_budget:
        budget = min(app_budget, llm_budget, key=remaininggetter)
        log.debug("Selected minimum budget: %s", budget)
    else:
        budget = app_budget or llm_budget

        if budget:
            log.debug('Selected available budget: %s', budget)
        else:
            log.debug('No budget available for selection.')

    if budget is not None:
        usageresponse.remaining_budget = budget['remaining']
        usageresponse.spent_budget = budget['usage']

        log.debug(
            'Set remaining_budget=%s and spent_budget=%s',
            usageresponse.remaining_budget,
            usageresponse.spent_budget,
        )
    else:
        log.debug("Budget is None. Unable to set budget details in UsageResponse.")
