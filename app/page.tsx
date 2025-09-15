"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Leaf } from "lucide-react"

type CalculatorMode = "travel" | "energy" | "standard"
type TransportType = "car" | "bus" | "train" | "bike"

export default function EcoCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("travel")
  const [input, setInput] = useState("")
  const [result, setResult] = useState<number | null>(null)
  const [transportType, setTransportType] = useState<TransportType>("car")
  const [standardExpression, setStandardExpression] = useState("")
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInput("");
    setResult(null);
    setError(null);
    setStandardExpression("");
  }, [mode]);

const handleCalculate = async () => {
  setIsLoading(true);
  setError(null);
  setResult(null);

  // Standard calculator logic remains unchanged
  if (mode === 'standard') {
    try {
      const evalResult = Function(`"use strict"; return (${standardExpression})`)();
      setResult(evalResult);
      setInput(evalResult.toString());
    } catch {
      setError("Invalid calculation");
    }
    setIsLoading(false);
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_CARBON_INTERFACE_API_KEY;
  
  try {
    if (!apiKey) {
      throw new Error("API key not configured.");
    }

    let requestBody = {};
    if (mode === 'travel') {
        const distance = parseFloat(input);
        if (isNaN(distance) || distance <= 0) {
          setError('Please enter a valid distance.');
          setIsLoading(false); return;
        }
        const transportMethodMap = { car: "truck", bus: "truck", train: "train" };
        if (transportType === 'bike') {
          setResult(0);
          setIsLoading(false); return;
        }
        requestBody = {
          type: "shipping", weight_value: 100, weight_unit: "kg",
          distance_value: distance, distance_unit: "km",
          transport_method: transportMethodMap[transportType],
        };
    } else if (mode === 'energy') {
        const energy = parseFloat(input);
        if (isNaN(energy) || energy <= 0) {
          setError('Please enter a valid energy amount.');
          setIsLoading(false); return;
        }
        requestBody = {
          type: "electricity", electricity_unit: "kwh",
          electricity_value: energy, country: "IN",
        };
    }

    const response = await fetch('https://www.carboninterface.com/api/v1/estimates', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API responded with an error.');
    }
    
    setResult(data.data.attributes.carbon_kg);
    console.log("Success: Fetched data from Live API.");

  } catch (err) { // CHANGED: Removed the ': any' type to fix the error
    let errorMessage = "API call failed.";
    if (err instanceof Error) {
        errorMessage = err.message;
    }
    console.warn("API call failed, using local backup data. Error:", errorMessage);

    try {
      let calculatedCo2e = 0;
      const localFactors = {
        car: 0.18, bus: 0.08, train: 0.04, bike: 0,
        energy: 0.709
      };

      if (mode === 'travel') {
        const distance = parseFloat(input);
        if (!isNaN(distance) && distance >= 0) {
          calculatedCo2e = distance * localFactors[transportType];
        } else {
          setError('Please enter a valid distance.');
        }
      } else if (mode === 'energy') {
        const energy = parseFloat(input);
        if (!isNaN(energy) && energy >= 0) {
          calculatedCo2e = energy * localFactors.energy;
        } else {
          setError('Please enter a valid energy amount.');
        }
      }
      setResult(calculatedCo2e);
    } catch { // CHANGED: Removed the unused 'fallbackError' variable to fix the warning
      setError('An error occurred during fallback calculation.');
    }

  } finally {
    setIsLoading(false);
  }
};
  const handleStandardInput = (value: string) => {
    if (value === "C") {
      setStandardExpression("")
      setInput("")
      setResult(null)
    } else if (value === "=") {
      handleCalculate()
    } else {
      const newExpression = standardExpression + value
      setStandardExpression(newExpression)
      setInput(newExpression)
    }
  }

  const standardButtons = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["0", ".", "=", "+"],
    ["C"],
  ]

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="p-6 space-y-6">
          {/* Mode Selector */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setMode("travel")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${mode === "travel" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Travel 🚗
            </button>
            <button
              onClick={() => setMode("energy")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${mode === "energy" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Energy 💡
            </button>
            <button
              onClick={() => setMode("standard")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${mode === "standard" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Standard 🧮
            </button>
          </div>

          {/* Display Screen */}
          <div className="bg-card border rounded-lg p-4 space-y-2 text-right">
            <div className="text-2xl font-semibold text-foreground break-all">{input || "0"}</div>
              {result !== null && (
                <div className="flex items-center justify-end gap-1 text-foreground font-medium">
                  { mode !== 'standard' && <Leaf className="w-4 h-4" /> }
                  <span>{mode === "standard" ? `= ${result}` : `${result.toFixed(2)} kg CO2e`}</span>
                </div>
              )}
          </div>

          {/* Input Controls */}
          <div className="space-y-4">
            {mode === "travel" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Distance (km)</label>
                  <Input
                    type="number"
                    placeholder="Enter distance"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["car", "bus", "train", "bike"] as TransportType[]).map((type) => (
                    <Button
                      key={type}
                      variant={transportType === type ? "default" : "outline"}
                      onClick={() => setTransportType(type)}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </>
            )}

            {mode === "energy" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Electricity Usage (kWh)</label>
                <Input
                  type="number"
                  placeholder="Enter energy usage"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="text-lg"
                />
              </div>
            )}

            {mode === "standard" && (
              <div className="grid grid-cols-4 gap-2">
                {standardButtons.flat().map((btn, index) => (
                  <Button
                    key={index}
                    variant={btn === "=" ? "default" : "outline"}
                    onClick={() => handleStandardInput(btn)}
                    className={`h-12 text-lg font-medium ${btn === "C" ? "col-span-4" : ""}`}
                  >
                    {btn}
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          {error && (
            <p className="text-sm text-center text-destructive">{error}</p>
          )}

          {/* Calculate Button */}
          {(mode === "travel" || mode === "energy") && (
            <Button
              onClick={handleCalculate}
              disabled={isLoading}
              className="w-full h-12 text-lg font-semibold"
            >
              {isLoading ? "Calculating..." : "Calculate"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}