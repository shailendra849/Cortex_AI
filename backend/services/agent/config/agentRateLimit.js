import redis from '../../../shared/redis/redis.js';

const LIMITS = {
  chat: 20,
  coding: 5,
  pdf: 5,
  ppt: 5,
  image: 3,
  search: 5,
};

const INCREMENT_AND_TTL = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], 60)
  end
  return { count, redis.call('TTL', KEYS[1]) }
`;

export const checkAgentLimit = async (userId, agent) => {
  const max = LIMITS[agent] ?? LIMITS.chat;

  const key = `rate:${agent}:${userId}`;

  const [count, ttl] = await redis.eval(INCREMENT_AND_TTL, 1, key);

  if (count > max) {
    const minutes = Math.floor(ttl / 60);
    const seconds = ttl % 60;

    const time = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const error = new Error(`Rate limit exceeded for ${agent}.`);

    error.status = 429;

    error.data = {
      success: false,
      agent,
      limit: max,
      remainingTime: ttl,
      retryAfter: time,
      message: `You have reached the ${agent} limit (${max} requests/minute). Try again in ${time}.`,
    };

    throw error;
  }

  return {
    remaining: max - count,
    limit: max,
  };
};
