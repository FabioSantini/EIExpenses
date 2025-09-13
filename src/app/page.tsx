"use client";

import { useEffect, useState } from "react";
import { env } from "@/lib/env";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-xl">Loading EI-Expenses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            EI-Expenses
          </h1>
          <p className="text-lg text-gray-600">
            Phase 2: Data Layer & Mock Service Complete! ✅
          </p>
          <div className="mt-2 text-sm">
            <span className="px-2 py-1 rounded text-white bg-blue-500">
              🔧 Mock Data Service Ready
            </span>
          </div>
        </div>

        {/* What We Built */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Phase 2 Accomplishments</h2>
          <div className="grid gap-4">
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-bold text-green-700">✅ IDataService Interface</h3>
              <p className="text-green-600">Complete abstraction layer for data operations</p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-bold text-green-700">✅ MockDataService</h3>
              <p className="text-green-600">Full in-memory service with localStorage persistence</p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-bold text-green-700">✅ React Hooks</h3>
              <p className="text-green-600">useExpenseReports, useFileUpload, useExport, etc.</p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-bold text-green-700">✅ Mock Data Generator</h3>
              <p className="text-green-600">6 months of realistic Italian business expenses</p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-bold text-green-700">✅ Environment Switching</h3>
              <p className="text-green-600">Easy toggle between mock and Azure services</p>
            </div>
          </div>
        </div>

        {/* Mock Data Features */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Mock Data Features</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <div className="font-bold text-blue-700">Expense Reports</div>
              <div className="text-blue-600">6 months of sample reports</div>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <div className="font-bold text-blue-700">Expense Lines</div>
              <div className="text-blue-600">8-15 realistic expenses per report</div>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <div className="font-bold text-blue-700">OCR Simulation</div>
              <div className="text-blue-600">Realistic receipt processing</div>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <div className="font-bold text-blue-700">Excel Export</div>
              <div className="text-blue-600">CSV/Excel with attachments</div>
            </div>
          </div>
        </div>

        {/* Environment Status */}
        <div className="border-t pt-8">
          <h3 className="text-lg font-bold mb-4">Environment Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <div className="font-bold text-blue-700">Data Mode</div>
              <div className="text-blue-600">
                {env.NEXT_PUBLIC_USE_MOCK ? 'Mock (Development)' : 'Azure (Production)'}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="font-bold text-green-700">Environment</div>
              <div className="text-green-600">
                {process.env.NODE_ENV || 'development'}
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 p-6 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-bold mb-2 text-yellow-700">Ready for Phase 3: Frontend UI Components</h3>
          <p className="text-yellow-600">
            All data layer infrastructure is complete. We can now build the actual expense management UI 
            with full functionality using the mock data service. The frontend will work immediately without 
            needing any database setup!
          </p>
        </div>
      </div>
    </div>
  );
}