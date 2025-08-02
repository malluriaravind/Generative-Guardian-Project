from dataclasses import dataclass
import re

from typing import Any, Literal, Annotated, get_args
from datetime import time as dtime, datetime
from functools import partial
from pydantic import BaseModel, EmailStr, Field
from zoneinfo import ZoneInfo
from pymongo import IndexModel
from dateutil.relativedelta import relativedelta, MO, TU, WE, TH, FR, SA, SU

from trussed.pydantic import RequireUnique
from trussed.models import AppDocument
from trussed.models.llm import LlmProvider
from trussed.models.logrecord import Log, LogSearchQuery, TimeRange


PeriodUnit = Literal['days', 'weeks', 'months']
Day = Literal['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
relweekdays = [MO, TU, WE, TH, FR, SA, SU]
relativedelta0 = partial(relativedelta, hour=0, minute=0, second=0, microsecond=0)


class ReportConfig(AppDocument):
    enabled: bool = True

    emails: Annotated[list[EmailStr], Field(default_factory=list), RequireUnique()]
    subject: str = 'Weekly Log Report'
    template_body: dict[str, Any] = Field(default_factory=dict)
    template_name: str = 'weekly_report.html'

    day: Day = 'Monday'
    time: dtime = dtime(0, 5)
    timezone: str = 'America/New_York'

    report_period: int = 7
    report_period_unit: PeriodUnit = 'days'

    send_at: datetime | None = None
    last_sent: datetime | None = None

    class Settings:
        indexes = [IndexModel(['enabled', 'send_at'])]

    def schedule(self, ensure_next=False):
        """
        Compute the next scheduled time for sending the report.

        Args:
            ensure_next: If True, ensure that the next scheduled time will not be in the current day

        Returns:
            self
        """
        delta = relativedelta(
            days=1 if ensure_next else 0,
            weekday=get_args(Day).index(self.day),
            hour=self.time.hour,
            minute=self.time.minute,
            second=0,
            microsecond=0,
        )

        self.send_at = datetime.now(ZoneInfo(self.timezone)) + delta
        return self

    def datetime_range(self):
        match self.report_period_unit:
            case 'days':
                delta = relativedelta0(days=self.report_period)
            case 'weeks':
                delta = relativedelta0(weeks=self.report_period, weekday=MO(-1))
            case 'months':
                delta = relativedelta0(months=self.report_period, day=1)

        now = datetime.now(ZoneInfo(self.timezone))
        return now - delta, now

    @classmethod
    async def fetch_llm_count(cls) -> int:
        """
        Queries the 'llm' collection to return the count of llm documents.
        """
        db = cls.get_motor_collection().database
        count = await db.llm.count_documents({})
        return count 
        
    @classmethod
    async def fetch_api_key_count(cls) -> int:
        """
        Queries the 'apikey' collection to return the total count of API keys.
        """
        db = cls.get_motor_collection().database
        count = await db.apikey.count_documents({})
        return count 
        
    @classmethod
    async def fetch_audit_logs(cls, start: datetime, end: datetime) -> str:
        """
        Returns a single text string containing combined audit logs within the given time window.
        Each combined log entry is formatted as follows (each record consists of multiple lines):
            Log #<n>
            Request ID: <...>
            Developer ID: <...>
            Time Stamp: <log timestamp from asctime>
            Prompt: <all user prompt messages, concatenated>
            <base_model> Response: <assistant response message>
        
        The report begins with a summary header that includes a total count of audit log entries.
        """
        query = LogSearchQuery(time=TimeRange(start, end), reqres=True)
        combined = {}

        async for log in query().sort(query.sortby()):
            ts = log.created_at
            ts_str = ts.strftime("%Y-%m-%d %H:%M:%S")

            if log.request_id not in combined:
                combined[log.request_id] = {
                    "prompt": None,
                    "prompt_ts": None,
                    "prompt_ts_str": None,
                    "response": None,
                    "response_ts": None,
                    "response_ts_str": None,
                    "model": None,    # derived from raw_response's model
                    "dev_id": log.dev_id
                }
            
            entry = combined[log.request_id]

            # Process user messages from the raw_request.
            if log.raw_request and log.side == 'LHS':
                raw_req = log.raw_request

                user_messages = []  # Accumulate all user messages
                messages = raw_req.get('messages', [])

                if not messages:
                    messages = raw_req.get('input_data', {}).get('input_string', [])
                
                if not messages:
                    # Support simple prompt format
                    if prompt := raw_req.get('prompt'):
                        user_messages.append(prompt)                    

                for message in messages:
                    if message.get("role") == "user":
                        user_messages.append(message.get("content", "No content"))

                if user_messages:
                    combined_prompt = "\n\n".join(user_messages)
                    # Use the earliest timestamp for the prompt.
                    if entry["prompt_ts"] is None or (ts and ts < entry["prompt_ts"]):
                        entry["prompt"] = combined_prompt
                        entry["prompt_ts"] = ts
                        entry["prompt_ts_str"] = ts_str

            # Process the assistant's response and model.
            if log.raw_response:
                if log.provider:
                    extract = ResponseExtract.from_provider(log.provider, log.raw_response)
                else:
                    extract = ResponseExtract.from_openai(log.raw_response)

                # Use the latest timestamp for the response.
                if entry["response_ts"] is None or (ts and ts > entry["response_ts"]):
                    entry["response"] = extract.completion or extract.error
                    entry["response_ts"] = ts
                    entry["response_ts_str"] = ts_str
                    entry["model"] = strip_date_suffix(extract.model or log.model or '')

        # Build a list of formatted audit log records.
        records = []
        for idx, (req_id, entry) in enumerate(combined.items(), start=1):
            time_display = entry["prompt_ts_str"] if entry["prompt_ts_str"] is not None else entry["response_ts_str"] or "Unknown Time"
            prompt_text = entry["prompt"] if entry["prompt"] else "N/A"
            response_text = entry["response"] if entry["response"] else "N/A"
            base_model = entry["model"] if entry["model"] else "Unknown Model"
            dev_id = entry["dev_id"] if entry["dev_id"] else "N/A"

            record = (
                f"Log #{idx}\n"
                f"Request ID: {req_id}\n"
                f"Developer ID: {dev_id}\n"
                f"Time Stamp: {time_display}\n"
                f"Prompt: {prompt_text}\n"
                f"{base_model} Response: {response_text}\n"
            )
            records.append(record)

        # Append a header with a total count of audit logs.
        header = f"Total Audit Log Entries: {len(records)}\n\n"
        return header + "\n".join(records)
        
    @classmethod
    async def fetch_prompt_counts_by_app(cls, start: datetime, end: datetime) -> list:
        """
        Returns the count of unique prompts (based on unique request_id) grouped by application.
        It filters logs where a raw_request exists, groups by key_id and request_id to ensure uniqueness,
        and then groups by key_id to count the number of prompts. The result is joined with the 'apikey'
        collection to retrieve the application name.
        """
        db = cls.get_motor_collection().database

        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start, "$lte": end},
                    "raw_request": {"$exists": True},
                    "request_id": {"$exists": True},
                    "key_id": {"$exists": True}
                }
            },
            # Group by key_id and request_id to get unique entries
            {"$group": {
                "_id": {"key_id": "$key_id", "request_id": "$request_id"}
            }},
            # Group by key_id to count unique request_ids
            {"$group": {
                "_id": "$_id.key_id",
                "prompt_count": {"$sum": 1}
            }},
            # Lookup application details from the apikey collection using key_id.
            {"$lookup": {
                "from": "apikey",
                "localField": "_id",
                "foreignField": "_id",
                "as": "apikey_info"
            }},
            {"$unwind": {
                "path": "$apikey_info",
                "preserveNullAndEmptyArrays": True
            }},
            {"$project": {
                "prompt_count": 1,
                "app_name": "$apikey_info.name"
            }}
        ]

        cursor = db.log.aggregate(pipeline)
        result = await cursor.to_list(length=None)
        return result
        
    @classmethod
    async def fetch_http_status_counts_by_app(cls, start: datetime, end: datetime) -> dict:
        """
        Returns overall HTTP status code counts for logs within the specified date range.
        Only the following HTTP status codes are counted:
          200 (OK),
          400 (Bad Request),
          401 (Unauthorized),
          403 (Forbidden),
          404 (Not Found),
          422 (Unprocessable Entity),
          429 (Too Many Requests),
          500 (Internal Server Error),
          501 (Not Implemented),
          502 (Bad Gateway), and
          503 (Service Unavailable).
        
        Aggregates counts across all logs irrespective of application.
        """
        db = cls.get_motor_collection().database

        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start, "$lte": end},
                    "http_status_code": {"$exists": True}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "count200": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 200]}, 1, 0]}},
                    "count400": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 400]}, 1, 0]}},
                    "count401": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 401]}, 1, 0]}},
                    "count403": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 403]}, 1, 0]}},
                    "count404": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 404]}, 1, 0]}},
                    "count422": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 422]}, 1, 0]}},
                    "count429": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 429]}, 1, 0]}},
                    "count500": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 500]}, 1, 0]}},
                    "count501": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 501]}, 1, 0]}},
                    "count502": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 502]}, 1, 0]}},
                    "count503": {"$sum": {"$cond": [{"$eq": ["$http_status_code", 503]}, 1, 0]}},
                }
            },
            {
                "$project": {
                    "http_status_counts": {
                        "200": "$count200",
                        "400": "$count400",
                        "401": "$count401",
                        "403": "$count403",
                        "404": "$count404",
                        "422": "$count422",
                        "429": "$count429",
                        "500": "$count500",
                        "501": "$count501",
                        "502": "$count502",
                        "503": "$count503",
                    },
                    "_id": 0
                }
            }
        ]

        cursor = db.log.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        if result:
            return result[0]["http_status_counts"]
        else:
            return {
                "200": 0,
                "400": 0,
                "401": 0,
                "403": 0,
                "404": 0,
                "422": 0,
                "429": 0,
                "500": 0,
                "501": 0,
                "502": 0,
                "503": 0
            }
        
    @classmethod
    async def fetch_prompt_counts_by_model(cls, start: datetime, end: datetime) -> list:
        """
        Fetch prompt volume by model within the given period.
        """
        db = cls.get_motor_collection().database
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start, "$lte": end},
                    "raw_request.model": {"$exists": True}
                }
            },
            {
                "$group": {
                    "_id": "$raw_request.model",
                    "prompt_count": {"$sum": 1}
                }
            },
            {
                "$project": {
                    "model": "$_id",
                    "prompt_count": 1
                }
            }
        ]
        cursor = db.log.aggregate(pipeline)
        result = await cursor.to_list(length=None)
        return result


def strip_date_suffix(model: str) -> str:
    match = re.match(r'^(.*?)(-\d{4}-\d{2}-\d{2})$', model)

    if match:
        return match.group(1)

    return model


@dataclass
class ResponseExtract:
    completion: str = ''
    error: str = ''
    model: str = ''
    unknown: bool = False

    @classmethod
    def from_provider(cls, provider: LlmProvider, raw: dict):
        match provider:
            case 'OpenAI':
                return cls.from_openai(raw)

            case 'OpenAICompatible':
                return cls.from_openai(raw)

            case 'Azure':
                return cls.from_openai(raw)
            
            case 'Mistral':
                return cls.from_openai(raw)

            case 'AzureMLChatScore':
                return cls.from_amlscore(raw)

            case 'AzureMLPromptScore':
                return cls.from_amlscore(raw)

            case 'Gemini':
                return cls.from_gemini(raw)

            case 'Anthropic':
                return cls.from_anthropic(raw)

            case _:
                return cls(unknown=True)

    @classmethod
    def from_openai(cls, raw: dict):
        self = cls(model=raw.get('model', ''))
        choices = raw.get('choices', [])
    
        if choices and isinstance(choices, list):
            self.completion = choices[0].get('message', {}).get('content', '')

        if error := raw.get('error'):
            self.error = error.get('message') or 'Error'

        return self

    @classmethod
    def from_amlscore(cls, raw: dict):
        self = cls(completion=raw.get('output', ''))
    
        if error := raw.get('error'):
            self.error = str(error)

        return self

    @classmethod
    def from_gemini(cls, raw: dict):
        self = cls(model=raw.get('modelVersion', ''))
        candidates = raw.get('candidates', [])

        if candidates and isinstance(candidates, list):
            for i in candidates:
                if content := i.get('content'):
                    for part in content.get('parts', []):
                        if text := part.get('text'):
                            self.completion += text

        if error := raw.get('error'):
            self.error = error.get('message') or 'Error'

        return self

    @classmethod
    def from_anthropic(cls, raw: dict):
        self = cls(model=raw.get('model', ''))
        content = raw.get('content', [])

        if content and isinstance(content, list):
            for i in content:
                if i.get('type') == 'text':
                    self.completion += i.get('text', '')
        else:
            self.completion = raw.get('completion', '')
        
        if error := raw.get('error'):
            self.error = error.get('message') or 'Error'

        return self
