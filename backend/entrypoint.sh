#!/bin/sh
# Start the FastAPI server
fastapi run src/main.py --host 0.0.0.0 --port 8080 --proxy-headers
