export async function onRequestPost(context) {
  const { request, env } = context;
  const { code, gen, resultData } = await request.json();

  const key = `CODE_${code.toUpperCase().trim()}`;
  const data = await env.MY_KV.get(key, { type: 'json' });
  if (!data) return new Response(JSON.stringify({ error: '授权码不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  // 核心修复：只要测试就扣次数；次数用完直接拒绝，不再区分是否同代际
  if (data.used_attempts >= data.max_attempts) {
    return new Response(JSON.stringify({ error: '测试次数已用完，无法再次测试' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  data.used_attempts += 1;            // 无条件 +1
  if (!data.results) data.results = {};
  data.results[gen] = resultData;     // 同代重测会覆盖为最新结果
  data.last_updated = new Date().toISOString();

  await env.MY_KV.put(key, JSON.stringify(data));

  return new Response(JSON.stringify({
    success: true,
    remaining: data.max_attempts - data.used_attempts,
    result: resultData
  }), { headers: { 'Content-Type': 'application/json' } });
}