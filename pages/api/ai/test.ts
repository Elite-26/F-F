import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const selectedModel = model || 'gemini-pro';

  try {
    // Determine which AI provider to use based on model name
    if (selectedModel.startsWith('claude')) {
      // Claude/Anthropic
      return await handleClaudeRequest(prompt, selectedModel, res);
    } else {
      // Gemini (default)
      return await handleGeminiRequest(prompt, selectedModel, res);
    }
  } catch (error: any) {
    console.error('AI API error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process AI request',
    });
  }
}

async function handleGeminiRequest(
  prompt: string,
  model: string,
  res: NextApiResponse
) {
  // Check if API key is configured
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.',
    });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const geminiModel = genAI.getGenerativeModel({ model });

  // Generate content
  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Get token count if available
  let tokenCount = null;
  try {
    const promptTokenCount = await geminiModel.countTokens(prompt);
    const responseTokenCount = await geminiModel.countTokens(text);
    tokenCount = {
      prompt_tokens: promptTokenCount.totalTokens,
      completion_tokens: responseTokenCount.totalTokens,
      total_tokens: promptTokenCount.totalTokens + responseTokenCount.totalTokens,
    };
  } catch (e) {
    // Token counting might not be available for all models
    console.log('Token counting not available');
  }

  return res.status(200).json({
    success: true,
    result: text,
    model: model,
    usage: tokenCount,
  });
}

async function handleClaudeRequest(
  prompt: string,
  model: string,
  res: NextApiResponse
) {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in your environment variables.',
    });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await anthropic.messages.create({
    model: model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  return res.status(200).json({
    success: true,
    result: text,
    model: model,
    usage: {
      prompt_tokens: message.usage.input_tokens,
      completion_tokens: message.usage.output_tokens,
      total_tokens: message.usage.input_tokens + message.usage.output_tokens,
    },
  });
}

