import type { Request, Response } from "express";
import { Router } from "express";

export const scoresRouter = Router();

// ScoreItem type matching the frontend
export type ScoreItem = {
  id: string;
  league: string;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status: "LIVE" | "FINAL" | "UPCOMING";
  detail?: string;
  startTime?: string;
};

// Replace with your service that merges/validates from AYWI?! + MSN
async function getLive(): Promise<ScoreItem[]> {
  try {
    const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';
    const BASE_URL = 'https://areyouwatchingthis.com';
    
    const gamesResponse = await fetch(`${BASE_URL}/api/games?key=${API_KEY}`, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'SharpShot-Scores/1.0'
      }
    });

    if (!gamesResponse.ok) {
      throw new Error(`Games API error: ${gamesResponse.status}`);
    }

    const gamesXml = await gamesResponse.text();
    const liveGames = parseLiveGamesFromXml(gamesXml);
    
    return liveGames.map(game => ({
      id: game.id,
      league: game.league,
      home: game.homeTeam,
      away: game.awayTeam,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      status: "LIVE" as const,
      detail: game.status,
      startTime: game.startTime
    }));
  } catch (error) {
    console.error('Error fetching live games:', error);
    return [];
  }
}

async function getUpcoming(): Promise<ScoreItem[]> {
  try {
    const API_KEY = '3e8b23fdd1b6030714b9320484d7367b';
    const BASE_URL = 'https://areyouwatchingthis.com';
    
    const gamesResponse = await fetch(`${BASE_URL}/api/games?key=${API_KEY}`, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'SharpShot-Scores/1.0'
      }
    });

    if (!gamesResponse.ok) {
      throw new Error(`Games API error: ${gamesResponse.status}`);
    }

    const gamesXml = await gamesResponse.text();
    const upcomingGames = parseUpcomingGamesFromXml(gamesXml);
    
    return upcomingGames.map(game => ({
      id: game.id,
      league: game.league,
      home: game.homeTeam,
      away: game.awayTeam,
      homeScore: undefined,
      awayScore: undefined,
      status: "UPCOMING" as const,
      detail: game.gameTime,
      startTime: game.gameTime
    }));
  } catch (error) {
    console.error('Error fetching upcoming games:', error);
    return [];
  }
}

// Parse live games from XML
function parseLiveGamesFromXml(xmlString: string): any[] {
  const liveGames = [];
  const gameMatches = xmlString.match(/<game[^>]*>.*?<\/game>/gs) || [];
  
  gameMatches.forEach((gameXml) => {
    const statusMatch = gameXml.match(/<timeLeft>([^<]*)<\/timeLeft>/) || ['', ''];
    const isLive = statusMatch[1] && !statusMatch[1].toLowerCase().includes('final') && 
                   !statusMatch[1].toLowerCase().includes('scheduled') && 
                   statusMatch[1].trim() !== '';
    
    if (isLive) {
      const idMatch = gameXml.match(/id="([^"]*)"/) || ['', ''];
      const leagueMatch = gameXml.match(/leagueCode="([^"]*)"/) || ['', ''];
      const homeTeamMatch = gameXml.match(/<team[^>]*homeID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>/s);
      const awayTeamMatch = gameXml.match(/<team[^>]*visitorID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>/s);
      const homeScoreMatch = gameXml.match(/<team[^>]*homeID[^>]*[^>]*score="([^"]*)"/) || ['', null];
      const awayScoreMatch = gameXml.match(/<team[^>]*visitorID[^>]*[^>]*score="([^"]*)"/) || ['', null];
      
      if (homeTeamMatch && awayTeamMatch) {
        liveGames.push({
          id: idMatch[1],
          league: leagueMatch[1],
          homeTeam: `${homeTeamMatch[1].trim()} ${homeTeamMatch[2].trim()}`.trim(),
          awayTeam: `${awayTeamMatch[1].trim()} ${awayTeamMatch[2].trim()}`.trim(),
          homeScore: homeScoreMatch[1] ? parseInt(homeScoreMatch[1]) : undefined,
          awayScore: awayScoreMatch[1] ? parseInt(awayScoreMatch[1]) : undefined,
          status: statusMatch[1],
          startTime: new Date().toISOString()
        });
      }
    }
  });
  
  return liveGames;
}

// Parse upcoming games from XML
function parseUpcomingGamesFromXml(xmlString: string): any[] {
  const upcomingGames = [];
  const gameMatches = xmlString.match(/<game[^>]*>.*?<\/game>/gs) || [];
  
  gameMatches.forEach((gameXml) => {
    const statusMatch = gameXml.match(/<timeLeft>([^<]*)<\/timeLeft>/) || ['', ''];
    const dateMatch = gameXml.match(/<date>([^<]*)<\/date>/) || ['', ''];
    const isUpcoming = statusMatch[1] && statusMatch[1].toLowerCase().includes('scheduled');
    
    if (isUpcoming) {
      const idMatch = gameXml.match(/id="([^"]*)"/) || ['', ''];
      const leagueMatch = gameXml.match(/leagueCode="([^"]*)"/) || ['', ''];
      const homeTeamMatch = gameXml.match(/<team[^>]*homeID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>/s);
      const awayTeamMatch = gameXml.match(/<team[^>]*visitorID[^>]*>.*?<city>([^<]*)<\/city>.*?<name>([^<]*)<\/name>/s);
      
      if (homeTeamMatch && awayTeamMatch) {
        upcomingGames.push({
          id: idMatch[1],
          league: leagueMatch[1],
          homeTeam: `${homeTeamMatch[1].trim()} ${homeTeamMatch[2].trim()}`.trim(),
          awayTeam: `${awayTeamMatch[1].trim()} ${awayTeamMatch[2].trim()}`.trim(),
          gameTime: dateMatch[1]
        });
      }
    }
  });
  
  return upcomingGames;
}

scoresRouter.get("/live", async (_: Request, res: Response) => {
  try {
    const liveGames = await getLive();
    res.json(liveGames);
  } catch (error) {
    console.error('Error in /live endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch live games' });
  }
});

scoresRouter.get("/upcoming", async (_: Request, res: Response) => {
  try {
    const upcomingGames = await getUpcoming();
    res.json(upcomingGames);
  } catch (error) {
    console.error('Error in /upcoming endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming games' });
  }
});

// SSE stream
scoresRouter.get("/stream", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
  
  const send = (items: ScoreItem[]) => res.write(`data: ${JSON.stringify({ items })}\n\n`);
  
  try {
    const live = await getLive();
    send(live.length ? live : await getUpcoming());
    
    const interval = setInterval(async () => {
      try {
        const live = await getLive();
        send(live.length ? live : await getUpcoming());
      } catch (error) {
        console.error('Error in stream interval:', error);
      }
    }, 5000);
    
    req.on("close", () => clearInterval(interval));
  } catch (error) {
    console.error('Error in /stream endpoint:', error);
    res.end();
  }
});
