// Simple in-memory usage tracking (resets on server restart)
// In production, use Redis or database for persistence

const USAGE_LIMITS = {
  DAILY_REQUESTS: 10, // Max 10 requests per day per IP
  DAILY_TOKENS: 15000, // Max 15k tokens per day per IP
};

const usageStore = new Map(); // IP -> { requests: number, tokens: number, lastReset: Date }

function getIP(request) {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function resetIfNeeded(ip, usage) {
  const now = new Date();
  const lastReset = new Date(usage.lastReset);
  
  // Reset if it's a new day (midnight)
  if (now.toDateString() !== lastReset.toDateString()) {
    usage.requests = 0;
    usage.tokens = 0;
    usage.lastReset = now;
  }
}

function checkUsageLimit(ip, tokens = 0) {
  const usage = usageStore.get(ip) || { 
    requests: 0, 
    tokens: 0, 
    lastReset: new Date() 
  };
  
  resetIfNeeded(ip, usage);
  
  if (usage.requests >= USAGE_LIMITS.DAILY_REQUESTS) {
    return { allowed: false, reason: 'daily_requests' };
  }
  
  if (usage.tokens + tokens > USAGE_LIMITS.DAILY_TOKENS) {
    return { allowed: false, reason: 'daily_tokens' };
  }
  
  return { allowed: true, usage };
}

function recordUsage(ip, tokens = 0) {
  const usage = usageStore.get(ip) || { 
    requests: 0, 
    tokens: 0, 
    lastReset: new Date() 
  };
  
  resetIfNeeded(ip, usage);
  
  usage.requests += 1;
  usage.tokens += tokens;
  usage.lastReset = new Date();
  
  usageStore.set(ip, usage);
  return usage;
}

export { USAGE_LIMITS, checkUsageLimit, recordUsage, getIP };
