/**
 * System Stats API Endpoint
 * Provides comprehensive system information for troubleshooting and monitoring
 */

import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export const prerender = false;

const DATA_DIR_CLAUDE = path.join(process.cwd(), 'data', 'conversations');
const DATA_DIR_GPT = path.join(process.cwd(), 'data', 'gpt-conversations');

/**
 * Get directory size in MB
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const files = await fs.readdir(dirPath);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }

    return totalSize / (1024 * 1024); // Convert to MB
  } catch (error) {
    return 0;
  }
}

/**
 * Count files in directory
 */
async function countFiles(dirPath: string): Promise<number> {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter(f => f.endsWith('.json')).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if environment variable is set
 */
function checkEnvVar(name: string): { name: string; set: boolean; value?: string } {
  const value = process.env[name];
  return {
    name,
    set: !!value,
    value: value ? `${value.substring(0, 10)}...` : undefined
  };
}

/**
 * Get latest conversation timestamp
 */
async function getLatestConversationTime(dirPath: string): Promise<number | null> {
  try {
    const files = await fs.readdir(dirPath);
    let latestTime = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(dirPath, file);
      const data = await fs.readFile(filePath, 'utf-8');
      const conv = JSON.parse(data);
      if (conv.updatedAt > latestTime) {
        latestTime = conv.updatedAt;
      }
    }

    return latestTime || null;
  } catch (error) {
    return null;
  }
}

export const GET: APIRoute = async ({ locals }) => {
  // Check authentication
  const { userId } = locals.auth();

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Gather system information
    const [
      claudeConvCount,
      gptConvCount,
      claudeStorageSize,
      gptStorageSize,
      claudeLatest,
      gptLatest
    ] = await Promise.all([
      countFiles(DATA_DIR_CLAUDE),
      countFiles(DATA_DIR_GPT),
      getDirectorySize(DATA_DIR_CLAUDE),
      getDirectorySize(DATA_DIR_GPT),
      getLatestConversationTime(DATA_DIR_CLAUDE),
      getLatestConversationTime(DATA_DIR_GPT)
    ]);

    const stats = {
      timestamp: Date.now(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: {
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        astroEnv: process.env.ASTRO_ENV || 'development'
      },
      storage: {
        claude: {
          conversations: claudeConvCount,
          sizeMB: claudeStorageSize.toFixed(2),
          path: DATA_DIR_CLAUDE,
          latestActivity: claudeLatest
        },
        gpt: {
          conversations: gptConvCount,
          sizeMB: gptStorageSize.toFixed(2),
          path: DATA_DIR_GPT,
          latestActivity: gptLatest
        },
        total: {
          conversations: claudeConvCount + gptConvCount,
          sizeMB: (claudeStorageSize + gptStorageSize).toFixed(2)
        }
      },
      envVars: {
        clerk: [
          checkEnvVar('PUBLIC_CLERK_PUBLISHABLE_KEY'),
          checkEnvVar('CLERK_SECRET_KEY')
        ],
        ai: [
          checkEnvVar('ANTHROPIC_API_KEY'),
          checkEnvVar('OPENAI_API_KEY')
        ]
      },
      endpoints: {
        claude: [
          { path: '/api/chat/send', method: 'POST', description: 'Send message to Claude' },
          { path: '/api/chat/conversations', method: 'GET', description: 'List Claude conversations' },
          { path: '/api/chat/conversations/[id]', method: 'GET/DELETE', description: 'Get/Delete conversation' },
          { path: '/api/chat/models', method: 'GET', description: 'List available models' }
        ],
        gpt: [
          { path: '/api/gpt/send', method: 'POST', description: 'Send message to ChatGPT' },
          { path: '/api/gpt/conversations', method: 'GET', description: 'List ChatGPT conversations' },
          { path: '/api/gpt/conversations/[id]', method: 'GET/DELETE', description: 'Get/Delete conversation' },
          { path: '/api/gpt/models', method: 'GET', description: 'List available models' }
        ],
        system: [
          { path: '/api/system/stats', method: 'GET', description: 'Get system statistics' }
        ]
      },
      pages: [
        { path: '/', name: 'Home', protected: false },
        { path: '/sign-in', name: 'Sign In', protected: false },
        { path: '/sign-up', name: 'Sign Up', protected: false },
        { path: '/dashboard', name: 'Dashboard (User)', protected: true },
        { path: '/dashboard/dev', name: 'Dashboard (Dev)', protected: true },
        { path: '/dashboard/profile', name: 'Profile', protected: true },
        { path: '/chat', name: 'Claude Chat', protected: true },
        { path: '/chatgpt', name: 'ChatGPT (DOS)', protected: true },
        { path: '/about', name: 'About', protected: false },
        { path: '/blog', name: 'Blog', protected: false }
      ]
    };

    return new Response(JSON.stringify(stats, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error gathering system stats:', error);
    return new Response(JSON.stringify({
      error: 'Failed to gather system stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
