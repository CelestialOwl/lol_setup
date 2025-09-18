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

export interface Participant {
  puuid: string;
  championId: number;
  championName: string;
  summonerName: string;
  teamId: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
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

export interface PlayerMatch {
  matchId: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  gold: number;
  win: boolean;
  gameMode: string;
  gameDuration: number;
  gameDate: Date;
  teammates: string[];
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