FROM python:3.12-slim

WORKDIR /app

# Install build dependencies for compiling the C++ engine if needed inside the container
RUN apt-get update && apt-get install -y cmake g++ make && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# We mount the actual code via volumes in docker-compose, so we just set the entrypoint here
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]