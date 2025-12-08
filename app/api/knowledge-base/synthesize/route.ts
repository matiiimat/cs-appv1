import { type NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth/server';
import { getOrgAndUserByEmail } from '@/lib/tenant';
import { AIService } from '@/lib/ai-providers';
import { OrganizationSettingsModel } from '@/lib/models/organization-settings';
import { z } from 'zod';

const SynthesisRequestSchema = z.object({
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
  subject: z.string(),
  message: z.string(),
  ai_suggested_response: z.string().optional(),
  category: z.string().optional(),
});

interface SynthesisResponse {
  case_summary: string;
  resolution: string;
  category?: string;
}

async function requireAuth(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    throw new Error('UNAUTHORIZED');
  }
  const orgUser = await getOrgAndUserByEmail(session.user.email);
  if (!orgUser) throw new Error('ORG_NOT_FOUND');
  return orgUser;
}

export async function POST(request: NextRequest) {
  try {
    const orgUser = await requireAuth(request);

    const requestData = await request.json();
    const validatedData = SynthesisRequestSchema.parse(requestData);

    // Get AI configuration from organization settings
    const orgSettings = await OrganizationSettingsModel.findByOrganizationId(orgUser.organizationId);

    if (!orgSettings || !orgSettings.aiConfig) {
      return NextResponse.json({ error: "AI configuration is required" }, { status: 400 });
    }

    if (!orgSettings.aiConfig.apiKey && orgSettings.aiConfig.provider !== 'local') {
      return NextResponse.json({ error: "AI configuration is required" }, { status: 400 });
    }

    const aiService = new AIService(orgSettings.aiConfig);

    const systemPrompt = `You are an AI assistant that creates knowledge base entries from customer support cases.

Analyze the customer support case and create a comprehensive knowledge base entry that captures the essence of both the problem and its solution.

CRITICAL REQUIREMENTS:
1. Case Summary: Extract the CORE ISSUE from the customer's message, not just the subject line
2. Resolution: Focus on the ACTUAL SOLUTION provided in the AI response
3. Remove ALL personally identifiable information (names, emails, phone numbers, addresses)
4. Make it technically specific and actionable for future similar cases
5. Keep case_summary under 150 words, resolution under 250 words

RESPONSE FORMAT - You MUST return ONLY a valid JSON object in this exact format:
{
  "case_summary": "Detailed description of the customer's actual problem/issue based on their message content",
  "resolution": "Step-by-step solution or explanation of how the issue was resolved",
  "category": "Issue category if provided"
}

DO NOT include any text before or after the JSON object. DO NOT use markdown formatting.`;

    const userPrompt = `Please analyze this customer support case and create a knowledge base entry:

Customer Issue:
Subject: ${validatedData.subject}
Message: ${validatedData.message}

${validatedData.ai_suggested_response ? `Resolution Provided:
${validatedData.ai_suggested_response}` : 'No resolution provided yet.'}

${validatedData.category ? `Category: ${validatedData.category}` : ''}

Create a knowledge base entry that captures the essence of this issue and its resolution, removing any PII and making it useful for future similar cases.`;

    const responseText = await aiService.generateText(
      systemPrompt,
      userPrompt
    );

    // Parse the JSON response
    let synthesis: SynthesisResponse;
    try {
      // Clean the response text (remove any markdown formatting)
      const cleanedResponse = responseText.replace(/```json\n?|```\n?/g, '').trim();
      console.log('AI Response for synthesis:', cleanedResponse);

      // Security: Validate input size and safely parse JSON
      if (cleanedResponse.length > 50000) {
        throw new Error('AI response too large');
      }

      synthesis = JSON.parse(cleanedResponse);

      // Validate the parsed response structure and required fields
      if (!synthesis || typeof synthesis !== 'object') {
        throw new Error('Invalid response format from AI');
      }

      if (!synthesis.case_summary || !synthesis.resolution ||
          typeof synthesis.case_summary !== 'string' ||
          typeof synthesis.resolution !== 'string') {
        throw new Error('Missing or invalid required fields in AI response');
      }
    } catch (error) {
      console.error('Failed to parse AI synthesis response:', error);
      console.error('Raw AI response:', responseText);

      // Create a more intelligent fallback response
      const fallbackSummary = validatedData.message
        ? `Customer reported an issue: ${validatedData.message.substring(0, 100)}...`
        : `Customer support case regarding: ${validatedData.subject}`;

      const fallbackResolution = validatedData.ai_suggested_response
        ? `Resolution provided: ${validatedData.ai_suggested_response.substring(0, 150)}...`
        : "Issue requires manual resolution - no automated response available.";

      synthesis = {
        case_summary: fallbackSummary,
        resolution: fallbackResolution,
        category: validatedData.category,
      };
    }

    return NextResponse.json({ synthesis });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'ORG_NOT_FOUND') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    console.error('Error synthesizing knowledge base entry:', error);
    return NextResponse.json(
      { error: "Failed to synthesize knowledge base entry" },
      { status: 500 }
    );
  }
}