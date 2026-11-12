import * as WebBrowser from 'expo-web-browser';
import { showImages } from '@/src/components/ImageViewer';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|avif)(\?|#|$)/i;

/**
 * Opens a document link without leaving the app: photos in the in-app
 * viewer, anything else (PDFs, issuer verification pages) in an in-app
 * browser tab. Before, these went to the phone's browser via Linking.
 *
 * Not for mailto:/tel: or a person's own website -- those should open the
 * right app, so they keep using Linking.
 */
export function openInApp(url: string | undefined | null, caption?: string) {
  if (!url) return;
  if (IMAGE_EXT.test(url)) {
    showImages([url], 0, caption);
    return;
  }
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}
