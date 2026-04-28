import { Participant, SummonerData, TeammateInfo } from "@/types/riot-api";

export interface MatchHistoryProps {
  summonerData: SummonerData;
  region: string;
}

export interface TeamRosterEntry {
  championId: number;
  championName: string;
  gameName: string;
  initialRank?: TeammateInfo;
  isPlayer: boolean;
  puuid: string;
  tagLine?: string;
}

export interface PlayerMatchCard {
  allies: TeamRosterEntry[];
  assists: number;
  champion: string;
  championId: number;
  cs: number;
  csPerMinute: number;
  damage: number;
  deaths: number;
  enemies: TeamRosterEntry[];
  gameDate: Date;
  gameDuration: number;
  gameMode: string;
  gold: number;
  itemIds: number[];
  kills: number;
  matchId: string;
  spellIds: [number, number];
  win: boolean;
}

export interface RankLookupState {
  data?: TeammateInfo;
  status: "error" | "loaded" | "loading";
}

export type RankHoverHandler = (participant: TeamRosterEntry) => void | Promise<void>;

export type ParticipantRankLabelGetter = (participant: TeamRosterEntry) => string;

export type ParticipantRankStateGetter = (
  participant: TeamRosterEntry
) => RankLookupState | undefined;

export type RosterEntryFactory = (participant: Participant, playerPuuid: string) => TeamRosterEntry;