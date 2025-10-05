import { NextResponse, type NextRequest } from "next/server"
import { OrganizationSettingsModel } from "@/lib/models/organization-settings"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

async function requireOrgId(headers: Headers): Promise<string> {
  const session = await auth.api.getSession({ headers })
  if (!session?.user?.email) throw new Error('UNAUTHORIZED')
  const orgUser = await getOrgAndUserByEmail(session.user.email)
  if (!orgUser) throw new Error('ORG_NOT_FOUND')
  return orgUser.organizationId
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const checkConnectivity = url.searchParams.get('checkConnectivity') === 'true'

    const orgId = await requireOrgId(request.headers)
    const settings = await OrganizationSettingsModel.findByOrganizationId(orgId)

    const hasSavedSettings = Boolean(settings)
    const provider = settings?.aiConfig?.provider || 'local'
    const model = settings?.aiConfig?.model || ''
    const apiKey = settings?.aiConfig?.apiKey || ''
    const localEndpoint = settings?.aiConfig?.localEndpoint || ''

    const isLocal = provider === 'local'
    const isRemote = provider === 'openai' || provider === 'anthropic'

    const hasKey = isRemote ? Boolean(apiKey && apiKey.trim() !== '') : false
    const hasEndpoint = isLocal ? Boolean(localEndpoint && localEndpoint.trim() !== '') : false
    const hasModel = Boolean(model && model.trim() !== '')

    const reasons: string[] = []
    if (!hasSavedSettings) reasons.push('No saved AI settings')
    if (isRemote && !hasKey) reasons.push('API key is missing')
    if (isLocal && !hasEndpoint) reasons.push('Local AI server URL is missing')
    if (!hasModel) reasons.push('Model is missing')

    const configured = (isLocal && hasEndpoint && hasModel) || (isRemote && hasKey && hasModel)

    let connectivityOk: boolean | undefined = undefined

    if (checkConnectivity && configured) {
      try {
        if (provider === 'openai') {
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
          connectivityOk = resp.ok
          if (!resp.ok) {
            reasons.push(`OpenAI connectivity failed: ${resp.status} ${resp.statusText}`)
          }
        } else if (provider === 'anthropic') {
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
          connectivityOk = resp.ok
          if (!resp.ok) {
            reasons.push(`Anthropic connectivity failed: ${resp.status} ${resp.statusText}`)
          }
        } else if (provider === 'local') {
          const resp = await fetch(`${localEndpoint}/v1/models`, { method: 'GET' })
          connectivityOk = resp.ok
          if (!resp.ok) {
            reasons.push(`Local AI connectivity failed: ${resp.status} ${resp.statusText}`)
          }
        }
      } catch (e) {
        connectivityOk = false
        const msg = e instanceof Error ? e.message : 'Connectivity check failed'
        reasons.push(msg)
      }
    }

    return NextResponse.json({
      configured,
      provider,
      model,
      hasKey,
      hasEndpoint,
      hasSavedSettings,
      reasons,
      ...(checkConnectivity ? { connectivityOk } : {}),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ configured: false, reasons: ['Unauthorized'] }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ configured: false, reasons: ['Organization not found'] }, { status: 404 })
    }
    console.error('AI status error:', error)
    return NextResponse.json({ configured: false, reasons: ['Status check failed'] }, { status: 500 })
  }
}
