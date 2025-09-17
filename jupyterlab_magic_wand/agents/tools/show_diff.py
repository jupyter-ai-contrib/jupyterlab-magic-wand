from typing import Literal
from typing_extensions import TypedDict


COMMAND_NAME = "jupyterlab-cell-diff:show-codemirror"
COMMAND_NAME_TYPE = Literal["jupyterlab-cell-diff:show-codemirror"]


class MergeDiff(TypedDict):
    cellId: str
    originalSource: str
    newSource: str


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
