import type {
  CurrentGameParticipant,
  LiveGameData,
  Match,
  Participant,
  SummonerData,
  Team,
} from "@/types/riot-api";

function createParticipant(overrides: Partial<Participant>): Participant {
  return {
    puuid: "participant-default",
    championId: 103,
    championName: "Ahri",
    neutralMinionsKilled: 0,
    riotIdGameName: "Summoner",
    riotIdTagline: "EUW",
    summonerName: "Summoner",
    teamId: 100,
    kills: 4,
    deaths: 3,
    assists: 7,
    totalDamageDealtToChampions: 18000,
    totalMinionsKilled: 145,
    goldEarned: 11200,
    wardsPlaced: 8,
    win: true,
    item0: 1056,
    item1: 6655,
    item2: 3020,
    item3: 3165,
    item4: 4645,
    item5: 3102,
    item6: 3340,
    summoner1Id: 4,
    summoner2Id: 12,
    ...overrides,
  };
}

function createCurrentGameParticipant(
  overrides: Partial<CurrentGameParticipant>
): CurrentGameParticipant {
  return {
    championId: 103,
    perks: {
      perkIds: [8112, 8126, 8138, 8135, 8210, 8237],
      perkStyle: 8100,
      perkSubStyle: 8200,
    },
    profileIconId: 29,
    bot: false,
    teamId: 100,
    summonerName: "Summoner",
    summonerId: "summoner-id",
    puuid: "participant-default",
    spell1Id: 4,
    spell2Id: 12,
    gameCustomizationObjects: [],
    ...overrides,
  };
}

function createTeam(teamId: number, win: boolean): Team {
  return {
    teamId,
    win,
    bans: [],
  };
}

function createMatch(
  matchId: string,
  referenceTime: number,
  offsetMs: number,
  playerOverrides: Partial<Participant>
): Match {
  const playerPuuid = "player-khoji";
  const endTime = referenceTime - offsetMs;
  const gameDuration = 31 * 60;

  const participants: Participant[] = [
    createParticipant({
      puuid: playerPuuid,
      riotIdGameName: "Khoji",
      riotIdTagline: "777",
      summonerName: "Khoji#777",
      championId: 103,
      championName: "Ahri",
      teamId: 100,
      kills: 9,
      deaths: 3,
      assists: 8,
      totalDamageDealtToChampions: 24876,
      totalMinionsKilled: 180,
      neutralMinionsKilled: 16,
      goldEarned: 14520,
      win: playerOverrides.win ?? true,
      item0: 6655,
      item1: 3020,
      item2: 3165,
      item3: 4645,
      item4: 3102,
      item5: 3135,
      item6: 3363,
      summoner1Id: 4,
      summoner2Id: 12,
      ...playerOverrides,
    }),
    createParticipant({
      puuid: "ally-top",
      riotIdGameName: "SkyScout",
      riotIdTagline: "EUW",
      summonerName: "SkyScout",
      championId: 266,
      championName: "Aatrox",
      teamId: 100,
      kills: 5,
      deaths: 4,
      assists: 6,
      teammateRankInfo: {
        puuid: "ally-top",
        gameName: "SkyScout",
        tier: "PLATINUM",
        rank: "IV",
        leaguePoints: 12,
      },
    }),
    createParticipant({
      puuid: "ally-jungle",
      riotIdGameName: "BluePath",
      riotIdTagline: "EUW",
      summonerName: "BluePath",
      championId: 64,
      championName: "Lee Sin",
      teamId: 100,
      summoner1Id: 4,
      summoner2Id: 11,
      teammateRankInfo: {
        puuid: "ally-jungle",
        gameName: "BluePath",
        tier: "EMERALD",
        rank: "II",
        leaguePoints: 71,
      },
    }),
    createParticipant({
      puuid: "ally-adc",
      riotIdGameName: "ArrowRain",
      riotIdTagline: "EUW",
      summonerName: "ArrowRain",
      championId: 222,
      championName: "Jinx",
      teamId: 100,
      summoner1Id: 4,
      summoner2Id: 7,
    }),
    createParticipant({
      puuid: "ally-support",
      riotIdGameName: "LanternCall",
      riotIdTagline: "EUW",
      summonerName: "LanternCall",
      championId: 412,
      championName: "Thresh",
      teamId: 100,
      summoner1Id: 3,
      summoner2Id: 4,
      item6: 3364,
    }),
    createParticipant({
      puuid: "enemy-top",
      riotIdGameName: "TopCrusher",
      riotIdTagline: "EUW",
      summonerName: "TopCrusher",
      championId: 58,
      championName: "Renekton",
      teamId: 200,
      win: !(playerOverrides.win ?? true),
    }),
    createParticipant({
      puuid: "enemy-jungle",
      riotIdGameName: "SmiteDiff",
      riotIdTagline: "EUW",
      summonerName: "SmiteDiff",
      championId: 121,
      championName: "Kha'Zix",
      teamId: 200,
      summoner2Id: 11,
      win: !(playerOverrides.win ?? true),
    }),
    createParticipant({
      puuid: "enemy-mid",
      riotIdGameName: "VoidCaller",
      riotIdTagline: "EUW",
      summonerName: "VoidCaller",
      championId: 161,
      championName: "Vel'Koz",
      teamId: 200,
      win: !(playerOverrides.win ?? true),
    }),
    createParticipant({
      puuid: "enemy-adc",
      riotIdGameName: "CritStorm",
      riotIdTagline: "EUW",
      summonerName: "CritStorm",
      championId: 81,
      championName: "Ezreal",
      teamId: 200,
      summoner2Id: 7,
      win: !(playerOverrides.win ?? true),
    }),
    createParticipant({
      puuid: "enemy-support",
      riotIdGameName: "AnchorDrop",
      riotIdTagline: "EUW",
      summonerName: "AnchorDrop",
      championId: 111,
      championName: "Nautilus",
      teamId: 200,
      summoner1Id: 3,
      summoner2Id: 4,
      item6: 3364,
      win: !(playerOverrides.win ?? true),
    }),
  ];

  return {
    metadata: {
      dataVersion: "2",
      matchId,
      participants: participants.map((participant) => participant.puuid),
    },
    info: {
      gameCreation: endTime - gameDuration * 1000,
      gameDuration,
      gameEndTimestamp: endTime,
      gameId: Number(matchId.replace(/\D/g, "").slice(-8)) || 10001,
      gameMode: "CLASSIC",
      gameName: `match-${matchId}`,
      gameStartTimestamp: endTime - gameDuration * 1000,
      gameType: "MATCHED_GAME",
      gameVersion: "15.5.1",
      mapId: 11,
      participants,
      queueId: 420,
      teams: [createTeam(100, playerOverrides.win ?? true), createTeam(200, !(playerOverrides.win ?? true))],
    },
  };
}

export function buildMockSummonerData(referenceTime = Date.now()): SummonerData {
  const matches = [
    createMatch("EUW1_100001", referenceTime, 2 * 24 * 60 * 60 * 1000, {
      win: true,
      kills: 9,
      deaths: 3,
      assists: 8,
    }),
    createMatch("EUW1_100002", referenceTime, 8 * 24 * 60 * 60 * 1000, {
      win: false,
      championId: 238,
      championName: "Zed",
      kills: 11,
      deaths: 7,
      assists: 4,
      totalDamageDealtToChampions: 22140,
      totalMinionsKilled: 196,
      neutralMinionsKilled: 0,
      goldEarned: 13980,
      item0: 6692,
      item1: 3142,
      item2: 3158,
      item3: 3814,
      item4: 6694,
      item5: 1037,
      item6: 3364,
      summoner2Id: 14,
    }),
  ];

  return {
    account: {
      puuid: "player-khoji",
      gameName: "Khoji",
      tagLine: "777",
    },
    summoner: {
      id: "summoner-id",
      accountId: "account-id",
      puuid: "player-khoji",
      profileIconId: 1116,
      revisionDate: referenceTime,
      summonerLevel: 609,
    },
    matchHistory: matches.map((match) => match.metadata.matchId),
    matches,
  };
}

export function buildMockLiveGameData(): LiveGameData {
  const searchedPlayer = createCurrentGameParticipant({
    puuid: "player-khoji",
    summonerName: "Khoji",
    championId: 238,
    teamId: 100,
    spell1Id: 4,
    spell2Id: 14,
  });

  const playerTeam = [
    searchedPlayer,
    createCurrentGameParticipant({
      puuid: "ally-top-live",
      summonerName: "SkyScout",
      championId: 266,
      teamId: 100,
      spell2Id: 12,
    }),
    createCurrentGameParticipant({
      puuid: "ally-jungle-live",
      summonerName: "BluePath",
      championId: 64,
      teamId: 100,
      spell2Id: 11,
    }),
    createCurrentGameParticipant({
      puuid: "ally-adc-live",
      summonerName: "ArrowRain",
      championId: 222,
      teamId: 100,
      spell2Id: 7,
    }),
    createCurrentGameParticipant({
      puuid: "ally-support-live",
      summonerName: "LanternCall",
      championId: 412,
      teamId: 100,
      spell1Id: 3,
    }),
  ];

  const enemyTeam = [
    createCurrentGameParticipant({
      puuid: "enemy-top-live",
      summonerName: "TopCrusher",
      championId: 58,
      teamId: 200,
    }),
    createCurrentGameParticipant({
      puuid: "enemy-jungle-live",
      summonerName: "SmiteDiff",
      championId: 121,
      teamId: 200,
      spell2Id: 11,
    }),
    createCurrentGameParticipant({
      puuid: "enemy-mid-live",
      summonerName: "VoidCaller",
      championId: 161,
      teamId: 200,
    }),
    createCurrentGameParticipant({
      puuid: "enemy-adc-live",
      summonerName: "CritStorm",
      championId: 81,
      teamId: 200,
      spell2Id: 7,
    }),
    createCurrentGameParticipant({
      puuid: "enemy-support-live",
      summonerName: "AnchorDrop",
      championId: 111,
      teamId: 200,
      spell1Id: 3,
    }),
  ];

  return {
    gameInfo: {
      gameId: 123456789,
      gameType: "MATCHED_GAME",
      gameStartTime: Date.now() - 14 * 60 * 1000,
      mapId: 11,
      gameLength: 14 * 60,
      platformId: "EUW1",
      gameMode: "CLASSIC",
      bannedChampions: [
        { pickTurn: 1, championId: 157, teamId: 100 },
        { pickTurn: 2, championId: 238, teamId: 200 },
      ],
      gameQueueConfigId: 420,
      observers: { encryptionKey: "observer-key" },
      participants: [...playerTeam, ...enemyTeam],
    },
    playerTeam,
    enemyTeam,
    searchedPlayer,
  };
}