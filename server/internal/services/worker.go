package services

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"lol-match-tracker/internal/interfaces"
	"lol-match-tracker/internal/metrics"
)

// RankFetchTask holds the minimum data needed to fetch a player's rank.
type RankFetchTask struct {
	PUUID  string
	Region string
}

// RankFetchWorker drains a queue of RankFetchTask items at a rate-limited pace.
// It is safe for concurrent use. Enqueue is non-blocking and deduplicates by PUUID.
type RankFetchWorker struct {
	queue        chan RankFetchTask
	inFlight     sync.Map // PUUID -> struct{}, prevents duplicate tasks
	riotAPI      interfaces.RiotClient
	summonerRepo interfaces.SummonerRepository
	rpm          int
	stopCh       chan struct{}
	wg           sync.WaitGroup
}

// NewRankFetchWorker creates a worker that processes at most rpm rank-fetches per minute.
func NewRankFetchWorker(riotAPI interfaces.RiotClient, summonerRepo interfaces.SummonerRepository, rpm int) *RankFetchWorker {
	if rpm <= 0 {
		rpm = 10
	}
	return &RankFetchWorker{
		queue:        make(chan RankFetchTask, 1000),
		riotAPI:      riotAPI,
		summonerRepo: summonerRepo,
		rpm:          rpm,
		stopCh:       make(chan struct{}),
	}
}

// Enqueue adds a task to the queue.
// Non-blocking: drops silently if the queue is full or the PUUID is already pending.
func (w *RankFetchWorker) Enqueue(task RankFetchTask) {
	if _, loaded := w.inFlight.LoadOrStore(task.PUUID, struct{}{}); loaded {
		return // already queued or currently being processed
	}
	select {
	case w.queue <- task:
		metrics.RankWorkerQueueDepth.Inc()
		slog.Debug("rank worker: enqueued", "puuid", task.PUUID, "region", task.Region)
	default:
		w.inFlight.Delete(task.PUUID) // didn't enqueue — release dedup lock
		metrics.RankWorkerTasksDropped.Inc()
		slog.Warn("rank worker: queue full, dropping task", "puuid", task.PUUID)
	}
}

// Start launches the background goroutine. Call once at startup.
// The goroutine exits when ctx is cancelled or Stop is called.
func (w *RankFetchWorker) Start(ctx context.Context) {
	interval := time.Minute / time.Duration(w.rpm)
	slog.Info("rank worker started", "rpm", w.rpm, "interval_ms", interval.Milliseconds())
	w.wg.Add(1)
	go func() {
		defer w.wg.Done()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-w.stopCh:
				return
			case <-ticker.C:
				select {
				case task := <-w.queue:
					w.process(ctx, task)
				default:
					// nothing queued this tick — idle
				}
			}
		}
	}()
}

// Stop signals the goroutine to exit and waits for it to finish.
func (w *RankFetchWorker) Stop() {
	close(w.stopCh)
	w.wg.Wait()
	slog.Info("rank worker stopped")
}

// process fetches rank from Riot API and persists it.
// SaveRankSnapshots handles the 1-hour dedup window internally.
func (w *RankFetchWorker) process(ctx context.Context, task RankFetchTask) {
	defer w.inFlight.Delete(task.PUUID)
	metrics.RankWorkerQueueDepth.Dec()

	riotCtx, riotCancel := withTimeout(ctx, riotTimeout)
	entries, err := w.riotAPI.GetLeagueEntriesByPUUID(riotCtx, task.PUUID, task.Region)
	riotCancel()
	if err != nil {
		slog.Warn("rank worker: failed to fetch rank", "puuid", task.PUUID, "region", task.Region, "error", err)
		metrics.RankWorkerTasksTotal.WithLabelValues("failed").Inc()
		return
	}

	dbCtx, dbCancel := withTimeout(ctx, dbTimeout)
	if err := w.summonerRepo.SaveRankSnapshots(dbCtx, task.PUUID, entries); err != nil {
		slog.Warn("rank worker: failed to save rank snapshots", "puuid", task.PUUID, "error", err)
	}
	dbCancel()

	slog.Info("rank worker: fetched rank", "puuid", task.PUUID, "region", task.Region, "entries", len(entries))
	metrics.RankWorkerTasksTotal.WithLabelValues("success").Inc()
}
