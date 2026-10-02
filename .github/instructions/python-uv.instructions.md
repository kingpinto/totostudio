---
description: "Use for Python development, environment setup, dependency management, scripts, modules, tests, and Python CLI tools. Requires uv and a workspace-local .venv."
name: "Python Environment and Dependency Management"
applyTo: ["**/*.py", "**/*.md", "**/pyproject.toml", "**/uv.lock", "**/requirements*.txt", "**/.gitignore"]
---
# Python Environment and Dependency Management

For all Python development in this workspace, use `uv` to create and manage environments, add or remove dependencies, synchronize dependencies, and run Python code and tools. This is a hard requirement unless the user explicitly requests an exceptional alternative.

## Workspace Environment

- Keep the virtual environment at the workspace root in `.venv/`. Never create environments or install project dependencies outside this workspace, globally, or into the system Python.
- Before Python work, check that `uv` is available and whether `pyproject.toml`, `.venv/`, and `uv.lock` exist.
- If there is no `pyproject.toml`, initialize the project with `uv init`.
- If `.venv/` does not exist, create it with `uv venv .venv`.
- If dependencies are declared in `pyproject.toml`, synchronize with `uv sync`, respecting the existing `uv.lock` when present. Do not manually reinstall dependencies already managed by the project.
- Ensure `.venv/` is listed in `.gitignore`. Commit `pyproject.toml` and `uv.lock` when appropriate; do not commit `.venv/`.

## Dependencies

- Add application dependencies with `uv add <package>`.
- Add development dependencies with `uv add --dev <package>`.
- Remove dependencies with `uv remove <package>` (use `--dev` when removing a development-only dependency).
- Do not use `pip`, `pip3`, `python -m pip`, Conda, Poetry, Pipenv, or another environment manager when `uv` can perform the task.
- Never use `pip install --user`, `sudo pip install`, or `sudo pip3 install`.
- Do not install Python packages globally or depend on globally installed Python CLI tools.

## Running Python

- Run scripts with `uv run python script.py`.
- Run modules with `uv run python -m <module>`.
- Run tests and Python-based tools through `uv`, for example `uv run pytest`, `uv run ruff check .`, `uv run ruff format .`, or `uv run mypy .`.
- Do not use bare `python`, `python3`, or globally installed Python tools to run workspace code.
- When configuring the VS Code interpreter, use `${workspaceFolder}\\.venv\\Scripts\\python.exe` on Windows or `${workspaceFolder}/.venv/bin/python` on Linux/macOS. Do not select system Python when the workspace `.venv` exists.

The default for every Python task is a project managed by `uv`, with a workspace-local `.venv/`, `pyproject.toml`, and `uv.lock` where dependency resolution produces one.