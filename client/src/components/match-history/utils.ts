import { LeagueEntry, Participant, SummonerData, TeammateInfo } from "@/types/riot-api";
import { PlayerMatchCard, TeamRosterEntry } from "./types";

function leagueEntryToTeammateInfo(entry: LeagueEntry, puuid: string): TeammateInfo {
  return {
    puuid,
    gameName: "",
    tier: entry.tier,
    rank: entry.rank,
    leaguePoints: entry.leaguePoints,
  };
}

function toRosterEntry(
  participant: Participant,
  playerPuuid: string,
  ranksMap?: Record<string, LeagueEntry>
): TeamRosterEntry {
  const rankEntry = ranksMap?.[participant.puuid];
  return {
    championId: participant.championId,
    championName: participant.championName,
    gameName: participant.riotIdGameName || participant.summonerName,
    initialRank: rankEntry
      ? leagueEntryToTeammateInfo(rankEntry, participant.puuid)
      : participant.teammateRankInfo,
    isPlayer: participant.puuid === playerPuuid,
    puuid: participant.puuid,
    tagLine: participant.riotIdTagline,
  };
}

export function buildPlayerMatches(summonerData: SummonerData): PlayerMatchCard[] {
  const { account, matches, ranks } = summonerData;

  return matches.flatMap((match) => {
    const participants = match.info.participants;
    const playerData = participants.find(
      (participant) => participant.puuid === account.puuid
    );

    if (!playerData) {
      return [];
    }

    const allies = participants
      .filter((participant) => participant.teamId === playerData.teamId)
      .map((participant) => toRosterEntry(participant, account.puuid, ranks))
      .sort((left, right) => Number(right.isPlayer) - Number(left.isPlayer));

    const enemies = participants
      .filter((participant) => participant.teamId !== playerData.teamId)
      .map((participant) => toRosterEntry(participant, account.puuid, ranks));

    const cs =
      (playerData.totalMinionsKilled ?? 0) +
      (playerData.neutralMinionsKilled ?? 0);
    const csPerMinute =
      match.info.gameDuration > 0 ? cs / (match.info.gameDuration / 60) : 0;

    return {
      allies,
      assists: playerData.assists,
      champion: playerData.championName,
      championId: playerData.championId,
      cs,
      csPerMinute,
      damage: playerData.totalDamageDealtToChampions,
      deaths: playerData.deaths,
      enemies,
      gameDate: new Date(match.info.gameEndTimestamp || match.info.gameCreation),
      gameDuration: match.info.gameDuration,
      gameMode: match.info.gameMode,
      gold: playerData.goldEarned,
      itemIds: [
        playerData.item0,
        playerData.item1,
        playerData.item2,
        playerData.item3,
        playerData.item4,
        playerData.item5,
        playerData.item6,
      ],
      kills: playerData.kills,
      matchId: match.metadata.matchId,
      spellIds: [playerData.summoner1Id, playerData.summoner2Id],
      win: playerData.win,
    };
  });
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatTimeAgo(date: Date): string {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  return `${Math.floor(diffDays / 365)}y ago`;
}

export function formatKDA(
  kills: number,
  deaths: number,
  assists: number
): string {
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
  return kda.toFixed(2);
}

export function formatRank(
  rankData?: TeammateInfo
): string {
  if (!rankData?.tier || !rankData.rank) {
    return "Unranked";
  }

  if (
    rankData.tier === "MASTER" ||
    rankData.tier === "GRANDMASTER" ||
    rankData.tier === "CHALLENGER"
  ) {
    return `${rankData.tier.charAt(0) + rankData.tier.slice(1).toLowerCase()} ${
      rankData.leaguePoints || 0
    } LP`;
  }

  return `${rankData.tier.charAt(0) + rankData.tier.slice(1).toLowerCase()} ${
    rankData.rank
  } ${rankData.leaguePoints || 0} LP`;
}