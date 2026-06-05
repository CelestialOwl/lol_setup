FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/server/main.go

# Final stage — pinned Alpine version, non-root user
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

WORKDIR /home/appuser/

COPY --from=builder /app/main .

RUN chown appuser:appgroup main

USER appuser

EXPOSE 8080

CMD ["./main"]