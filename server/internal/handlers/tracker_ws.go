package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"lol-match-tracker/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	maxTrackedPlayers = 5
	wsWriteWait       = 10 * time.Second
	wsPingInterval    = 30 * time.Second
	wsMaxMessageSize  = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 4096,
	// Allow all origins; tighten in production by comparing against cfg.AllowedOrigins.
	CheckOrigin: func(r *http.Request) bool { return true },
}

type TrackerWSHandler struct {
	poller *services.TrackerPoller
}

func NewTrackerWSHandler(poller *services.TrackerPoller) *TrackerWSHandler {
	return &TrackerWSHandler{poller: poller}
}

// HandleTrackerWS handles GET /ws/tracker?p=PUUID:region&p=PUUID:region…
//
// Each `p` param encodes one player as "PUUID:region" (e.g. "abc123:euw1").
// Up to 5 players accepted.
func (h *TrackerWSHandler) HandleTrackerWS(c *gin.Context) {
	rawEntries := c.QueryArray("p")
	if len(rawEntries) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one 'p' query param required (PUUID:region)"})
		return
	}
	if len(rawEntries) > maxTrackedPlayers {
		rawEntries = rawEntries[:maxTrackedPlayers]
	}

	entries := make([]services.TrackerEntry, 0, len(rawEntries))
	for _, raw := range rawEntries {
		parts := strings.SplitN(raw, ":", 2)
		if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid player format, expected PUUID:region"})
			return
		}
		entries = append(entries, services.TrackerEntry{PUUID: parts[0], Region: parts[1]})
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		slog.Error("websocket upgrade failed", "error", err)
		return
	}
	defer conn.Close()

	// connCtx is cancelled when this function returns (conn closes).
	connCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Read loop: cancels connCtx when the client sends a close frame or disconnects.
	go func() {
		conn.SetReadLimit(wsMaxMessageSize)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				cancel()
				return
			}
		}
	}()

	// Ping loop: keeps idle connections alive.
	go func() {
		ticker := time.NewTicker(wsPingInterval)
		defer ticker.Stop()
		for {
			select {
			case <-connCtx.Done():
				return
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					cancel()
					return
				}
			}
		}
	}()

	// Start polling and forward updates to the client.
	for update := range h.poller.Poll(connCtx, entries) {
		data, err := update.Marshal()
		if err != nil {
			slog.Error("tracker: marshal error", "error", err)
			continue
		}
		conn.SetWriteDeadline(time.Now().Add(wsWriteWait))
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			slog.Info("tracker: write failed, closing", "error", err)
			return
		}
	}
}
