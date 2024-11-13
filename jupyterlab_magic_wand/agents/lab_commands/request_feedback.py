
from typing import Literal

COMMAND_NAME = "request-feedback"
COMMAND_NAME_TYPE = Literal["request-feedback"]

def request_feedback(
    cell_id: str,
) -> dict:
    return {
        "name": COMMAND_NAME,
        "args": {
            "cell_id": cell_id,
        }   
    }
    