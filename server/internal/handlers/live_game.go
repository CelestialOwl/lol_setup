package handlers

import (
	"errors"
	"net/http"

	"lol-match-tracker/internal/services"

	"github.com/gin-gonic/gin"
)

type LiveGameHandler struct {
	liveGameService *services.LiveGameService
}

func NewLiveGameHandler(liveGameService *services.LiveGameService) *LiveGameHandler {
	return &LiveGameHandler{liveGameService: liveGameService}
}

// GetLiveGame handles GET /api/live-game?gameName=&tagLine=&region=
func (h *LiveGameHandler) GetLiveGame(c *gin.Context) {
	gameName := c.Query("gameName")
	tagLine := c.Query("tagLine")
	region := c.DefaultQuery("region", "na1")

	if gameName == "" || tagLine == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "gameName and tagLine are required"})
		return
	}

	result, err := h.liveGameService.GetLiveGame(gameName, tagLine, region)
	if err != nil {
		if errors.Is(err, services.ErrNotInGame) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":  "Player is not in an active game",
				"inGame": false,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
