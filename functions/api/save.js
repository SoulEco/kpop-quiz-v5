export async function onRequestPost(context) {
  const { request, env } = context;
  const { code, gen, resultData } = await request.json();

  const key = `CODE_${code.toUpperCase().trim()}`;
  const data = await env.MY_KV.get(key, { type: 'json' });
  if (!data) return new Response(JSON.stringify({ error: '授权码不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  if (data.used_attempts >= data.max_attempts) {
    return new Response(JSON.stringify({ error: '测试次数已用完，无法再次测试' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  data.used_attempts += 1;
  
  // 🚨 核心修改：改为数组存储，保留每次测试历史
  if (!data.results) data.results = [];
  data.results.push({
    gen: gen,
    result: resultData,
    timestamp: new Date().toISOString()
  });

  // 如果超过最大次数，移除最老的记录（保持数组长度 <= max_attempts）
  if (data.results.length > data.max_attempts) {
    data.results.shift();
  }

  await env.MY_KV.put(key, JSON.stringify(data));

  return new Response(JSON.stringify({
    success: true,
    remaining: data.max_attempts - data.used_attempts,
    result: resultData // 返回当前这次的结果
  }), { headers: { 'Content-Type': 'application/json' } });
}