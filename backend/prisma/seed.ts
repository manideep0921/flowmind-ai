// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
      plan: "PRO",
    },
  });

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@flowmind.ai" },
    update: {},
    create: {
      email: "demo@flowmind.ai",
      name: "Demo User",
      passwordHash: await bcrypt.hash("demo1234", 12),
      role: "OWNER",
      organizationId: org.id,
    },
  });

  // Create API key
  const apiKey = await prisma.apiKey.create({
    data: {
      name: "Default API Key",
      key: "fm_" + randomBytes(32).toString("hex"),
      organizationId: org.id,
    },
  });

  // Create sample workflows
  const workflows = await Promise.all([
    prisma.workflow.create({
      data: {
        name: "Lead Capture → CRM Sync",
        description: "Captures leads from web form and syncs to HubSpot",
        source: "ZAPIER",
        externalId: "zap-001",
        organizationId: org.id,
        status: "ACTIVE",
        config: { expectedFrequencyHours: 1 },
      },
    }),
    prisma.workflow.create({
      data: {
        name: "Stripe Payment → Slack Notify",
        description: "Notifies Slack channel on payment events",
        source: "MAKE",
        externalId: "make-001",
        organizationId: org.id,
        status: "ACTIVE",
        config: { expectedFrequencyHours: 4 },
      },
    }),
    prisma.workflow.create({
      data: {
        name: "Support Ticket → Linear Issue",
        description: "Creates Linear issues from Intercom support tickets",
        source: "N8N",
        externalId: "n8n-001",
        organizationId: org.id,
        status: "ACTIVE",
      },
    }),
    prisma.workflow.create({
      data: {
        name: "Daily Report Generator",
        description: "Generates and emails daily analytics report",
        source: "INTERNAL",
        organizationId: org.id,
        status: "ACTIVE",
        config: { expectedFrequencyHours: 24 },
      },
    }),
  ]);

  // Create sample executions with failures
  const now = Date.now();
  for (const workflow of workflows) {
    // Create 20 executions per workflow over last 7 days
    for (let i = 0; i < 20; i++) {
      const startedAt = new Date(now - Math.random() * 7 * 86400000);
      const failed = Math.random() < 0.25; // 25% failure rate
      const durationMs = Math.round(1000 + Math.random() * 30000);

      const execution = await prisma.execution.create({
        data: {
          workflowId: workflow.id,
          status: failed ? "FAILED" : "SUCCESS",
          startedAt,
          finishedAt: new Date(startedAt.getTime() + durationMs),
          durationMs,
          errorMessage: failed ? getSampleError() : null,
          rawLogs: JSON.stringify({ steps: [], timestamp: startedAt }),
        },
      });

      if (failed) {
        const category = getSampleCategory();
        await prisma.failureAnalysis.create({
          data: {
            executionId: execution.id,
            rootCause: getSampleRootCause(category),
            explanation: getSampleExplanation(category, workflow.name),
            technicalDetails: getSampleTechnicalDetails(category),
            confidenceScore: 0.7 + Math.random() * 0.3,
            severity: Math.random() < 0.3 ? "HIGH" : "MEDIUM",
            category,
            suggestedFixes: getSampleFixes(category),
            businessImpact: getBusinessImpact(workflow.name),
          },
        });
      }
    }
  }

  // Create sample alerts
  await prisma.alert.create({
    data: {
      workflowId: workflows[0].id,
      type: "FAILURE",
      severity: "HIGH",
      title: "OAuth token expired",
      message: "HubSpot API returned 401 because OAuth token expired 3 hours ago. 43 leads were not synced to CRM.",
      status: "OPEN",
    },
  });

  await prisma.alert.create({
    data: {
      workflowId: workflows[1].id,
      type: "PREDICTION",
      severity: "MEDIUM",
      title: "High failure risk predicted",
      message: "This workflow has 78% probability of failing due to Stripe API rate-limit trend detected over the last 6 hours.",
      status: "OPEN",
    },
  });

  console.log(`✅ Seeded successfully!`);
  console.log(`📧 Login: demo@flowmind.ai / demo1234`);
  console.log(`🔑 API Key: ${apiKey.key}`);
}

function getSampleError(): string {
  const errors = [
    "Request failed with status code 401: Unauthorized",
    "Rate limit exceeded: 429 Too Many Requests",
    "Connection timeout after 30000ms",
    "Unexpected token in JSON response",
    "Schema validation failed: field 'email' is required",
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

function getSampleCategory(): any {
  const cats = ["AUTH_ERROR", "RATE_LIMIT", "TIMEOUT", "SCHEMA_CHANGE", "NETWORK_ERROR"];
  return cats[Math.floor(Math.random() * cats.length)];
}

function getSampleRootCause(category: string): string {
  const causes: Record<string, string> = {
    AUTH_ERROR: "OAuth access token has expired and was not automatically refreshed",
    RATE_LIMIT: "API rate limit exceeded due to high request volume",
    TIMEOUT: "Downstream service did not respond within the configured timeout window",
    SCHEMA_CHANGE: "Third-party API response schema changed — expected field is missing",
    NETWORK_ERROR: "DNS resolution failed for the target API endpoint",
  };
  return causes[category] || "Unknown error";
}

function getSampleExplanation(category: string, workflowName: string): string {
  const explanations: Record<string, string> = {
    AUTH_ERROR: `The OAuth token used to connect to your CRM expired 3 hours ago. "${workflowName}" stopped working silently because no auto-refresh was configured.`,
    RATE_LIMIT: `Your API is being called too frequently. The third-party service returned 429 Too Many Requests and "${workflowName}" cannot proceed until the rate limit resets.`,
    TIMEOUT: `The downstream API did not respond in time. "${workflowName}" waited 30 seconds and gave up. This may be a temporary outage.`,
    SCHEMA_CHANGE: `The API you're connecting to changed its response format. "${workflowName}" expected a field that no longer exists in the response.`,
    NETWORK_ERROR: `A network connectivity issue prevented "${workflowName}" from reaching the target API. This could be DNS, firewall, or a temporary outage.`,
  };
  return explanations[category] || `"${workflowName}" failed for an unknown reason.`;
}

function getSampleTechnicalDetails(category: string): string {
  const details: Record<string, string> = {
    AUTH_ERROR: 'HTTP 401 Unauthorized\nResponse: {"error": "invalid_grant", "error_description": "Token has been expired or revoked"}',
    RATE_LIMIT: 'HTTP 429 Too Many Requests\nRetry-After: 3600\nX-RateLimit-Limit: 1000\nX-RateLimit-Remaining: 0',
    TIMEOUT: "ETIMEDOUT after 30000ms\nTarget: api.service.com:443\nLast successful: 2024-01-15T10:23:00Z",
    SCHEMA_CHANGE: 'TypeError: Cannot read property "email" of undefined\nExpected: response.data.contact.email\nActual response keys: ["id", "name", "phone"]',
    NETWORK_ERROR: "ENOTFOUND api.service.com\nDNS lookup failed\ngetaddrinfo ENOTFOUND api.service.com",
  };
  return details[category] || "No additional technical details available";
}

function getSampleFixes(category: string): object {
  const fixes: Record<string, object> = {
    AUTH_ERROR: [
      { priority: 1, title: "Re-authenticate the integration", description: "Go to Settings → Integrations and re-authorize the connection", automated: false },
      { priority: 2, title: "Enable token auto-refresh", description: "Configure the integration to automatically refresh tokens before they expire", automated: true },
    ],
    RATE_LIMIT: [
      { priority: 1, title: "Add rate limiting delay", description: "Add a 1-second delay between API calls", automated: true },
      { priority: 2, title: "Upgrade API plan", description: "Consider upgrading to a higher API tier for more requests per minute", automated: false },
    ],
    TIMEOUT: [
      { priority: 1, title: "Increase timeout limit", description: "Extend the timeout to 60 seconds for this workflow step", automated: true },
      { priority: 2, title: "Add retry logic", description: "Configure 3 automatic retries with exponential backoff", automated: true },
    ],
    SCHEMA_CHANGE: [
      { priority: 1, title: "Update field mapping", description: "Review the API response and update the field mapping in your workflow", automated: false },
      { priority: 2, title: "Add field validation", description: "Add a check to verify required fields exist before processing", automated: true },
    ],
    NETWORK_ERROR: [
      { priority: 1, title: "Retry the request", description: "This may be a transient error. Retry the workflow", automated: true },
      { priority: 2, title: "Check service status", description: "Verify the target service is operational at their status page", automated: false },
    ],
  };
  return fixes[category] || [];
}

function getBusinessImpact(workflowName: string): object {
  if (workflowName.includes("Lead")) {
    const leads = Math.floor(10 + Math.random() * 50);
    return { type: "leads_lost", count: leads, description: `${leads} leads not synced to CRM`, estimatedRevenueLoss: leads * 150 };
  }
  if (workflowName.includes("Payment")) {
    const payments = Math.floor(3 + Math.random() * 20);
    return { type: "notifications_missed", count: payments, description: `${payments} payment notifications not delivered to team` };
  }
  return { type: "operational_delay", description: "Workflow delayed, manual intervention required" };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
