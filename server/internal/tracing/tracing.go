// Package tracing initialises the OpenTelemetry SDK and registers a global
// TracerProvider that exports spans to Jaeger via OTLP/HTTP.
//
// Usage in main:
//
//	shutdown, err := tracing.Init(ctx, cfg.OtelEndpoint, cfg.OtelServiceName)
//	if err != nil { ... }
//	defer shutdown(context.Background())
package tracing

import (
	"context"
	"fmt"
	"log/slog"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
	"go.opentelemetry.io/otel/trace/noop"
)

// Init configures the global OpenTelemetry TracerProvider.
//
// If endpoint is empty the provider is a no-op — the server runs without
// Jaeger and all tracer.Start() calls compile and execute without any cost.
//
// Returns a shutdown function that must be deferred in main to flush any
// buffered spans before the process exits.
func Init(ctx context.Context, endpoint, serviceName string) (func(context.Context) error, error) {
	if endpoint == "" {
		slog.Info("tracing disabled (OTEL_ENDPOINT not set)")
		otel.SetTracerProvider(noop.NewTracerProvider())
		return func(_ context.Context) error { return nil }, nil
	}

	// OTLP HTTP exporter pointing at Jaeger (or any OTLP-compatible backend)
	exporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(endpoint),
		otlptracehttp.WithInsecure(), // local dev — no TLS required
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP exporter: %w", err)
	}

	// Resource identifies this service in the Jaeger UI
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(serviceName),
			semconv.ServiceVersion("1.0.0"),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTel resource: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter), // async, non-blocking export
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()), // 100% in dev
	)

	// Register as the global provider so otel.Tracer() works anywhere
	otel.SetTracerProvider(tp)

	// Propagate trace context in W3C TraceContext + Baggage format
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	slog.Info("tracing enabled", "endpoint", endpoint, "service", serviceName)

	return tp.Shutdown, nil
}

// Tracer returns a named tracer from the global provider.
// Pass the fully-qualified package path as the instrument name, e.g.
//
//	tracing.Tracer("lol-match-tracker/internal/services")
func Tracer(name string) trace.Tracer {
	return otel.Tracer(name)
}
