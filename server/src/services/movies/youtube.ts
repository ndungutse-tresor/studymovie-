import { config } from '../../config.js';
import type { Movie } from './types.js';
import { fetchJson } from './http.js';
import { cleanTitle, isSuitable, normaliseGenres, popularityFromCount } from './normalise.js';

/**
 * YouTube provider — optional, enabled by YOUTUBE_API_KEY and YOUTUBE_SOURCES.
 *
 * The operator lists the channels (or playlists) to follow: official channels
 * of studios and distributors that publish full films for free. Each sync reads
 * their latest uploads, so a film a channel publishes appears here on the next
 * run. Only public, embeddable, feature-length videos are kept, and they play
 * through YouTube's own player — nothing is copied or re-hosted.
 *
 * Quota: a source costs about five units per sync against a free daily
 * allowance of 10,000.
 */

const API = 'https://www.googleapis.com/youtube/v3';
const PAGES_PER_SOURCE = 2;

interface ChannelsResponse {
  items?: { id: string; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[];
}

interface PlaylistItemsResponse {
  nextPageToken?: string;
  items?: { contentDetails?: { videoId?: string } }[];
}

interface VideosResponse {
  items?: {
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      channelTitle?: string;
      tags?: string[];
      liveBroadcastContent?: string;
      thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
    };
    contentDetails?: { duration?: string };
    status?: { privacyStatus?: string; embeddable?: boolean };
    statistics?: { viewCount?: string };
  }[];
}

export function youtubeEnabled(): boolean {
  return config.movies.youtubeApiKey.length > 0 && config.movies.youtubeSources.length > 0;
}

function url(endpoint: string, params: Record<string, string>): string {
  const search = new URLSearchParams({ ...params, key: config.movies.youtubeApiKey });
  return `${API}/${endpoint}?${search.toString()}`;
}

/** ISO 8601 duration (PT1H32M10S) to whole minutes. */
export function durationMinutes(iso: string | undefined): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '');
  if (!match) return null;
  const [, hours = '0', minutes = '0', seconds = '0'] = match;
  return Math.round(Number(hours) * 60 + Number(minutes) + Number(seconds) / 60);
}

/** Resolves a configured source to the playlist that holds its videos. */
async function uploadsPlaylist(source: string): Promise<string> {
  if (/^UC[\w-]{22}$/.test(source)) return `UU${source.slice(2)}`;
  if (/^(?:PL|UU|OL|FL)[\w-]{10,}$/.test(source)) return source;

  if (/^@[\w.-]{3,}$/.test(source)) {
    const channels = await fetchJson<ChannelsResponse>(
      url('channels', { part: 'contentDetails', forHandle: source }),
    );
    const uploads = channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) throw new Error(`YouTube handle ${source} was not found`);
    return uploads;
  }

  throw new Error(`"${source}" is not a channel ID (UC…), @handle, or playlist ID (PL…)`);
}

async function latestVideoIds(playlistId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < PAGES_PER_SOURCE; page += 1) {
    const params: Record<string, string> = { part: 'contentDetails', playlistId, maxResults: '50' };
    if (pageToken) params.pageToken = pageToken;

    const payload = await fetchJson<PlaylistItemsResponse>(url('playlistItems', params));
    for (const item of payload.items ?? []) {
      if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    }
    pageToken = payload.nextPageToken;
    if (!pageToken) break;
  }

  return ids;
}

function bestThumbnail(thumbnails: Record<string, { url: string }> | undefined): string | null {
  if (!thumbnails) return null;
  for (const size of ['maxres', 'standard', 'high', 'medium', 'default']) {
    if (thumbnails[size]?.url) return thumbnails[size].url;
  }
  return null;
}

async function videosFor(ids: string[]): Promise<Movie[]> {
  const movies: Movie[] = [];

  for (let start = 0; start < ids.length; start += 50) {
    const batch = ids.slice(start, start + 50);
    const payload = await fetchJson<VideosResponse>(
      url('videos', { part: 'snippet,contentDetails,status,statistics', id: batch.join(',') }),
    );

    for (const video of payload.items ?? []) {
      const snippet = video.snippet ?? {};
      const minutes = durationMinutes(video.contentDetails?.duration);

      if (video.status?.privacyStatus !== 'public' || video.status?.embeddable !== true) continue;
      if (snippet.liveBroadcastContent && snippet.liveBroadcastContent !== 'none') continue;
      if (minutes === null || minutes < config.movies.youtubeMinMinutes) continue;

      const rawTitle = snippet.title ?? '';
      if (!isSuitable(rawTitle, snippet.tags ?? [])) continue;
      const { title, year } = cleanTitle(rawTitle);
      if (title.length < 2) continue;

      movies.push({
        id: `youtube:${video.id}`,
        source: 'youtube',
        title,
        year,
        synopsis: (snippet.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 400),
        genres: normaliseGenres(snippet.tags ?? [], `${rawTitle} ${snippet.description ?? ''}`.slice(0, 600)),
        runtimeMinutes: minutes,
        posterUrl: bestThumbnail(snippet.thumbnails),
        sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
        streamUrl: null,
        embedUrl: `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1`,
        popularity: popularityFromCount(Number(video.statistics?.viewCount ?? 0), 8),
        rating: null,
        licence: `Published free to watch by ${snippet.channelTitle ?? 'the channel owner'} on YouTube`,
        addedAt: snippet.publishedAt ?? null,
      });
    }
  }

  return movies;
}

/**
 * The latest feature-length uploads from every configured source. One source
 * failing (a mistyped handle, a deleted playlist) does not drop the others.
 */
export async function fetchYoutubeMovies(): Promise<{ movies: Movie[]; errors: string[] }> {
  if (!youtubeEnabled()) return { movies: [], errors: [] };

  const results = await Promise.allSettled(
    config.movies.youtubeSources.map(async (source) => videosFor(await latestVideoIds(await uploadsPlaylist(source)))),
  );

  const movies: Movie[] = [];
  const errors: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') movies.push(...result.value);
    else errors.push(`${config.movies.youtubeSources[index]}: ${result.reason instanceof Error ? result.reason.message : 'failed'}`);
  });

  return { movies, errors };
}
