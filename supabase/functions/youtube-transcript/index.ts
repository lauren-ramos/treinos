// Edge Function: devolve as legendas (transcrição) de um vídeo do YouTube, quando existirem.
// Deploy: supabase functions deploy youtube-transcript
// Não inventa conteúdo: se o vídeo não tiver legendas acessíveis, devolve segments: [] e o motivo.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
  try {
    const { id } = await req.json()
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(id)) return json({ segments: [], reason: 'ID de vídeo inválido.' }, 400)

    const page = await fetch(`https://www.youtube.com/watch?v=${id}&hl=pt-BR`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' } })
    const html = await page.text()
    const m = html.match(/"captionTracks":(\[.*?\])/)
    if (!m) return json({ segments: [], reason: 'Este vídeo não tem legendas disponíveis.' })
    const tracks = JSON.parse(m[1]) as { baseUrl: string; languageCode: string; kind?: string }[]
    const pick = tracks.find((t) => t.languageCode.startsWith('pt')) ?? tracks.find((t) => t.languageCode.startsWith('en')) ?? tracks[0]
    if (!pick) return json({ segments: [], reason: 'Este vídeo não tem legendas disponíveis.' })

    const r = await fetch(pick.baseUrl.replace(/\\u0026/g, '&') + '&fmt=json3')
    const data = await r.json()
    const segments = (data.events ?? [])
      .filter((e: { segs?: unknown[] }) => e.segs)
      .map((e: { tStartMs: number; segs: { utf8: string }[] }) => ({
        start: Math.floor(e.tStartMs / 1000),
        text: e.segs.map((s) => s.utf8).join('').replace(/\s+/g, ' ').trim(),
      }))
      .filter((s: { text: string }) => s.text)
    return json({ segments, language: pick.languageCode, automatic: pick.kind === 'asr' })
  } catch (e) {
    return json({ segments: [], reason: String((e as Error).message ?? e) }, 500)
  }
})
