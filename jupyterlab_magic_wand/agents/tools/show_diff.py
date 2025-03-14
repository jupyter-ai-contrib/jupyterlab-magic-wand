
from typing import Literal, Optional
from typing_extensions import TypedDict
from nbdime.diffing.generic import diff


COMMAND_NAME = "show-diff"
COMMAND_NAME_TYPE = Literal["show-diff"]


class MergeDiff(TypedDict):
    cell_id: str
    source: str
    diff: str


class ShowDiff(TypedDict):
    name: COMMAND_NAME_TYPE
    args: MergeDiff


def show_diff(
    cell_id: str,
    original_source: str, 
    new_source: str
) -> ShowDiff:
    diff_results = diff(original_source, new_source)
    return {
        "name": COMMAND_NAME,
        "args": {
            "cell_id": cell_id,
            "original_source": original_source,
            "diff": diff_results
        }   
    }
    