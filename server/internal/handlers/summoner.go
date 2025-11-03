package handlers

import (
	"net/http"

	"lol-match-tracker/internal/models"
	"lol-match-tracker/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type SummonerHandler struct {
	summonerService *services.SummonerService
	validator       *validator.Validate
}

func NewSummonerHandler(summonerService *services.SummonerService) *SummonerHandler {
	return &SummonerHandler{
		summonerService: summonerService,
		validator:       validator.New(),
	}
}

// GetSummoner handles summoner data requests
func (h *SummonerHandler) GetSummoner(c *gin.Context) {
	var req models.SearchRequest

	// Get query parameters
	req.GameName = c.Query("gameName")
	req.TagLine = c.Query("tagLine")
	req.Region = c.DefaultQuery("region", "na1")

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
			Code:    http.StatusBadRequest,
		})
		return
	}

	// Get summoner data
	response, err := h.summonerService.GetSummonerData(req.GameName, req.TagLine, req.Region)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to fetch summoner data",
			Message: err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetSummonerStats handles summoner statistics requests
func (h *SummonerHandler) GetSummonerStats(c *gin.Context) {
	puuid := c.Param("puuid")
	if puuid == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "PUUID is required",
			Code:  http.StatusBadRequest,
		})
		return
	}

	stats, err := h.summonerService.GetSummonerStats(puuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to fetch summoner stats",
			Message: err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// SearchSummoner handles POST requests for summoner search
func (h *SummonerHandler) SearchSummoner(c *gin.Context) {
	var req models.SearchRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request body",
			Message: err.Error(),
			Code:    http.StatusBadRequest,
		})
		return
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Validation failed",
			Message: err.Error(),
			Code:    http.StatusBadRequest,
		})
		return
	}

	// Get summoner data
	response, err := h.summonerService.GetSummonerData(req.GameName, req.TagLine, req.Region)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to fetch summoner data",
			Message: err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	c.JSON(http.StatusOK, response)
}
