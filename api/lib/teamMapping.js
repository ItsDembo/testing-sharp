/**
 * Comprehensive team name mapping for accurate sports data display
 * Cross-referenced with MSN Sports and official league data
 */

// MLB Team Mapping
const MLB_TEAMS = {
  // American League East
  'baltimore': 'Baltimore Orioles',
  'boston': 'Boston Red Sox', 
  'new york': 'New York Yankees',
  'tampa bay': 'Tampa Bay Rays',
  'toronto': 'Toronto Blue Jays',
  
  // American League Central
  'chicago': 'Chicago White Sox',
  'cleveland': 'Cleveland Guardians',
  'detroit': 'Detroit Tigers',
  'kansas city': 'Kansas City Royals',
  'minnesota': 'Minnesota Twins',
  
  // American League West
  'houston': 'Houston Astros',
  'los angeles': 'Los Angeles Angels',
  'oakland': 'Oakland Athletics',
  'seattle': 'Seattle Mariners',
  'texas': 'Texas Rangers',
  
  // National League East
  'atlanta': 'Atlanta Braves',
  'miami': 'Miami Marlins',
  'new york mets': 'New York Mets',
  'philadelphia': 'Philadelphia Phillies',
  'washington': 'Washington Nationals',
  
  // National League Central
  'chicago cubs': 'Chicago Cubs',
  'cincinnati': 'Cincinnati Reds',
  'milwaukee': 'Milwaukee Brewers',
  'pittsburgh': 'Pittsburgh Pirates',
  'st. louis': 'St. Louis Cardinals',
  'st louis': 'St. Louis Cardinals',
  
  // National League West
  'arizona': 'Arizona Diamondbacks',
  'colorado': 'Colorado Rockies',
  'los angeles dodgers': 'Los Angeles Dodgers',
  'san diego': 'San Diego Padres',
  'san francisco': 'San Francisco Giants',
  'sacramento': 'Oakland Athletics' // Temporary Sacramento location
};

// NFL Team Mapping
const NFL_TEAMS = {
  // AFC East
  'buffalo': 'Buffalo Bills',
  'miami': 'Miami Dolphins',
  'new england': 'New England Patriots',
  'new york jets': 'New York Jets',
  
  // AFC North
  'baltimore': 'Baltimore Ravens',
  'cincinnati': 'Cincinnati Bengals',
  'cleveland': 'Cleveland Browns',
  'pittsburgh': 'Pittsburgh Steelers',
  
  // AFC South
  'houston': 'Houston Texans',
  'indianapolis': 'Indianapolis Colts',
  'jacksonville': 'Jacksonville Jaguars',
  'tennessee': 'Tennessee Titans',
  
  // AFC West
  'denver': 'Denver Broncos',
  'kansas city': 'Kansas City Chiefs',
  'las vegas': 'Las Vegas Raiders',
  'los angeles chargers': 'Los Angeles Chargers',
  
  // NFC East
  'dallas': 'Dallas Cowboys',
  'new york giants': 'New York Giants',
  'philadelphia': 'Philadelphia Eagles',
  'washington': 'Washington Commanders',
  
  // NFC North
  'chicago': 'Chicago Bears',
  'detroit': 'Detroit Lions',
  'green bay': 'Green Bay Packers',
  'minnesota': 'Minnesota Vikings',
  
  // NFC South
  'atlanta': 'Atlanta Falcons',
  'carolina': 'Carolina Panthers',
  'new orleans': 'New Orleans Saints',
  'tampa bay': 'Tampa Bay Buccaneers',
  
  // NFC West
  'arizona': 'Arizona Cardinals',
  'los angeles rams': 'Los Angeles Rams',
  'san francisco': 'San Francisco 49ers',
  'seattle': 'Seattle Seahawks'
};

// NBA Team Mapping
const NBA_TEAMS = {
  // Eastern Conference - Atlantic
  'boston': 'Boston Celtics',
  'brooklyn': 'Brooklyn Nets',
  'new york': 'New York Knicks',
  'philadelphia': 'Philadelphia 76ers',
  'toronto': 'Toronto Raptors',
  
  // Eastern Conference - Central
  'chicago': 'Chicago Bulls',
  'cleveland': 'Cleveland Cavaliers',
  'detroit': 'Detroit Pistons',
  'indiana': 'Indiana Pacers',
  'milwaukee': 'Milwaukee Bucks',
  
  // Eastern Conference - Southeast
  'atlanta': 'Atlanta Hawks',
  'charlotte': 'Charlotte Hornets',
  'miami': 'Miami Heat',
  'orlando': 'Orlando Magic',
  'washington': 'Washington Wizards',
  
  // Western Conference - Northwest
  'denver': 'Denver Nuggets',
  'minnesota': 'Minnesota Timberwolves',
  'oklahoma city': 'Oklahoma City Thunder',
  'portland': 'Portland Trail Blazers',
  'utah': 'Utah Jazz',
  
  // Western Conference - Pacific
  'golden state': 'Golden State Warriors',
  'los angeles clippers': 'Los Angeles Clippers',
  'los angeles lakers': 'Los Angeles Lakers',
  'phoenix': 'Phoenix Suns',
  'sacramento': 'Sacramento Kings',
  
  // Western Conference - Southwest
  'dallas': 'Dallas Mavericks',
  'houston': 'Houston Rockets',
  'memphis': 'Memphis Grizzlies',
  'new orleans': 'New Orleans Pelicans',
  'san antonio': 'San Antonio Spurs'
};

// NHL Team Mapping
const NHL_TEAMS = {
  // Eastern Conference - Atlantic
  'boston': 'Boston Bruins',
  'buffalo': 'Buffalo Sabres',
  'detroit': 'Detroit Red Wings',
  'florida': 'Florida Panthers',
  'montreal': 'Montreal Canadiens',
  'ottawa': 'Ottawa Senators',
  'tampa bay': 'Tampa Bay Lightning',
  'toronto': 'Toronto Maple Leafs',
  
  // Eastern Conference - Metropolitan
  'carolina': 'Carolina Hurricanes',
  'columbus': 'Columbus Blue Jackets',
  'new jersey': 'New Jersey Devils',
  'new york islanders': 'New York Islanders',
  'new york rangers': 'New York Rangers',
  'philadelphia': 'Philadelphia Flyers',
  'pittsburgh': 'Pittsburgh Penguins',
  'washington': 'Washington Capitals',
  
  // Western Conference - Central
  'chicago': 'Chicago Blackhawks',
  'colorado': 'Colorado Avalanche',
  'dallas': 'Dallas Stars',
  'minnesota': 'Minnesota Wild',
  'nashville': 'Nashville Predators',
  'st. louis': 'St. Louis Blues',
  'st louis': 'St. Louis Blues',
  'winnipeg': 'Winnipeg Jets',
  
  // Western Conference - Pacific
  'anaheim': 'Anaheim Ducks',
  'calgary': 'Calgary Flames',
  'edmonton': 'Edmonton Oilers',
  'los angeles': 'Los Angeles Kings',
  'san jose': 'San Jose Sharks',
  'seattle': 'Seattle Kraken',
  'vancouver': 'Vancouver Canucks',
  'vegas': 'Vegas Golden Knights'
};

// MLS Team Mapping
const MLS_TEAMS = {
  'atlanta': 'Atlanta United FC',
  'austin': 'Austin FC',
  'charlotte': 'Charlotte FC',
  'chicago': 'Chicago Fire FC',
  'cincinnati': 'FC Cincinnati',
  'colorado': 'Colorado Rapids',
  'columbus': 'Columbus Crew',
  'dallas': 'FC Dallas',
  'dc': 'D.C. United',
  'houston': 'Houston Dynamo FC',
  'inter miami': 'Inter Miami CF',
  'kansas city': 'Sporting Kansas City',
  'lafc': 'Los Angeles FC',
  'la galaxy': 'LA Galaxy',
  'minnesota': 'Minnesota United FC',
  'montreal': 'CF Montréal',
  'nashville': 'Nashville SC',
  'new england': 'New England Revolution',
  'new york city': 'New York City FC',
  'new york': 'New York Red Bulls',
  'orlando': 'Orlando City SC',
  'philadelphia': 'Philadelphia Union',
  'portland': 'Portland Timbers',
  'real salt lake': 'Real Salt Lake',
  'utah': 'Real Salt Lake',
  'san jose': 'San Jose Earthquakes',
  'seattle': 'Seattle Sounders FC',
  'st. louis': 'St. Louis City SC',
  'st louis': 'St. Louis City SC',
  'toronto': 'Toronto FC',
  'vancouver': 'Vancouver Whitecaps FC'
};

// WNBA Team Mapping
const WNBA_TEAMS = {
  'atlanta': 'Atlanta Dream',
  'chicago': 'Chicago Sky',
  'connecticut': 'Connecticut Sun',
  'dallas': 'Dallas Wings',
  'indiana': 'Indiana Fever',
  'las vegas': 'Las Vegas Aces',
  'minnesota': 'Minnesota Lynx',
  'new york': 'New York Liberty',
  'phoenix': 'Phoenix Mercury',
  'seattle': 'Seattle Storm',
  'washington': 'Washington Mystics',
  'los angeles': 'Los Angeles Sparks'
};

// College Football Conferences and Teams (Major ones)
const COLLEGE_TEAMS = {
  // SEC
  'alabama': 'Alabama Crimson Tide',
  'arkansas': 'Arkansas Razorbacks',
  'auburn': 'Auburn Tigers',
  'florida': 'Florida Gators',
  'georgia': 'Georgia Bulldogs',
  'kentucky': 'Kentucky Wildcats',
  'lsu': 'LSU Tigers',
  'mississippi': 'Ole Miss Rebels',
  'mississippi state': 'Mississippi State Bulldogs',
  'missouri': 'Missouri Tigers',
  'south carolina': 'South Carolina Gamecocks',
  'tennessee': 'Tennessee Volunteers',
  'texas a&m': 'Texas A&M Aggies',
  'vanderbilt': 'Vanderbilt Commodores',
  
  // Big Ten
  'illinois': 'Illinois Fighting Illini',
  'indiana': 'Indiana Hoosiers',
  'iowa': 'Iowa Hawkeyes',
  'maryland': 'Maryland Terrapins',
  'michigan': 'Michigan Wolverines',
  'michigan state': 'Michigan State Spartans',
  'minnesota': 'Minnesota Golden Gophers',
  'nebraska': 'Nebraska Cornhuskers',
  'northwestern': 'Northwestern Wildcats',
  'ohio state': 'Ohio State Buckeyes',
  'penn state': 'Penn State Nittany Lions',
  'purdue': 'Purdue Boilermakers',
  'rutgers': 'Rutgers Scarlet Knights',
  'wisconsin': 'Wisconsin Badgers',
  
  // Big 12
  'baylor': 'Baylor Bears',
  'iowa state': 'Iowa State Cyclones',
  'kansas': 'Kansas Jayhawks',
  'kansas state': 'Kansas State Wildcats',
  'oklahoma': 'Oklahoma Sooners',
  'oklahoma state': 'Oklahoma State Cowboys',
  'tcu': 'TCU Horned Frogs',
  'texas': 'Texas Longhorns',
  'texas tech': 'Texas Tech Red Raiders',
  'west virginia': 'West Virginia Mountaineers',
  
  // ACC
  'boston college': 'Boston College Eagles',
  'clemson': 'Clemson Tigers',
  'duke': 'Duke Blue Devils',
  'florida state': 'Florida State Seminoles',
  'georgia tech': 'Georgia Tech Yellow Jackets',
  'louisville': 'Louisville Cardinals',
  'miami': 'Miami Hurricanes',
  'north carolina': 'North Carolina Tar Heels',
  'nc state': 'NC State Wolfpack',
  'notre dame': 'Notre Dame Fighting Irish',
  'pittsburgh': 'Pittsburgh Panthers',
  'syracuse': 'Syracuse Orange',
  'virginia': 'Virginia Cavaliers',
  'virginia tech': 'Virginia Tech Hokies',
  'wake forest': 'Wake Forest Demon Deacons',
  
  // Pac-12
  'arizona': 'Arizona Wildcats',
  'arizona state': 'Arizona State Sun Devils',
  'california': 'California Golden Bears',
  'colorado': 'Colorado Buffaloes',
  'oregon': 'Oregon Ducks',
  'oregon state': 'Oregon State Beavers',
  'stanford': 'Stanford Cardinal',
  'ucla': 'UCLA Bruins',
  'usc': 'USC Trojans',
  'utah': 'Utah Utes',
  'washington': 'Washington Huskies',
  'washington state': 'Washington State Cougars'
};

// League Mapping for proper display
const LEAGUE_MAPPING = {
  'mlb': 'MLB',
  'bbm': 'MLB', // Fix for RUWT's "BBM" which should be MLB
  'baseball': 'MLB',
  'nfl': 'NFL', 
  'nba': 'NBA',
  'nhl': 'NHL',
  'mls': 'MLS',
  'wnba': 'WNBA',
  'ncaaf': 'NCAAF',
  'ncaab': 'NCAAB',
  'soccer': 'Soccer',
  'football': 'Soccer',
  
  // European Soccer Leagues
  'premier league': 'Premier League',
  'epl': 'Premier League',
  'la liga': 'La Liga',
  'serie a': 'Serie A',
  'bundesliga': 'Bundesliga',
  'ligue 1': 'Ligue 1',
  'champions league': 'UEFA Champions League',
  'europa league': 'UEFA Europa League',
  
  // Other Sports
  'tennis': 'Tennis',
  'golf': 'Golf',
  'mma': 'MMA',
  'ufc': 'UFC',
  'boxing': 'Boxing',
  'esports': 'Esports'
};

/**
 * Get the full team name based on city/location and sport
 */
function getFullTeamName(cityName, sport, league) {
  if (!cityName) return cityName;
  
  const normalizedCity = cityName.toLowerCase().trim();
  const normalizedSport = sport?.toLowerCase() || '';
  const normalizedLeague = league?.toLowerCase() || '';
  
  // Try sport-specific mappings first
  if (normalizedSport === 'mlb' || normalizedLeague === 'mlb') {
    return MLB_TEAMS[normalizedCity] || cityName;
  }
  
  if (normalizedSport === 'nfl' || normalizedLeague === 'nfl') {
    return NFL_TEAMS[normalizedCity] || cityName;
  }
  
  if (normalizedSport === 'nba' || normalizedLeague === 'nba') {
    return NBA_TEAMS[normalizedCity] || cityName;
  }
  
  if (normalizedSport === 'nhl' || normalizedLeague === 'nhl') {
    return NHL_TEAMS[normalizedCity] || cityName;
  }
  
  if (normalizedSport === 'soccer' || normalizedSport === 'mls' || normalizedLeague === 'mls') {
    return MLS_TEAMS[normalizedCity] || cityName;
  }
  
  if (normalizedSport === 'wnba' || normalizedLeague === 'wnba') {
    return WNBA_TEAMS[normalizedCity] || cityName;
  }
  
  if (normalizedSport === 'ncaaf' || normalizedLeague === 'ncaaf') {
    return COLLEGE_TEAMS[normalizedCity] || cityName;
  }
  
  // Fallback to original name if no mapping found
  return cityName;
}

/**
 * Normalize league name for consistent display
 */
function normalizeLeague(league) {
  if (!league) return 'Unknown';
  
  const normalized = league.toLowerCase().trim();
  return LEAGUE_MAPPING[normalized] || league.toUpperCase();
}

/**
 * Create a properly formatted game string with full team names
 */
function formatGameString(awayTeam, homeTeam, sport, league) {
  const fullAwayTeam = getFullTeamName(awayTeam, sport, league);
  const fullHomeTeam = getFullTeamName(homeTeam, sport, league);
  
  return `${fullAwayTeam} vs ${fullHomeTeam}`;
}

/**
 * Extract and enhance team information from XML data
 */
function enhanceTeamData(gameData, sport, league) {
  const { awayTeam, homeTeam } = gameData;
  
  return {
    ...gameData,
    awayTeam: getFullTeamName(awayTeam, sport, league),
    homeTeam: getFullTeamName(homeTeam, sport, league),
    game: formatGameString(awayTeam, homeTeam, sport, league),
    event: formatGameString(awayTeam, homeTeam, sport, league),
    league: normalizeLeague(league),
    sport: normalizeLeague(sport)
  };
}

export {
  getFullTeamName,
  normalizeLeague,
  formatGameString,
  enhanceTeamData,
  MLB_TEAMS,
  NFL_TEAMS,
  NBA_TEAMS,
  NHL_TEAMS,
  MLS_TEAMS,
  WNBA_TEAMS,
  COLLEGE_TEAMS,
  LEAGUE_MAPPING
};
