// Riot API Response Types

export interface Account {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface Summoner {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface LeagueEntry {
  leagueId: string;
  summonerId: string;
  summonerName: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface TeammateInfo {
  puuid: string;
  gameName: string;
  rank?: string;
  tier?: string;
  leaguePoints?: number;
}

export interface Participant {
  puuid: string;
  championId: number;
  championName: string;
  neutralMinionsKilled?: number;
  riotIdTagline?: string;
  summonerName: string;
  teamId: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  totalMinionsKilled?: number;
  riotIdGameName: string;
  goldEarned: number;
  wardsPlaced: number;
  win: boolean;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  teammateRankInfo?: TeammateInfo;
}

export interface Team {
  teamId: number;
  win: boolean;
  bans: Ban[];
}

export interface Ban {
  championId: number;
  pickTurn: number;
}

export interface MatchInfo {
  gameCreation: number;
  gameDuration: number;
  gameEndTimestamp: number;
  gameId: number;
  gameMode: string;
  gameName: string;
  gameStartTimestamp: number;
  gameType: string;
  gameVersion: string;
  mapId: number;
  participants: Participant[];
  queueId: number;
  teams: Team[];
}

export interface MatchMetadata {
  dataVersion: string;
  matchId: string;
  participants: string[];
}

export interface Match {
  metadata: MatchMetadata;
  info: MatchInfo;
}

// Frontend Types
export interface SummonerData {
  account: Account;
  summoner: Summoner;
  matchHistory: string[];
  matches: Match[];
}

// Returned by GET /api/summoner (profile only — no matches)
export interface SummonerProfile {
  account: Account;
  summoner: Summoner;
}

// Returned by GET /api/summoner/:puuid/matches
export interface MatchHistoryData {
  puuid: string;
  matches: Match[];
  total: number;
}

export interface PlayerMatch {
  matchId: string;
  champion: string;
  championId?: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  cs?: number;
  csPerMinute?: number;
  enemies?: TeammateInfo[];
  gold: number;
  win: boolean;
  gameMode: string;
  gameDuration: number;
  gameDate: Date;
  itemIds?: number[];
  spellIds?: [number, number];
  teammates: TeammateInfo[];
}

export interface SearchFormData {
  gameName: string;
  tagLine: string;
  region: string;
}

export interface ApiError {
  message: string;
  status: number;
}

// Spectator API Types
export interface CurrentGameParticipant {
  championId: number;
  perks: Perks;
  profileIconId: number;
  bot: boolean;
  teamId: number;
  summonerName: string;
  summonerId: string;
  puuid: string;
  spell1Id: number;
  spell2Id: number;
  gameCustomizationObjects: GameCustomizationObject[];
}

export interface Perks {
  perkIds: number[];
  perkStyle: number;
  perkSubStyle: number;
}

export interface GameCustomizationObject {
  category: string;
  content: string;
}

export interface BannedChampion {
  pickTurn: number;
  championId: number;
  teamId: number;
}

export interface Observer {
  encryptionKey: string;
}

export interface CurrentGameInfo {
  gameId: number;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameLength: number;
  platformId: string;
  gameMode: string;
  bannedChampions: BannedChampion[];
  gameQueueConfigId: number;
  observers: Observer;
  participants: CurrentGameParticipant[];
}

// Frontend Types for Live Game
export interface LiveGameData {
  gameInfo: CurrentGameInfo;
  playerTeam: CurrentGameParticipant[];
  enemyTeam: CurrentGameParticipant[];
  searchedPlayer: CurrentGameParticipant;
}
