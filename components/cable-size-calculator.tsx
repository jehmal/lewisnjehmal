import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import ShimmerButton from "@/components/magicui/shimmer-button";

const CableSizeCalculator = () => {
  const [current, setCurrent] = useState('');
  const [voltage, setVoltage] = useState('');
  const [length, setLength] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calculate-cable-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, voltage, length }),
      });

      if (!response.ok) throw new Error('Failed to calculate cable size');

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while calculating the cable size. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Cable Size Calculator</h2>
      <form onSubmit={handleCalculate} className="space-y-4">
        <Input
          type="number"
          placeholder="Current (A)"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
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
          placeholder="Length (m)"
          value={length}
          onChange={(e) => setLength(e.target.value)}
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

export default CableSizeCalculator;