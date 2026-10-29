const SPORTSBOOK_PATTERNS = [
  { key: 'espnbet', re: /espn\s*bet/i },
  { key: 'fanduel', re: /fanduel/i },
  { key: 'draftkings', re: /draftkings/i },
  { key: 'betmgm', re: /betmgm/i },
  { key: 'caesars', re: /caesars/i },
  { key: 'fanatics', re: /fanatics/i },
];

const SPORTSBOOK_NAME_LINE_RE = /^(fanduel|draftkings|betmgm|caesars|espn\s*bet|fanatics)$/i;

// Matches bet-type header lines, optionally carrying the bet's overall odds,
// e.g. "Parlay", "Parlay (+520)", "3-Leg Parlay +890", "SGP", "Same Game Parlay".
// The odds capture group lets callers pull the top-level odds off these lines
// before discarding them as noise.
const BET_TYPE_HEADER_ODDS_RE = /^(?:\d+[\s-]*leg\s*parlay|same\s*game\s*parlay|parlay|sgp|single|straight\s*bet)\s*\(?\s*([+-]\d{2,6})?\s*\)?\s*$/i;

const MATCHUP_HEADER_RE = /^[A-Za-z0-9.&'\- ]+@[A-Za-z0-9.&'\- ]+$/;

const NOISE_KEYWORDS = [
  'download', 'app store', 'google play', 'bet responsibly', 'gambling problem',
  '1-800-gambler', 'must be 21', 'terms apply', 'powered by', 'share this bet',
  'my bet slip', 'promo', 'odds boost', 'gambling helpline', 'void where prohibited',
  'check out my bet', 'sportsbook',
];

const STAT_KEYWORD_RE = /\b(pass(?:ing)?\s*(?:yds|yards|tds?|completions|attempts)|rush(?:ing)?\s*(?:yds|yards|tds?|attempts)|rec(?:eiving|eptions|eption)?\s*(?:yds|yards|tds?)?|atts?|attempts|completions|interceptions?|ints?|sacks?|tackles?|touchdowns?|tds?|points?|pts|rebounds?|reb|assists?|ast|threes?|3-?pointers?|3pm|steals?|blocks?|turnovers?|shots?(?:\s*on\s*goal)?|sog|saves?|strikeouts?|ks|hits?|runs?|rbis?|walks?|outs?)\b/i;

const THRESHOLD_RE = /\d+(?:\.\d+)?\+/;
const OVER_UNDER_RE = /^(.*?)\b(over|under|o|u)\b\.?\s*(\d+(?:\.\d+)?)\s*(.*)$/i;
const SPREAD_RE = /^(.+?)\s+([+-]\d+(?:\.\d+)?)$/;
const ML_RE = /\bml\b|moneyline/i;

function parseAmount(str) {
  if (str == null) return null;
  const n = parseFloat(String(str).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function americanToDecimal(odds) {
  return odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
}

function formatOdds(odds) {
  return (odds > 0 ? '+' : '') + odds;
}

function detectSportsbook(text) {
  for (const { key, re } of SPORTSBOOK_PATTERNS) {
    if (re.test(text)) return key;
  }
  return null;
}

function detectBetTypeHint(text) {
  if (/same\s*game\s*parlay|\bsgp\b/i.test(text)) return 'sgp';
  if (/parlay/i.test(text)) return 'parlay';
  if (/\bsingle\b|straight\s*bet/i.test(text)) return 'single';
  return null;
}

function isUrlOrNoiseLine(line) {
  if (/^https?:\/\//i.test(line) || /www\./i.test(line)) return true;
  const lower = line.toLowerCase();
  return NOISE_KEYWORDS.some(k => lower.includes(k));
}

function matchStakeToWin(line) {
  const m = line.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*to\s*win\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  return { stake: parseAmount(m[1]), payout: parseAmount(m[2]) };
}

function matchWagerOnly(line) {
  const m = line.match(/^wager[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  return m ? parseAmount(m[1]) : null;
}

function matchToWinOnly(line) {
  const m = line.match(/^to\s*win[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  return m ? parseAmount(m[1]) : null;
}

function matchPayoutOnly(line) {
  const m = line.match(/^(?:payout|potential\s*payout|total\s*payout)[:\s]+\$?\s*([\d,]+(?:\.\d+)?)/i);
  return m ? parseAmount(m[1]) : null;
}

function matchStandaloneOdds(line) {
  const m = line.trim().match(/^([+-]\d{2,6})$/);
  return m ? parseInt(m[1], 10) : null;
}

// Classification order matters: threshold/stat-keyword props are checked
// before over/under totals, since a prop like "Cooper Kupp Over 6.5 Receptions"
// would otherwise look like a plain game total.
function classifyLeg(line) {
  const cleaned = line.replace(/\(\s*[+-]\d{2,4}\s*\)\s*$/, '').trim();

  if (THRESHOLD_RE.test(cleaned) || STAT_KEYWORD_RE.test(cleaned)) {
    return 'player_prop';
  }

  const ouMatch = cleaned.match(OVER_UNDER_RE);
  if (ouMatch) {
    const trailing = ouMatch[4].trim();
    return trailing.length > 0 ? 'player_prop' : 'total';
  }

  if (SPREAD_RE.test(cleaned) && !ML_RE.test(cleaned)) {
    return 'spread';
  }

  if (ML_RE.test(cleaned)) {
    return 'moneyline';
  }

  return 'player_prop';
}

function emptyData() {
  return {
    sportsbook: null,
    bet_type: null,
    odds: null,
    odds_decimal: null,
    stake: null,
    potential_payout: null,
    legs: [],
  };
}

export function parseBetText(text) {
  if (!text || !text.trim()) {
    return { ok: false, needsReview: true, data: emptyData() };
  }

  const sportsbook = detectSportsbook(text);
  const betTypeHint = detectBetTypeHint(text);

  let odds = null;
  let stake = null;
  let potential_payout = null;
  const legs = [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const cleanedForBook = line.replace(/\s+/g, ' ');

    if (SPORTSBOOK_NAME_LINE_RE.test(cleanedForBook)) continue;

    const headerOddsMatch = cleanedForBook.match(BET_TYPE_HEADER_ODDS_RE);
    if (headerOddsMatch) {
      if (headerOddsMatch[1] && odds == null) odds = parseInt(headerOddsMatch[1], 10);
      continue;
    }

    if (MATCHUP_HEADER_RE.test(cleanedForBook)) continue;
    if (isUrlOrNoiseLine(cleanedForBook)) continue;

    const stakePayout = matchStakeToWin(cleanedForBook);
    if (stakePayout) {
      stake = stakePayout.stake;
      potential_payout = stakePayout.payout;
      continue;
    }

    const wager = matchWagerOnly(cleanedForBook);
    if (wager != null) { stake = wager; continue; }

    const toWin = matchToWinOnly(cleanedForBook);
    if (toWin != null) { potential_payout = toWin; continue; }

    const payout = matchPayoutOnly(cleanedForBook);
    if (payout != null) { potential_payout = payout; continue; }

    const standaloneOdds = matchStandaloneOdds(cleanedForBook);
    if (standaloneOdds != null) {
      if (odds == null) odds = standaloneOdds;
      continue;
    }

    legs.push({
      selection: cleanedForBook.replace(/\(\s*[+-]\d{2,4}\s*\)\s*$/, '').trim(),
      type: classifyLeg(cleanedForBook),
      status: 'pending',
    });
  }

  const bet_type = betTypeHint || (legs.length > 1 ? 'parlay' : 'single');
  const odds_decimal = odds != null ? americanToDecimal(odds) : null;

  const needsReview = !sportsbook || odds == null || stake == null || legs.length === 0;

  return {
    ok: legs.length > 0,
    needsReview,
    data: {
      sportsbook,
      bet_type,
      odds: odds != null ? formatOdds(odds) : null,
      odds_decimal,
      stake,
      potential_payout,
      legs,
    },
  };
}
