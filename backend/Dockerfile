# --- Stage 1: Build Stage ---
# This stage correctly builds the virtual environment with all dependencies.
FROM python:3.11-slim as builder

# Set the working directory.
WORKDIR /app

# Install build-time dependencies.
RUN apt-get update && apt-get install -y gcc ffmpeg

# Copy requirements file.
COPY backend/requirements.txt /app/requirements.txt

# Create the virtual environment.
RUN python -m venv /opt/venv

# Add the virtual environment to the PATH. This is the critical step.
# All subsequent RUN commands will now use the venv's executables (like pip).
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies into the virtual environment.
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source code into the builder.
# .dockerignore will prevent local venv, node_modules, etc. from being copied.
COPY . .

# --- Stage 2: Final Stage ---
# This stage creates the clean, final image.
FROM python:3.11-slim

# Set the working directory.
WORKDIR /app

# Install only runtime dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg

# Copy the entire populated virtual environment from the builder stage.
COPY --from=builder /opt/venv /opt/venv

# Copy the application code from the builder stage.
# This includes the 'backend' and 'migrations' directories.
COPY --from=builder /app /app

# Activate the virtual environment for the final image.
ENV PATH="/opt/venv/bin:$PATH"

# Set the command to run the application.
CMD ["sh", "-c", "python -m flask db upgrade && python -m gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 600 --log-level=debug --access-logfile - --error-logfile - backend.app:app"]