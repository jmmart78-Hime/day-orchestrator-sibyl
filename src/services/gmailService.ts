import { GmailInboxMessage } from '../types';

/**
 * Format email date into a friendly readable time
 */
export function formatEmailDate(dateStr?: string, internalDate?: string): string {
  try {
    let date: Date;
    if (dateStr) {
      date = new Date(dateStr);
    } else if (internalDate) {
      date = new Date(parseInt(internalDate, 10));
    } else {
      return 'Today';
    }

    if (isNaN(date.getTime())) {
      return 'Today';
    }

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Clean sender string into a display name and email address
 */
export function parseSender(fromHeader?: string): { name: string; email?: string } {
  if (!fromHeader) return { name: 'Unknown Sender' };

  // Example: "Jane Doe <jane@example.com>"
  const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    let name = match[1].replace(/^["']|["']$/g, '').trim();
    const email = match[2].trim();
    if (!name) name = email.split('@')[0];
    return { name, email };
  }

  // Example: "jane@example.com"
  if (fromHeader.includes('@')) {
    return { name: fromHeader.split('@')[0], email: fromHeader };
  }

  return { name: fromHeader };
}

/**
 * Formats a snippet or body preview into a single crisp sentence summary
 */
export function cleanOneSentenceSummary(snippet?: string, subject?: string): string {
  if (!snippet || snippet.trim().length === 0) {
    return subject ? `Regarding ${subject}.` : 'No preview available.';
  }

  // Decode basic HTML entities if present in snippet
  let cleaned = snippet
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // Find first sentence ending punctuation if reasonable length
  const sentenceMatch = cleaned.match(/^([^\.\?!]+[\.\?!])/);
  if (sentenceMatch && sentenceMatch[1].length >= 20 && sentenceMatch[1].length <= 160) {
    return sentenceMatch[1].trim();
  }

  // Otherwise truncate cleanly to ~120 chars with a period
  if (cleaned.length > 130) {
    cleaned = cleaned.substring(0, 127).trim() + '...';
  } else if (!/[.!?]$/.test(cleaned)) {
    cleaned = cleaned + '.';
  }

  return cleaned;
}

/**
 * Fetches the 10 most recent inbox messages in read-only mode
 */
export async function fetchRecentInboxMessages(accessToken: string): Promise<GmailInboxMessage[]> {
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  listUrl.searchParams.append('maxResults', '10');
  listUrl.searchParams.append('q', 'in:inbox');

  const listResponse = await fetch(listUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(`Gmail API error (${listResponse.status}): ${errorText}`);
  }

  const listData = await listResponse.json();
  const rawList: Array<{ id: string; threadId: string }> = listData.messages || [];

  if (rawList.length === 0) {
    return [];
  }

  // Fetch message details in parallel for the 10 messages
  const messagePromises = rawList.map(async (item) => {
    try {
      const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}`);
      msgUrl.searchParams.append('format', 'metadata');
      msgUrl.searchParams.append('metadataHeaders', 'From');
      msgUrl.searchParams.append('metadataHeaders', 'Subject');
      msgUrl.searchParams.append('metadataHeaders', 'Date');

      const msgRes = await fetch(msgUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!msgRes.ok) {
        return null;
      }

      const msgData = await msgRes.json();
      const headers: Array<{ name: string; value: string }> = msgData.payload?.headers || [];

      const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
      const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';

      const { name: senderName, email: senderEmail } = parseSender(fromHeader);
      const receivedTime = formatEmailDate(dateHeader, msgData.internalDate);
      const summary = cleanOneSentenceSummary(msgData.snippet, subjectHeader);
      const unread = Array.isArray(msgData.labelIds) && msgData.labelIds.includes('UNREAD');

      const message: GmailInboxMessage = {
        id: msgData.id,
        threadId: msgData.threadId,
        sender: senderName,
        senderEmail,
        subject: subjectHeader,
        receivedTime,
        summary,
        snippet: msgData.snippet || '',
        unread,
      };

      return message;
    } catch (err) {
      console.warn(`Failed to fetch message details for id: ${item.id}`, err);
      return null;
    }
  });

  const resolved = await Promise.all(messagePromises);
  const validMessages = resolved.filter((m): m is GmailInboxMessage => m !== null);

  if (validMessages.length === 0) {
    return [];
  }

  // Classify all 10 messages with Gemini Triage API
  try {
    const classificationRes = await fetch('/api/gemini/classify-gmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: validMessages.map((m) => ({
          id: m.id,
          sender: m.sender,
          senderEmail: m.senderEmail,
          subject: m.subject,
          snippet: m.snippet,
          summary: m.summary,
        })),
      }),
    });

    if (classificationRes.ok) {
      const data = await classificationRes.json();
      const classificationsMap = new Map<string, { category: any; whyThisMatters: string }>();

      if (Array.isArray(data.classifications)) {
        data.classifications.forEach((c: any) => {
          if (c.id && c.category) {
            classificationsMap.set(c.id, {
              category: c.category,
              whyThisMatters: c.whyThisMatters || '',
            });
          }
        });
      }

      // Merge classifications back into messages
      return validMessages.map((m) => {
        const item = classificationsMap.get(m.id);
        return {
          ...m,
          classification: item?.category || 'IMPORTANT FYI',
          whyThisMatters: item?.whyThisMatters || `Informational update from ${m.sender}.`,
        };
      });
    }
  } catch (err) {
    console.warn('Gemini classification request failed, falling back to local categorization:', err);
  }

  // Fallback defaults if classification call had network issue
  return validMessages.map((m) => ({
    ...m,
    classification: m.classification || 'IMPORTANT FYI',
    whyThisMatters: m.whyThisMatters || `Informational update from ${m.sender}.`,
  }));
}
