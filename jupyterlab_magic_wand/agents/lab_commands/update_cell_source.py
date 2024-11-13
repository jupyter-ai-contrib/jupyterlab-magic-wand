
from typing import Literal, Optional
from typing_extensions import TypedDict
from nbdime.diffing.generic import diff


COMMAND_NAME = "update-cell-source"
COMMAND_NAME_TYPE = Literal["update-cell-source"]


class CellArgs(TypedDict):
    cell_id: str
    type: Literal["code", "markdown", "raw"]
    source: str


class UpdateCellSource(TypedDict):
    name: COMMAND_NAME_TYPE
    args: CellArgs


def update_cell_source(
    cell_id: str, 
    source: Optional[str] = None, 
    type: str ="code"
) -> UpdateCellSource:
    return {
        "name": COMMAND_NAME,
        "args": {
            "cell_id": cell_id,
            "cell_type": type,
            "source": source or ""
        }
    }