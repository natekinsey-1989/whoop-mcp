# Use official Bun image
FROM oven/bun:1.3-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code (cache busted by source changes)
COPY src/ ./src/
COPY index.ts ./

# Expose the default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:' + (process.env.PORT || '8080')).catch(() => process.exit(1))"

# Run the application
CMD ["bun", "run", "index.ts"]
