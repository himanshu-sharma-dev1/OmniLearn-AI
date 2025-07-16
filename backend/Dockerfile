# --- Stage 1: Build Stage ---
# Use an official Python runtime as a parent image
FROM python:3.11-slim as builder

# Set the working directory in the container
WORKDIR /app

# Install build dependencies and ffmpeg
# We need gcc to build some python packages and ffmpeg for audio processing
RUN apt-get update && apt-get install -y gcc ffmpeg

# Copy the dependency files
COPY backend/requirements.txt /app/requirements.txt

# Install any needed packages specified in requirements.txt
# Use a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code
COPY . .

# --- Stage 2: Final Stage ---
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg

# Copy the virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy the application code from the builder stage
COPY --from=builder /app /app

# Copy the migrations directory from the project root
COPY ../migrations /app/migrations

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Set the new path
ENV PATH="/opt/venv/bin:$PATH"

# Define environment variable
ENV FLASK_APP app.py

# Run app.py when the container launches
# Use gunicorn for production and run migrations first
CMD ["sh", "-c", "flask db upgrade && gunicorn --bind 0.0.0.0:5000 app:app"]
