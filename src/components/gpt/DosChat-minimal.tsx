/**
 * MINIMAL ChatKit Test - No Custom CSS
 * This component strips out ALL custom styling to verify ChatKit composer renders
 */

import React from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';

export default function DosChatMinimal() {
  const { control } = useChatKit({
    api: {
      async getClientSecret(existingSecret: string | null) {
        if (existingSecret) {
          const refreshRes = await fetch('/api/chatkit/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_secret: existingSecret }),
          });

          if (refreshRes.ok) {
            const { client_secret } = await refreshRes.json();
            return client_secret;
          }
        }

        const res = await fetch('/api/chatkit/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const { client_secret } = await res.json();
        return client_secret;
      },
      url: '/api/chatkit',
    },
  });

  return (
    <div style={{ height: '600px', width: '100%', border: '2px solid red' }}>
      <h1>MINIMAL CHATKIT TEST (Red border = container)</h1>
      <ChatKit control={control} className="h-full w-full" />
    </div>
  );
}
