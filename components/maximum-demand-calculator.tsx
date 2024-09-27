import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import ShimmerButton from "@/components/magicui/shimmer-button";

const MaximumDemandCalculator = () => {
  const [lightingLoad, setLightingLoad] = useState('');
  const [powerOutletsLoad, setPowerOutletsLoad] = useState('');
  const [airConditioningLoad, setAirConditioningLoad] = useState('');
  const [voltage, setVoltage] = useState('230');
  const [powerFactor, setPowerFactor] = useState('0.8');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calculate-maximum-demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lightingLoad, powerOutletsLoad, airConditioningLoad, voltage, powerFactor }),
      });

      if (!response.ok) throw new Error('Failed to calculate maximum demand');

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while calculating the maximum demand. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Maximum Demand Calculator</h2>
      <form onSubmit={handleCalculate} className="space-y-4">
        <Input
          type="number"
          placeholder="Lighting Load (W)"
          value={lightingLoad}
          onChange={(e) => setLightingLoad(e.target.value)}
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
        <Input
          type="number"
          placeholder="Power Outlets Load (W)"
          value={powerOutletsLoad}
          onChange={(e) => setPowerOutletsLoad(e.target.value)}
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
        <Input
          type="number"
          placeholder="Air Conditioning Load (W)"
          value={airConditioningLoad}
          onChange={(e) => setAirConditioningLoad(e.target.value)}
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
        <Input
          type="number"
          placeholder="Voltage (V)"
          value={voltage}
          onChange={(e) => setVoltage(e.target.value)}
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
        <Input
          type="number"
          placeholder="Power Factor"
          value={powerFactor}
          onChange={(e) => setPowerFactor(e.target.value)}
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
        <ShimmerButton
          type="submit"
          shimmerColor="#eca72c"
          background="#ee5622"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Calculating...' : 'Calculate'}
        </ShimmerButton>
      </form>
      {result && <p className="mt-4 text-gray-900 dark:text-gray-100">{result}</p>}
      {error && <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default MaximumDemandCalculator;