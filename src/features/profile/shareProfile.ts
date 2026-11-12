import { Share } from 'react-native';
import { shareLinksApi } from '@/src/api/social';
import { getErrorMessage } from '@/src/api/client';

import { appAlert } from '@/src/components/AppDialog';
/**
 * Creates a time-limited public link to the user's profile (the web
 * app's /p/:token page -- viewable without an account) and opens the
 * system share sheet. The link expires after the backend's default period.
 */
export async function shareMyProfile(fullName?: string) {
  try {
    const link = await shareLinksApi.create('Shared from the app');
    const expires = link.expiresAt
      ? new Date(link.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    await Share.share({
      message: `${fullName ? `${fullName} on COBILDS` : 'My COBILDS profile'}: ${link.url}`,
      title: 'Share profile',
    });
    if (expires) {
      // Shown after the sheet closes so the user knows the link won't last forever.
      setTimeout(() => appAlert('Link created', `This link works until ${expires}.`), 300);
    }
  } catch (e) {
    appAlert("Couldn't create a share link", getErrorMessage(e));
  }
}
