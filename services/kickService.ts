import Pusher from 'pusher-js';
import { LinkItem } from '../types';

// Kick Public Pusher Key and Options
const PUSHER_KEY = '32cbd69e4b950bf97679';
const PUSHER_OPTIONS = {
  cluster: 'us2',
  forceTLS: true,
};

export class KickService {
  private pusher: Pusher | null = null;
  private channel: any = null;
  private onLinkCallback: ((link: LinkItem) => void) | null = null;

  constructor() {
    this.pusher = null;
  }

  // Helper to categorize links based on domain
  private categorizeUrl(url: string): string {
    const lowerUrl = url.toLowerCase();
    
    // Spesifik olarak istenen kategoriler
    if (lowerUrl.includes('prnt.sc') || lowerUrl.includes('lightshot')) {
      return 'PRNT.SC';
    }
    
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return 'YOUTUBE';
    }
    
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return 'X (TWITTER)';
    }

    if (lowerUrl.includes('instagram.com')) {
      return 'INSTAGRAM';
    }

    if (lowerUrl.includes('tiktok.com')) {
      return 'TIKTOK';
    }

    if (lowerUrl.includes('streamable.com')) {
      return 'STREAMABLE';
    }
    
    if (lowerUrl.includes('kick.com')) {
      if (lowerUrl.includes('clip')) {
        return 'KICK CLIP';
      }
      if (lowerUrl.includes('/video/')) {
        return 'KICK VIDEO';
      }
      return 'KICK KANAL';
    }

    if (lowerUrl.includes('twitch.tv')) {
      return 'TWITCH';
    }

    if (lowerUrl.includes('discord')) {
      return 'DISCORD';
    }

    if (lowerUrl.includes('spotify.com') || lowerUrl.includes('soundcloud.com')) {
      return 'SPOTIFY / MÜZİK';
    }

    if (lowerUrl.includes('github.com') || lowerUrl.includes('stackoverflow.com')) {
      return 'YAZILIM / GITHUB';
    }

    // Haber siteleri kontrolü
    if (
      lowerUrl.includes('haber') || 
      lowerUrl.includes('gazete') || 
      lowerUrl.includes('ajans') || 
      lowerUrl.includes('news') || 
      lowerUrl.includes('cnn') || 
      lowerUrl.includes('bbc') || 
      lowerUrl.includes('sondakika')
    ) {
      return 'HABER';
    }
    
    return 'DİĞER';
  }

  // 1. Get Channel ID from Slug (using a CORS proxy because Kick API blocks direct browser calls)
  private async getChannelId(slug: string): Promise<string> {
    const lowerSlug = slug.toLowerCase();

    // Special override for BurakSakinOl
    if (lowerSlug === 'buraksakinol') {
      return '25461130';
    }

    // Special override for Cavs
    if (lowerSlug === 'cavs') {
      return '25594923';
    }

    // Special override for PurpleBixi
    if (lowerSlug === 'purplebixi') {
      return '25593921';
    }

    // Special override for Jahrein
    if (lowerSlug === 'jahrein') {
      return '25314085';
    }

    // Special override for Vroft
    if (lowerSlug === 'vroft') {
      return '26489449';
    }

    // Special override for Oonuuur
    if (lowerSlug === 'oonuuur') {
      return '24845898';
    }

    // Special override for Burhi
    if (lowerSlug === 'burhi') {
      return '7736118';
    }

    try {
      // Using a standard public CORS proxy to bypass browser restrictions for the API call
      // Note: In a production app, this should be done via your own backend.
      const response = await fetch(`https://corsproxy.io/?https://kick.com/api/v1/channels/${slug}`);
      if (!response.ok) {
        throw new Error('Kanal bulunamadı veya API erişimi engellendi.');
      }
      const data = await response.json();
      if (!data || !data.chatroom || !data.chatroom.id) {
        throw new Error('Chat ID\'si alınamadı.');
      }
      return data.chatroom.id;
    } catch (error) {
      console.error("Kick API Error:", error);
      throw new Error(`Kanal ID'si alınamadı. Lütfen kullanıcı adının doğru olduğundan emin olun. (${slug})`);
    }
  }

  // New: Fetch recent messages history
  private async fetchRecentMessages(chatroomId: string) {
    try {
      // Kick v2 API for messages
      const response = await fetch(`https://corsproxy.io/?https://kick.com/api/v2/chatrooms/${chatroomId}/messages`);
      if (!response.ok) return;

      const data = await response.json();
      // API structure usually: { data: { messages: [...] } } or just { data: [...] } depending on endpoint version/changes
      const messages = data.data?.messages || data.data || [];

      if (!Array.isArray(messages)) return;

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Filter messages from last 30 minutes
      const recentMessages = messages.filter((msg: any) => {
        const msgDate = new Date(msg.created_at);
        return msgDate > thirtyMinutesAgo;
      });

      // API usually returns Newest -> Oldest.
      // We reverse it to Oldest -> Newest because our App prepends new items.
      // Processing: Oldest (added to list) -> Newer (prepended above Oldest) -> Newest (prepended to top).
      // This ensures the visual order is correct (Newest at top).
      recentMessages.reverse().forEach((msg: any) => {
        this.processMessage(msg);
      });

    } catch (error) {
      console.warn("Geçmiş mesajlar yüklenirken hata (kritik değil):", error);
      // We don't throw here to avoid blocking the main live connection
    }
  }

  // 2. Connect to WebSocket
  public async connect(channelSlug: string, onLinkFound: (link: LinkItem) => void): Promise<void> {
    this.disconnect(); // Close existing connection if any
    this.onLinkCallback = onLinkFound;

    try {
      const chatroomId = await this.getChannelId(channelSlug);
      
      // Step 2.5: Fetch history before/while connecting socket
      await this.fetchRecentMessages(chatroomId);

      this.pusher = new Pusher(PUSHER_KEY, PUSHER_OPTIONS);
      
      // Kick chat channel format: chatrooms.{id}.v2
      const channelName = `chatrooms.${chatroomId}.v2`;
      this.channel = this.pusher.subscribe(channelName);

      // Listen for messages
      this.channel.bind('App\\Events\\ChatMessageEvent', (data: any) => {
        this.processMessage(data);
      });

    } catch (error) {
      throw error;
    }
  }

  // 3. Process incoming messages
  private processMessage(data: any) {
    if (!data || !data.content) return;

    // Regular expression to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = data.content.match(urlRegex);

    if (matches) {
      matches.forEach((url: string) => {
        const lowerUrl = url.toLowerCase();

        // Filtrelenecek Domainler (Discord ve Wraithesports)
        if (lowerUrl.includes('discord') || lowerUrl.includes('wraithesports')) {
          return;
        }

        const linkItem: LinkItem = {
          url: url,
          title: new URL(url).hostname, // We don't fetch metadata to avoid CORS/Perf issues, just show hostname
          category: this.categorizeUrl(url),
          sender: data.sender?.username || 'Anonim',
          description: data.content.replace(url, '').trim() || 'Paylaşılan bağlantı', // The rest of the message is the description
          visited: false
        };

        if (this.onLinkCallback) {
          this.onLinkCallback(linkItem);
        }
      });
    }
  }

  public disconnect() {
    if (this.channel) {
      this.channel.unbind_all();
      this.channel = null;
    }
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }
  }
}

export const kickService = new KickService();