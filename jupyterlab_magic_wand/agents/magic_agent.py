
"""
A (ugly) demo/example of a langgraph that gets
fired when the magic wand is clicked in a Jupyter(Lab) Notebook.

This is compatible with Jupyter AI.
"""
import json
import uuid
from typing import Sequence
from langgraph.graph import StateGraph
from langgraph.graph import END, START
from langchain_core.runnables import RunnableConfig
from jupyterlab_magic_wand.state import AIWorkflowState, ConfigSchema
from jupyterlab_magic_wand.agents.lab_commands import (
    update_cell_source, 
    show_diff, 
    insert_cell_below
)
from jupyterlab_magic_wand.agents.base import Agent

from langchain_core.messages import HumanMessage

graph = StateGraph(AIWorkflowState, config_schema=ConfigSchema)


def get_jupyter_ai_model(jupyter_ai_config):
    lm_provider = jupyter_ai_config.lm_provider
    return lm_provider(**jupyter_ai_config.lm_provider_params)

def get_cell(cell_id: str, state: AIWorkflowState) -> dict:
    content = state["context"]["content"]
    cells = content["cells"]
    
    for cell in cells:
        if cell["id"] == cell_id:
            break
    return cell


def get_exception(cell: dict):
    if cell.get("cell_type") == "code":
        outputs = cell.get("outputs")
        if outputs and len(outputs) > 0:
            last_output = outputs[-1]
            if last_output["output_type"] == "error": 
                return last_output


def sanitize_code(code: str) -> str:
    return (code
            .strip()
            .lstrip('```markdown')
            .lstrip('```python')
            .lstrip('```scala')
            .lstrip('```')
            .rstrip('```')
            .strip()
    )


async def router(state: AIWorkflowState) -> Sequence[str]:
    cell_id = state["context"]["cell_id"]
    current = get_cell(cell_id, state)
    if current.get("cell_type") == "markdown":
        return ["route_markdown"]
    if current.get("cell_type") == "code":
        outputs = current.get("outputs")
        if outputs and len(outputs) > 0:
            last_output = outputs[-1]
            if last_output["output_type"] == "error": 
                return ["route_exception"]
        return ["route_code"]


SPELLCHECK_MARKDOWN = """
The following input is markdown. Update the input to correct any grammar or spelling mistakes. But succint and brief.

Input:
{input}
"""

SUMMARIZE_CELL = """
The following input comes from a code cell. Using only markdown, do not include ```, summarize what's happening in the code cell.

Input:
{input}
"""

async def route_markdown(state: AIWorkflowState, config: RunnableConfig) -> dict:
    llm = get_jupyter_ai_model(config["configurable"]["jupyter_ai_config"])
    cell_id = state["context"]["cell_id"]
    current = get_cell(cell_id, state)
    # Spell check
    if current["source"].strip() != "":
        response = (await llm.ainvoke(input=f"Does the following input look like a prompt to write code (answer 'code' only) or content to be editted (answer 'content' only)?\n Input: {current['source']}")).content
        if "code" in response.lower():
            response = (await llm.ainvoke(input=f"Write code based on the prompt. Then, update the code to make it more efficient, add code comments, and respond with only the code and comments.\n Input: {current['source']}")).content
            response = sanitize_code(response)
            messages = state.get("messages", []) or []
            messages.append(response)
            commands = state["commands"]
            new_cell_id = str(uuid.uuid4())
            commands.extend([
                insert_cell_below(cell_id, source=response, type="code", new_cell_id=new_cell_id),
            ])
            return {"commands": commands, "messages": messages}
        prompt = SPELLCHECK_MARKDOWN.format(input=current["source"])
        response = (await llm.ainvoke(input=prompt)).content
        messages = state.get("messages", []) or []
        messages.append(response)
        commands = state["commands"]
        commands.extend([
            update_cell_source(cell_id, source=response),
            {
                "name": "notebook:run-cell",
                "args": {}
            }
        ])
        return {"commands": commands, "messages": messages}

    content = state["context"]["content"]
    cell_id = state["context"]["cell_id"]
    cells = content["cells"]

    
    for i, cell in enumerate(cells):
        if cell["id"] == cell_id:
            break

    try:
        next_cell = cells[i+1]
        if next_cell["cell_type"] == "code":
            prompt = SUMMARIZE_CELL.format(input=next_cell["source"])
            response = (await llm.ainvoke(input=prompt)).content
            messages = state.get("messages", []) or []
            messages.append(response)
            commands = state["commands"]
            commands.extend([
                update_cell_source(cell_id, source=response),
                {
                    "name": "notebook:run-cell",
                    "args": {}
                }
            ])
            return {"commands": commands, "messages": messages}
    except IndexError:
        return


exception_prompt = """
The code below came from a code cell in Jupyter. It raised the exception below. Update the code to fix the exception and add code comments explaining what you fixed. Respond with code only. Be succint.

Code:
{code}

Exception Name:
{exception_name}

Exception Value:
{exception_value}
"""

async def route_exception(state: AIWorkflowState, config: RunnableConfig) -> dict:
    llm = get_jupyter_ai_model(config["configurable"]["jupyter_ai_config"])
    cell_id = state["context"]["cell_id"]
    current = get_cell(cell_id, state)
    exception = get_exception(current)
    prompt = exception_prompt.format(
        code=current["source"], 
        exception_name=exception["ename"],
        exception_value=exception["evalue"]
    )
    response = (await llm.ainvoke(input=prompt)).content
    response = sanitize_code(response)
    messages = state.get("messages", []) or []
    messages.append(response)
    commands = state["commands"]
    commands.extend([
        update_cell_source(cell_id, source=response),
        show_diff(cell_id, current["source"], response),
        {
            "name": "notebook:run-cell",
            "args": {}
        },
    ])
    return {"commands": commands, "messages": messages}


IMPROVE_PROMPT = """
The input below came from a code cell in Jupyter. If the input does not look like code, but instead a prompt, write code based on the prompt. Then, update the code to make it more efficient, add code comments, and respond with only the code and comments. 

The code:
{code}
"""

USE_CONTEXT_TO_WRITE_CELL = """
You are working in a Jupyter Notebook. Use the previous ordered cells for context and write some code to add to a fourth cell. Look for opportunities to make a plot if data is involved. Respond with code only.
"""

def prompt_new_cell_using_context(cell_id, state):
    content = state["context"]["content"]
    cells = content["cells"]
    
    for i, cell in enumerate(cells):
        if cell["id"] == cell_id:
            break
    
    previous_cells = []
    for j in range(1, 4):
        try:
            previous_cells.append(cells[i-j])
        except:
            pass
    
    prompt = USE_CONTEXT_TO_WRITE_CELL
    for k, cell in enumerate(previous_cells):
        prompt += f"\ncCell {k} was a {cell['cell_type']} cell with source:\n{cell['source']}\n"

    return prompt


async def route_code(state: AIWorkflowState, config: RunnableConfig):
    llm = get_jupyter_ai_model(config["configurable"]["jupyter_ai_config"])

    cell_id = state["context"]["cell_id"]
    current = get_cell(cell_id, state)
    source = current["source"]
    source = source.strip()
    if source:
        prompt = IMPROVE_PROMPT.format(code=source)
        response = (await llm.ainvoke(prompt)).content
        response = sanitize_code(response)
        messages = state.get("messages", []) or []
        messages.append(response)
        commands = state["commands"]
        commands.extend([
            update_cell_source(cell_id, source=response),
            show_diff(cell_id, current["source"], response),
        ])
        return {"commands": commands, "messages": messages}
    
    prompt = prompt_new_cell_using_context(cell_id, state)   
    response = (await llm.ainvoke(input=prompt)).content
    response = sanitize_code(response)
    messages = state.get("messages", []) or []
    messages.append(response)
    commands = state["commands"]
    commands.extend([
        update_cell_source(cell_id, source=response),
    ])
    return {"commands": commands, "messages": messages}


graph.add_node('route_code', route_code)
graph.add_node('route_markdown', route_markdown)
graph.add_node('route_exception', route_exception)

graph.add_conditional_edges(
    START,
    router,
    ['route_code', 'route_markdown', 'route_exception']
)


workflow = graph.compile()

agent = Agent(
    name = "Magic Button Agent",
    description = "Magic Button Agent",
    workflow = workflow,
    version = "0.0.1"
)