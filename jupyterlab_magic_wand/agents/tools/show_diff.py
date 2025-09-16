from typing import Literal
from typing_extensions import TypedDict


COMMAND_NAME = "jupyterlab-cell-diff:show-nbdime"
COMMAND_NAME_TYPE = Literal["jupyterlab-cell-diff:show-nbdime"]


class MergeDiff(TypedDict):
    cell_id: str
    source: str
    diff: str


class ShowDiff(TypedDict):
    name: COMMAND_NAME_TYPE
    args: MergeDiff


def show_diff(cell_id: str, original_source: str, new_source: str) -> ShowDiff:
    return {
        "name": COMMAND_NAME,
        "args": {
            "cellId": cell_id,
            "originalSource": original_source,
            "newSource": new_source,
        },
    }
