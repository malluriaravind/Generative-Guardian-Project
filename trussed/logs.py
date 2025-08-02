from logging import Filter, Formatter, LogRecord
from pythonjsonlogger.jsonlogger import JsonFormatter


class TcFormatter(Formatter):
    def format(self, record: LogRecord) -> str:
        record.levelname = f'TC_{record.levelname}'
        return super().format(record)


class TcJsonFormatter(JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)

        # Remove unwanted fields if they exist
        for field in ('taskName', 'color_message'):
            log_record.pop(field, None)


class AddUvicornAccessVarsFilter(Filter):
    def filter(self, record: LogRecord):
        try:
            (
                record.http_addr,
                record.http_method,
                record.http_path,
                record.http_version,
                record.http_status_code,
            ) = record.args # type: ignore
        except (ValueError, TypeError):
            pass

        return True

