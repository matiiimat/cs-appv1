/**
 * Rate Limiting Test Script
 * Tests that rate limiting is properly applied to protected endpoints
 */

const BASE_URL = 'http://localhost:3002'

// Test configurations for different endpoints
const testEndpoints = [
  {
    name: 'Auth Endpoint',
    url: '/api/auth/sign-in/guarded',
    method: 'POST',
    body: { email: 'test@example.com', callbackURL: '/app' },
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    description: '5 attempts per 15 minutes'
  },
  {
    name: 'AI Generation',
    url: '/api/generate-response',
    method: 'POST',
    body: {
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      subject: 'Test',
      message: 'Test message',
      agentName: 'Agent',
      agentSignature: 'Sig'
    },
    maxRequests: 10,
    windowMs: 60 * 1000,
    description: '10 requests per minute'
  },
  {
    name: 'Messages API',
    url: '/api/messages',
    method: 'POST',
    body: {
      customer_email: 'test@example.com',
      customer_name: 'Test',
      subject: 'Test',
      body: 'Test',
      message: 'Test',
      category: 'General'
    },
    maxRequests: 20,
    windowMs: 60 * 1000,
    description: '20 requests per minute'
  }
]

async function testRateLimit(endpoint) {
  console.log(`\n📍 Testing ${endpoint.name}`)
  console.log(`   Rate limit: ${endpoint.description}`)
  console.log(`   Making ${endpoint.maxRequests + 2} rapid requests...`)

  const results = []

  for (let i = 1; i <= endpoint.maxRequests + 2; i++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(endpoint.body)
      })

      const status = response.status
      const retryAfter = response.headers.get('retry-after')

      if (status === 429) {
        const data = await response.json()
        results.push({
          request: i,
          status,
          retryAfter,
          message: data.error
        })
        console.log(`   Request ${i}: ❌ BLOCKED (429) - Retry after ${retryAfter}s`)
      } else {
        results.push({
          request: i,
          status,
          message: status === 401 ? 'Unauthorized (expected)' : 'Request allowed'
        })
        console.log(`   Request ${i}: ✅ ALLOWED (${status})`)
      }
    } catch (error) {
      results.push({
        request: i,
        error: error.message
      })
      console.log(`   Request ${i}: ⚠️  ERROR - ${error.message}`)
    }
  }

  // Analyze results
  const blockedRequests = results.filter(r => r.status === 429)
  const expectedBlocks = 2 // Should block after maxRequests

  if (blockedRequests.length === expectedBlocks) {
    console.log(`   ✅ SUCCESS: Rate limiting working correctly (${blockedRequests.length} requests blocked)`)
  } else if (blockedRequests.length > 0) {
    console.log(`   ⚠️  PARTIAL: Some requests blocked (${blockedRequests.length}/${expectedBlocks})`)
  } else {
    console.log(`   ❌ FAILED: No rate limiting detected (might be auth failures)`)
  }

  return results
}

async function runAllTests() {
  console.log('🔒 RATE LIMITING SECURITY TEST')
  console.log('==============================')
  console.log('Testing rate limiting on critical endpoints...')

  for (const endpoint of testEndpoints) {
    await testRateLimit(endpoint)

    // Small delay between endpoint tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n📊 TEST SUMMARY')
  console.log('===============')
  console.log('Rate limiting should prevent:')
  console.log('  • Brute force attacks on authentication')
  console.log('  • API abuse and excessive AI usage')
  console.log('  • Email flooding and spam')
  console.log('  • DoS attacks on public endpoints')

  console.log('\n🎯 MANUAL VERIFICATION:')
  console.log('1. Try logging in more than 5 times in 15 minutes')
  console.log('2. Try generating AI responses rapidly')
  console.log('3. Check that legitimate users aren\'t blocked')
  console.log('4. Verify retry-after headers are present')
}

// Test instructions
console.log(`
🧪 RATE LIMITING TEST INSTRUCTIONS

1. START YOUR DEV SERVER:
   npm run dev

2. RUN AUTOMATED TESTS:
   node test-rate-limiting.js

3. MANUAL CURL TEST (Auth):
   # Make 6 rapid requests
   for i in {1..6}; do
     curl -X POST ${BASE_URL}/api/auth/sign-in/guarded \\
       -H "Content-Type: application/json" \\
       -d '{"email":"test@example.com"}' \\
       -w "\\nRequest $i: Status %{http_code}\\n"
   done

4. EXPECTED RESULTS:
   - First 5 auth requests: Allowed (or 404 if email not found)
   - 6th auth request: 429 Too Many Requests
   - AI endpoints: 10 per minute max
   - Message endpoints: Variable limits

5. VERIFY HEADERS:
   Check for rate limit headers in responses:
   - Retry-After: seconds until retry
   - X-RateLimit-Limit: max requests
   - X-RateLimit-Remaining: requests left
   - X-RateLimit-Reset: window reset time
`)

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}