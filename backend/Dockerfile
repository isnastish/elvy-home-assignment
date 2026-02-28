FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /code

COPY ./pyproject.toml /code/pyproject.toml
RUN uv sync --no-dev

### ------------------------------------------------- ###

FROM python:3.12-slim

WORKDIR /code
ENV PYTHONUNBUFFERED=1

COPY --from=builder /code /code
ENV PATH="$PATH:/code/.venv/bin"

COPY entrypoint.sh /code/entrypoint.sh
RUN chmod +x entrypoint.sh

COPY src /code/src

ENTRYPOINT ["./entrypoint.sh"]
