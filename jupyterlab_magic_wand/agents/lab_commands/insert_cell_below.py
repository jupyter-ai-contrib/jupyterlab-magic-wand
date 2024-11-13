
from typing import Literal, Optional
from typing_extensions import TypedDict


COMMAND_NAME = "insert-cell-below"
COMMAND_NAME_TYPE = Literal["insert-cell-below"]


class CellArgs(TypedDict):
    cell_id: str
    type: Literal["code", "markdown", "raw"]
    source: str


class InsertCellBelow(TypedDict):
    name: COMMAND_NAME_TYPE
    args: CellArgs


def insert_cell_below(
    cell_id: str, 
    source: Optional[str] = None, 
    type: str ="code",
    new_cell_id: Optional[str] = None,
) -> InsertCellBelow:
    return {
        "name": COMMAND_NAME,
        "args": {
            "cell_id": cell_id,
            "cell_type": type,
            "source": source or "",
            "new_cell_id": new_cell_id
        }
    }