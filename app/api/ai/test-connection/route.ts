import { NextResponse, type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, model } = await request.json() as {
      provider: 'openai' | 'anthropic';
      apiKey: string;
      model?: string;
    }

    if (!provider || !apiKey) {
      return NextResponse.json({ success: false, error: 'provider and apiKey are required' }, { status: 400 })
    }

    if (provider === 'openai') {
      // Strict test: minimal chat completion
      const testModel = model || 'gpt-3.5-turbo'
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: testModel,
          messages: [
            { role: 'system', content: 'You are a test system.' },
            { role: 'user', content: 'ping' }
          ],
          max_tokens: 1,
          temperature: 0,
        })
      })

      if (!resp.ok) {
        let msg = `OpenAI API error: ${resp.status} ${resp.statusText}`
        if (resp.status === 401) msg = 'Invalid API key. Please check your OpenAI API key.'
        if (resp.status === 429) msg = 'Rate limit exceeded. Please try again later.'
        try {
          const data = await resp.json()
          if (data?.error?.message) msg = `OpenAI API error: ${data.error.message}`
        } catch {}
        return NextResponse.json({ success: false, error: msg }, { status: 200 })
      }

      return NextResponse.json({ success: true })
    }

    if (provider === 'anthropic') {
      // Strict test: minimal message
      const testModel = model || 'claude-3-haiku-20240307'
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: testModel,
          max_tokens: 1,
          temperature: 0,
          messages: [ { role: 'user', content: 'ping' } ]
        })
      })

      if (!resp.ok) {
        let msg = `Anthropic API error: ${resp.status} ${resp.statusText}`
        if (resp.status === 401) msg = 'Invalid API key. Please check your Anthropic API key.'
        if (resp.status === 429) msg = 'Rate limit exceeded. Please try again later.'
        try {
          const data = await resp.json()
          if (data?.error?.message) msg = `Anthropic API error: ${data.error.message}`
        } catch {}
        return NextResponse.json({ success: false, error: msg }, { status: 200 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
