"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, TrendingDown, Users, Bot, Building2 } from "lucide-react";

interface CalculatorResults {
  hiring: {
    monthly: number;
    perTicket: number;
    agentsNeeded: number;
  };
  outsourcing: {
    monthly: number;
    perTicket: number;
  };
  aiAssisted: {
    monthly: number;
    perTicket: number;
  };
  savings: {
    vsHiring: number;
    vsOutsourcing: number;
    annualVsHiring: number;
  };
}

// Constants for calculations
const SALARY_BY_LOCATION = {
  us: { min: 42000, max: 55000, avg: 48500 },
  europe: { min: 35000, max: 48000, avg: 41500 },
  other: { min: 25000, max: 38000, avg: 31500 },
};

const OVERHEAD_MULTIPLIER = 1.35; // Benefits, taxes, training, etc.

const TICKETS_PER_AGENT_PER_MONTH = {
  simple: 1500,
  medium: 1200,
  complex: 800,
};

const OUTSOURCE_RATE_PER_TICKET = {
  simple: 4.5,
  medium: 7.5,
  complex: 11.5,
};

const MANAGEMENT_OVERHEAD = 1.2; // 20% for QA/management

// Aidly pricing
const AIDLY_BASE_COST = 208; // Plus plan
const REVIEW_TIME_MINUTES = 1.5;
const HOURLY_RATE = 25; // Opportunity cost

export function CostCalculator() {
  const [ticketVolume, setTicketVolume] = useState<number>(1000);
  const [location, setLocation] = useState<string>("us");
  const [complexity, setComplexity] = useState<string>("medium");
  const [showResults, setShowResults] = useState<boolean>(false);

  const volumeOptions = [
    { value: 250, label: "250 tickets/month" },
    { value: 500, label: "500 tickets/month" },
    { value: 1000, label: "1,000 tickets/month" },
    { value: 2000, label: "2,000 tickets/month" },
    { value: 3000, label: "3,000 tickets/month" },
    { value: 5000, label: "5,000 tickets/month" },
  ];

  const results = useMemo<CalculatorResults>(() => {
    // Hiring calculation
    const salary = SALARY_BY_LOCATION[location as keyof typeof SALARY_BY_LOCATION];
    const totalCostPerAgent = salary.avg * OVERHEAD_MULTIPLIER;
    const ticketsPerAgent = TICKETS_PER_AGENT_PER_MONTH[complexity as keyof typeof TICKETS_PER_AGENT_PER_MONTH];
    const agentsNeeded = Math.max(1, Math.ceil(ticketVolume / ticketsPerAgent));
    const hiringMonthly = (totalCostPerAgent / 12) * agentsNeeded;
    const hiringPerTicket = hiringMonthly / ticketVolume;

    // Outsourcing calculation
    const outsourceRate = OUTSOURCE_RATE_PER_TICKET[complexity as keyof typeof OUTSOURCE_RATE_PER_TICKET];
    const outsourcingMonthly = ticketVolume * outsourceRate * MANAGEMENT_OVERHEAD;
    const outsourcingPerTicket = outsourceRate * MANAGEMENT_OVERHEAD;

    // AI-assisted calculation
    const reviewCost = (ticketVolume * REVIEW_TIME_MINUTES / 60) * HOURLY_RATE;
    const aiMonthly = AIDLY_BASE_COST + reviewCost;
    const aiPerTicket = aiMonthly / ticketVolume;

    // Savings
    const savingsVsHiring = hiringMonthly - aiMonthly;
    const savingsVsOutsourcing = outsourcingMonthly - aiMonthly;

    return {
      hiring: {
        monthly: hiringMonthly,
        perTicket: hiringPerTicket,
        agentsNeeded,
      },
      outsourcing: {
        monthly: outsourcingMonthly,
        perTicket: outsourcingPerTicket,
      },
      aiAssisted: {
        monthly: aiMonthly,
        perTicket: aiPerTicket,
      },
      savings: {
        vsHiring: savingsVsHiring,
        vsOutsourcing: savingsVsOutsourcing,
        annualVsHiring: savingsVsHiring * 12,
      },
    };
  }, [ticketVolume, location, complexity]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyDecimal = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getBarWidth = (value: number, max: number) => {
    return Math.min(100, (value / max) * 100);
  };

  const maxMonthlyCost = Math.max(
    results.hiring.monthly,
    results.outsourcing.monthly,
    results.aiAssisted.monthly
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Email Support Cost Calculator
          </CardTitle>
          <CardDescription>
            Compare the true cost of hiring, outsourcing, and AI-assisted support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ticket Volume */}
          <div className="space-y-2">
            <Label htmlFor="volume">Monthly Support Tickets</Label>
            <Select
              value={ticketVolume.toString()}
              onValueChange={(v) => setTicketVolume(parseInt(v))}
            >
              <SelectTrigger id="volume">
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                {volumeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Team Location (for hiring comparison)</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States / Canada</SelectItem>
                <SelectItem value="europe">Europe / UK</SelectItem>
                <SelectItem value="other">Other Regions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Complexity */}
          <div className="space-y-2">
            <Label htmlFor="complexity">Average Ticket Complexity</Label>
            <Select value={complexity} onValueChange={setComplexity}>
              <SelectTrigger id="complexity">
                <SelectValue placeholder="Select complexity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">
                  Simple (shipping, tracking, basic questions)
                </SelectItem>
                <SelectItem value="medium">
                  Medium (refunds, exchanges, troubleshooting)
                </SelectItem>
                <SelectItem value="complex">
                  Complex (technical issues, disputes)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setShowResults(true)}
            className="w-full"
            size="lg"
          >
            Calculate My Costs
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {showResults && (
        <>
          {/* Cost Comparison Bars */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Cost Comparison</CardTitle>
              <CardDescription>
                At {ticketVolume.toLocaleString()} tickets/month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hiring */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Hiring In-House</span>
                    <span className="text-xs text-muted-foreground">
                      ({results.hiring.agentsNeeded} agent{results.hiring.agentsNeeded > 1 ? "s" : ""})
                    </span>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(results.hiring.monthly)}
                  </span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${getBarWidth(results.hiring.monthly, maxMonthlyCost)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrencyDecimal(results.hiring.perTicket)}/ticket
                </p>
              </div>

              {/* Outsourcing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Outsourcing / BPO</span>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(results.outsourcing.monthly)}
                  </span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${getBarWidth(results.outsourcing.monthly, maxMonthlyCost)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrencyDecimal(results.outsourcing.perTicket)}/ticket
                </p>
              </div>

              {/* AI-Assisted */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">AI-Assisted (Aidly)</span>
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(results.aiAssisted.monthly)}
                  </span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${getBarWidth(results.aiAssisted.monthly, maxMonthlyCost)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrencyDecimal(results.aiAssisted.perTicket)}/ticket
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Savings Highlight */}
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                  <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    Potential Savings with Aidly
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Based on your inputs
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-background rounded-lg border">
                  <p className="text-sm text-muted-foreground">vs Hiring</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(results.savings.vsHiring)}
                    <span className="text-base font-normal">/month</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(results.savings.annualVsHiring)}/year
                  </p>
                </div>
                <div className="p-4 bg-white dark:bg-background rounded-lg border">
                  <p className="text-sm text-muted-foreground">vs Outsourcing</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(results.savings.vsOutsourcing)}
                    <span className="text-base font-normal">/month</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(results.savings.vsOutsourcing * 12)}/year
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">
                  See how Aidly handles your emails
                </h3>
                <p className="text-muted-foreground">
                  5 free emails to test the AI quality. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild size="lg">
                    <Link href="/#pricing">Try Aidly Free</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/blog/email-support-cost-comparison">
                      Read Full Cost Analysis
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default CostCalculator;
