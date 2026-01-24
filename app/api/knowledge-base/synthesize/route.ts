import { type NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth/server';
import { getOrgAndUserByEmail } from '@/lib/tenant';
import { AIService } from '@/lib/ai-providers';
import { canUseAIWithConfig } from '@/lib/ai-config-helpers';
import { TokenUsageModel } from '@/lib/models/token-usage';
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

    // Get AI configuration (handles managed vs BYOK plans)
    const aiCheck = await canUseAIWithConfig(orgUser.organizationId);

    if (!aiCheck.allowed || !aiCheck.config) {
      return NextResponse.json({
        error: aiCheck.reason || "AI configuration is required"
      }, { status: 400 });
    }

    const { config: aiConfig, isManaged } = aiCheck;
    const aiService = new AIService(aiConfig);

    const systemPrompt = `You are an AI assistant that creates knowledge base entries from customer support cases.

Your goal is to create entries that will help identify and resolve similar issues in the future.

CASE SUMMARY REQUIREMENTS:
The case_summary must answer these questions in a cohesive paragraph:
1. CONTEXT: What was the customer trying to do? (their goal or task)
2. PROBLEM: What went wrong or blocked them?
3. SYMPTOMS: What did they experience? (error messages, unexpected behavior, specific observations)
4. IMPACT: How did this affect them? (optional, include if mentioned)

RESOLUTION REQUIREMENTS:
1. Focus on the ACTUAL SOLUTION provided, not generic advice
2. Include specific steps, settings, or actions taken
3. Make it actionable for future similar cases

GENERAL RULES:
- Remove ALL personally identifiable information (names, emails, phone numbers, addresses, account IDs)
- Keep case_summary under 150 words, resolution under 250 words
- Be specific and technical, avoid vague language

EXAMPLES:

Example 1:
Customer Message: "I've been trying to export my report to PDF for the last hour but every time I click the export button nothing happens. I'm using Chrome on Windows. I need this for a meeting at 3pm!"
AI Response: "I understand the urgency! This is usually caused by pop-up blockers. Please go to Chrome Settings > Privacy > Site Settings > Pop-ups and allow pop-ups for our domain. Then try the export again."

Good Output:
{
  "case_summary": "Customer attempting to export a report to PDF format. Clicking the export button produced no response - no error message, no download, no visible feedback. Issue occurred in Chrome browser on Windows. Customer had time-sensitive need for the exported report.",
  "resolution": "Issue caused by browser pop-up blocker preventing the PDF export window from opening. Resolution: Guide customer to Chrome Settings > Privacy and Security > Site Settings > Pop-ups and redirects, then add the application domain to the allowed list. Export functionality works immediately after allowing pop-ups.",
  "category": "Technical"
}

Example 2:
Customer Message: "My subscription says it renewed but I'm locked out of premium features. I can see the charge on my credit card from yesterday for $49."
AI Response: "I've verified your payment was received successfully. There was a sync delay between our payment system and your account. I've manually refreshed your subscription status - please log out and back in, and you should see your premium features restored."

Good Output:
{
  "case_summary": "Customer's paid subscription not reflecting in account after successful renewal. Account displaying free tier limitations and locked premium features despite confirmed payment charge appearing on credit card statement.",
  "resolution": "Subscription sync delay between payment processor and application database. Verified payment receipt in payment system, then manually triggered subscription status refresh via admin panel. Customer instructed to log out and back in to see restored premium access.",
  "category": "Billing"
}

RESPONSE FORMAT - Return ONLY a valid JSON object:
{
  "case_summary": "Cohesive paragraph covering context, problem, and symptoms",
  "resolution": "Specific steps and actions that resolved the issue",
  "category": "Issue category if provided"
}

DO NOT include any text before or after the JSON object. DO NOT use markdown formatting.`;

    const userPrompt = `Analyze this customer support case and create a knowledge base entry:

CUSTOMER MESSAGE:
Subject: ${validatedData.subject}
Message: ${validatedData.message}

${validatedData.ai_suggested_response ? `RESOLUTION PROVIDED:
${validatedData.ai_suggested_response}` : 'No resolution provided yet - summarize the issue only.'}

${validatedData.category ? `Category: ${validatedData.category}` : ''}

Remember: The case_summary should explain what the customer was trying to do, what went wrong, and what symptoms they experienced. Focus on the PROBLEM, not the solution. Remove any PII (names, emails, account IDs, etc.).`;

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

    // Track token usage for managed plans
    if (isManaged) {
      const estimatedTokens = TokenUsageModel.estimateTokens(
        systemPrompt + userPrompt + responseText
      );
      await TokenUsageModel.incrementUsage(orgUser.organizationId, estimatedTokens);
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