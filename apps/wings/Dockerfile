# Builder stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git make

# Copy go mod files
COPY apps/wings/go.mod apps/wings/go.sum ./
RUN go mod download

# Copy source code
COPY apps/wings/ ./

# Build
RUN make build

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/bin/wings .

# Copy config example
COPY --from=builder /app/config.example.yaml ./config.example.yaml

EXPOSE 8080

CMD ["./wings"]
