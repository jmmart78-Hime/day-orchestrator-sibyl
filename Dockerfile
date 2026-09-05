# ==============================================================================
# Production Cloud Run Container for Day Orchestrator + Sibyl Persistent Memory
# Dual runtime: Node.js 22 LTS + Python 3 (sibyl-memory-client 0.8.0)
# ==============================================================================

FROM node:22-bookworm-slim AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install Python 3, pip, and SQLite libraries required for Sibyl FTS5 engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Establish working directory
WORKDIR /app

# Copy Python dependency manifest and install Sibyl SDK during image build
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy Node dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for Vite/esbuild compilation)
RUN npm ci

# Copy application source code and runtime assets
COPY . .

# Build Vite frontend and compile server.ts to dist/server.cjs
RUN npm run build

# Remove development-only node dependencies to produce lean production image
RUN npm prune --omit=dev

# Ensure data directory exists for working SQLite database
RUN mkdir -p /app/data

# Cloud Run defaults to port 3000 or custom $PORT
EXPOSE 3000

# Launch production Node server (which executes server/sibyl_bridge.py via Python 3)
CMD ["node", "dist/server.cjs"]
