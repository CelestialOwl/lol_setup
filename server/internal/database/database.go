package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"lol-match-tracker/internal/config"
	"lol-match-tracker/internal/metrics"

	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

func NewPostgresDB(cfg *config.Config) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	slog.Info("connected to PostgreSQL", "host", cfg.DBHost, "port", cfg.DBPort, "db", cfg.DBName)
	return &DB{db}, nil
}

func (db *DB) Close() error {
	return db.DB.Close()
}

// Query executes a query and returns rows
func (db *DB) Query(query string, args ...interface{}) (*sql.Rows, error) {
	start := time.Now()
	rows, err := db.DB.Query(query, args...)
	duration := time.Since(start)

	slog.Debug("db_query", "duration_ms", duration.Milliseconds(), "query", query)
	return rows, err
}

// QueryContext executes a query with context and returns rows.
func (db *DB) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	start := time.Now()
	rows, err := db.DB.QueryContext(ctx, query, args...)
	duration := time.Since(start)

	metrics.DBQueryDuration.WithLabelValues("query").Observe(duration.Seconds())
	slog.Debug("db_query_context", "duration_ms", duration.Milliseconds(), "query", query)
	return rows, err
}

// QueryRow executes a query that returns a single row
func (db *DB) QueryRow(query string, args ...interface{}) *sql.Row {
	start := time.Now()
	row := db.DB.QueryRow(query, args...)
	duration := time.Since(start)

	slog.Debug("db_query_row", "duration_ms", duration.Milliseconds(), "query", query)
	return row
}

// QueryRowContext executes a query with context that returns a single row.
func (db *DB) QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	start := time.Now()
	row := db.DB.QueryRowContext(ctx, query, args...)
	duration := time.Since(start)

	metrics.DBQueryDuration.WithLabelValues("queryrow").Observe(duration.Seconds())
	slog.Debug("db_query_row_context", "duration_ms", duration.Milliseconds(), "query", query)
	return row
}

// Exec executes a query without returning rows
func (db *DB) Exec(query string, args ...interface{}) (sql.Result, error) {
	start := time.Now()
	result, err := db.DB.Exec(query, args...)
	duration := time.Since(start)

	slog.Debug("db_exec", "duration_ms", duration.Milliseconds(), "query", query)
	return result, err
}

// ExecContext executes a query with context without returning rows.
func (db *DB) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	start := time.Now()
	result, err := db.DB.ExecContext(ctx, query, args...)
	duration := time.Since(start)

	metrics.DBQueryDuration.WithLabelValues("exec").Observe(duration.Seconds())
	slog.Debug("db_exec_context", "duration_ms", duration.Milliseconds(), "query", query)
	return result, err
}
