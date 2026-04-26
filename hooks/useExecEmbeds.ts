import useSWR from 'swr';
import { fetcher } from './fetcher';
import type { EmbedData } from '@/lib/embed-validation';

export type { EmbedData } from '@/lib/embed-validation';

export interface ManagedChannel {
  channel_id: string;
  guild_id: string;
  label: string;
}

export interface ManagedAttachment {
  url: string;
  filename: string;
  content_type?: string;
  s3_key?: string;
}

export interface ManagedMessage {
  id: number;
  channel_id: string;
  message_id: string | null;
  position: number;
  content: string | null;
  embeds: EmbedData[];
  attachments: ManagedAttachment[];
  dirty: boolean;
  is_new: boolean;
  pending_delete: boolean;
  last_synced_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface EmbedsData {
  channels: ManagedChannel[];
  messages: ManagedMessage[];
}

export function useExecEmbeds() {
  const { data, error, isLoading, mutate } = useSWR<EmbedsData>(
    '/api/exec/embeds',
    fetcher,
    {
      revalidateOnFocus: false,
      // Refresh relatively often so chiefs can see the bot's sync status
      // (dirty -> clean) flip without having to reload manually.
      refreshInterval: 10000,
      dedupingInterval: 3000,
    },
  );

  const updateMessage = async (
    id: number,
    content: string | null,
    embeds: EmbedData[],
  ) => {
    const res = await fetch(`/api/exec/embeds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? 'Failed to update message');
    await mutate();
  };

  const createMessage = async (
    channelId: string,
    content: string | null,
    embeds: EmbedData[],
  ): Promise<number> => {
    const res = await fetch('/api/exec/embeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channelId, content, embeds }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? 'Failed to create message');
    await mutate();
    return json.id as number;
  };

  const deleteMessage = async (id: number) => {
    const res = await fetch(`/api/exec/embeds/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json?.error ?? 'Failed to delete message');
    }
    await mutate();
  };

  const reorderMessages = async (
    channelId: string,
    order: { id: number; position: number }[],
  ) => {
    const res = await fetch('/api/exec/embeds/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: channelId, order }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? 'Failed to reorder');
    await mutate();
  };

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/exec/embeds/upload', {
      method: 'POST',
      body: form,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
    return json.url as string;
  };

  return {
    channels: data?.channels ?? [],
    messages: data?.messages ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refresh: () => mutate(),
    updateMessage,
    createMessage,
    deleteMessage,
    reorderMessages,
    uploadImage,
  };
}
