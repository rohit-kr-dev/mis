import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Using ExchangeRate-API free tier
    // Get your free API key at: https://www.exchangerate-api.com/
    const API_KEY = process.env.EXCHANGE_RATE_API_KEY || 'YOUR_API_KEY_HERE';
    
    // If no API key provided, try the free endpoint first
    let url;
    if (API_KEY === 'YOUR_API_KEY_HERE' || !API_KEY) {
      // Free endpoint (limited requests)
      url = 'https://api.exchangerate-api.com/v4/latest/USD';
    } else {
      // Paid endpoint with API key
      url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Material-MIS/1.0'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    
    let rate;
    let source;
    let timestamp;
    
    if (data.rates?.INR) {
      // Free API response format
      rate = data.rates.INR;
      source = 'exchangerate-api-free';
      timestamp = data.date;
    } else if (data.conversion_rates?.INR) {
      // Paid API response format
      rate = data.conversion_rates.INR;
      source = 'exchangerate-api-paid';
      timestamp = data.time_last_update_utc;
    } else {
      throw new Error('Could not find INR rate in response');
    }

    return NextResponse.json({
      rate: parseFloat(rate.toFixed(4)),
      source: source,
      timestamp: timestamp,
      fromCache: false
    });

  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    
    // Return fallback rate if API fails
    return NextResponse.json({
      rate: 83.5000, // Static fallback rate
      source: 'fallback',
      timestamp: new Date().toISOString(),
      fromCache: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}