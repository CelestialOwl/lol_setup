"use client";

import {
  getChampionImageUrl,
  getChampionInfo,
  getSummonerSpellImageUrl,
  getSummonerSpellInfo,
} from "@/data/champions";
import { CurrentGameParticipant, LiveGameData } from "@/types/riot-api";

interface LiveGameProps {
  liveGameData: LiveGameData;
}

export default function LiveGame({ liveGameData }: LiveGameProps) {
  const { gameInfo, playerTeam, enemyTeam, searchedPlayer } = liveGameData;

  const formatGameDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getGameMode = (queueId: number): string => {
    const queueModes: { [key: number]: string } = {
      400: "Normal Draft",
      420: "Ranked Solo/Duo",
      440: "Ranked Flex",
      450: "ARAM",
      900: "URF",
      1020: "One For All",
      1300: "Nexus Blitz",
      1400: "Ultimate Spellbook",
    };
    return queueModes[queueId] || `Queue ${queueId}`;
  };

  const renderTeam = (
    team: CurrentGameParticipant[],
    teamName: string,
    isPlayerTeam: boolean
  ) => (
    <div
      className={`bg-white rounded-lg shadow-md p-4 ${
        isPlayerTeam
          ? "border-l-4 border-blue-500"
          : "border-l-4 border-red-500"
      }`}
    >
      <h3
        className={`text-lg font-semibold mb-4 ${
          isPlayerTeam ? "text-blue-700" : "text-red-700"
        }`}
      >
        {teamName}
      </h3>
      <div className="space-y-3">
        {team.map((participant, index) => {
          const championInfo = getChampionInfo(participant.championId);
          const spell1Info = getSummonerSpellInfo(participant.spell1Id);
          const spell2Info = getSummonerSpellInfo(participant.spell2Id);

          return (
            <div
              key={index}
              className={`flex items-center space-x-3 p-2 rounded ${
                participant.puuid === searchedPlayer.puuid
                  ? "bg-yellow-100 border border-yellow-300"
                  : "hover:bg-gray-50"
              }`}
            >
              {/* Champion image and info */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  {getChampionImageUrl(championInfo.key) ? (
                    <img
                      src={getChampionImageUrl(championInfo.key)!}
                      alt={championInfo.name}
                      className="w-12 h-12 rounded"
                      onError={(e) => {
                        // Fallback to champion ID if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.nextElementSibling!.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-12 h-12 bg-gray-300 rounded flex items-center justify-center text-xs font-bold ${
                      getChampionImageUrl(championInfo.key) ? "hidden" : ""
                    }`}
                  >
                    {participant.championId}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600">{championInfo.name}</p>
                </div>
              </div>

              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {participant.summonerName}
                  {participant.puuid === searchedPlayer.puuid && (
                    <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                      YOU
                    </span>
                  )}
                </p>
              </div>

              {/* Summoner Spells */}
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-1">
                  {getSummonerSpellImageUrl(spell1Info.key) ? (
                    <img
                      src={getSummonerSpellImageUrl(spell1Info.key)!}
                      alt={spell1Info.name}
                      className="w-6 h-6 rounded"
                      title={spell1Info.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.nextElementSibling!.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-6 h-6 bg-gray-200 rounded text-xs flex items-center justify-center ${
                      getSummonerSpellImageUrl(spell1Info.key) ? "hidden" : ""
                    }`}
                  >
                    {participant.spell1Id}
                  </div>
                  {getSummonerSpellImageUrl(spell2Info.key) ? (
                    <img
                      src={getSummonerSpellImageUrl(spell2Info.key)!}
                      alt={spell2Info.name}
                      className="w-6 h-6 rounded"
                      title={spell2Info.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.nextElementSibling!.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-6 h-6 bg-gray-200 rounded text-xs flex items-center justify-center ${
                      getSummonerSpellImageUrl(spell2Info.key) ? "hidden" : ""
                    }`}
                  >
                    {participant.spell2Id}
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {spell1Info.name.slice(0, 4)} / {spell2Info.name.slice(0, 4)}
                </p>
              </div>
            </div>
          );
        })}
        )
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Game Info Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            🔴 Live Game - {searchedPlayer.summonerName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">Game Mode</p>
              <p className="font-semibold">
                {getGameMode(gameInfo.gameQueueConfigId)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Game Duration</p>
              <p className="font-semibold">
                {formatGameDuration(gameInfo.gameLength)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Map ID</p>
              <p className="font-semibold">{gameInfo.mapId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {renderTeam(
          playerTeam,
          `Team ${playerTeam[0]?.teamId || "1"} (Your Team)`,
          true
        )}
        {renderTeam(
          enemyTeam,
          `Team ${enemyTeam[0]?.teamId || "2"} (Enemy Team)`,
          false
        )}
      </div>

      {/* Banned Champions */}
      {gameInfo.bannedChampions && gameInfo.bannedChampions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Banned Champions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-700 mb-2">
                Team {playerTeam[0]?.teamId || "1"} Bans
              </h4>
              <div className="flex flex-wrap gap-2">
                {gameInfo.bannedChampions
                  .filter(
                    (ban) =>
                      ban.teamId === playerTeam[0]?.teamId &&
                      ban.championId !== -1
                  )
                  .map((ban, index) => {
                    const championInfo = getChampionInfo(ban.championId);
                    return (
                      <div key={index} className="flex flex-col items-center">
                        {getChampionImageUrl(championInfo.key) ? (
                          <img
                            src={getChampionImageUrl(championInfo.key)!}
                            alt={championInfo.name}
                            className="w-12 h-12 rounded border-2 border-blue-300"
                            title={`Banned: ${championInfo.name}`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.nextElementSibling!.classList.remove(
                                "hidden"
                              );
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 bg-blue-100 rounded border-2 border-blue-300 flex items-center justify-center text-xs ${
                            getChampionImageUrl(championInfo.key)
                              ? "hidden"
                              : ""
                          }`}
                        >
                          {ban.championId}
                        </div>
                        <p className="text-xs text-center mt-1 text-blue-700">
                          {championInfo.name}
                        </p>
                      </div>
                    );
                  })}
                {gameInfo.bannedChampions.filter(
                  (ban) =>
                    ban.teamId === playerTeam[0]?.teamId &&
                    ban.championId !== -1
                ).length === 0 && (
                  <p className="text-gray-500 text-sm">No bans</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-red-700 mb-2">
                Team {enemyTeam[0]?.teamId || "2"} Bans
              </h4>
              <div className="flex flex-wrap gap-2">
                {gameInfo.bannedChampions
                  .filter(
                    (ban) =>
                      ban.teamId === enemyTeam[0]?.teamId &&
                      ban.championId !== -1
                  )
                  .map((ban, index) => {
                    const championInfo = getChampionInfo(ban.championId);
                    return (
                      <div key={index} className="flex flex-col items-center">
                        {getChampionImageUrl(championInfo.key) ? (
                          <img
                            src={getChampionImageUrl(championInfo.key)!}
                            alt={championInfo.name}
                            className="w-12 h-12 rounded border-2 border-red-300"
                            title={`Banned: ${championInfo.name}`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.nextElementSibling!.classList.remove(
                                "hidden"
                              );
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 bg-red-100 rounded border-2 border-red-300 flex items-center justify-center text-xs ${
                            getChampionImageUrl(championInfo.key)
                              ? "hidden"
                              : ""
                          }`}
                        >
                          {ban.championId}
                        </div>
                        <p className="text-xs text-center mt-1 text-red-700">
                          {championInfo.name}
                        </p>
                      </div>
                    );
                  })}
                {gameInfo.bannedChampions.filter(
                  (ban) =>
                    ban.teamId === enemyTeam[0]?.teamId && ban.championId !== -1
                ).length === 0 && (
                  <p className="text-gray-500 text-sm">No bans</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NoActiveGame({ playerName }: { playerName: string }) {
  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29.82-5.877 2.172M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.875a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          No Active Game
        </h3>
        <p className="text-gray-600 mb-4">
          <span className="font-medium">{playerName}</span> is currently not in
          a match.
        </p>
        <p className="text-sm text-gray-500">
          Try again when the player joins a game or check their match history
          instead.
        </p>
      </div>
    </div>
  );
}
