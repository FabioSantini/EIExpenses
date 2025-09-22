"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TestDbPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async (testName: string, testEndpoint: string) => {
    setTestResults(prev => [...prev, `🔄 Running ${testName}...`]);

    try {
      const response = await fetch(testEndpoint);
      const data = await response.json();

      if (response.ok) {
        setTestResults(prev => [...prev, `✅ ${testName}: ${JSON.stringify(data, null, 2)}`]);
      } else {
        setTestResults(prev => [...prev, `❌ ${testName} failed: ${JSON.stringify(data, null, 2)}`]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, `❌ ${testName} error: ${error}`]);
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    // Test 1: Basic connection test
    await runTest("Basic Connection Test", "/api/test-db/connection");

    // Test 2: Query test
    await runTest("Query Test", "/api/test-db/query");

    // Test 3: Environment check
    await runTest("Environment Check", "/api/test-db/env");

    // Test 4: Prisma client test
    await runTest("Prisma Client Test", "/api/test-db/prisma");

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Azure SQL Database Connection Test</h1>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Tests</h2>
          <Button
            onClick={runAllTests}
            disabled={isLoading}
            className="mb-4"
          >
            {isLoading ? "Running Tests..." : "Run All Tests"}
          </Button>

          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => runTest("Quick Connection", "/api/test-db/quick")}
              disabled={isLoading}
            >
              Quick Connection Test
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => runTest("DNS Check", "/api/test-db/dns")}
              disabled={isLoading}
              className="ml-2"
            >
              DNS Resolution Test
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-sm">
              {testResults.length > 0 ? testResults.join('\n') : "No tests run yet. Click 'Run All Tests' to start."}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}