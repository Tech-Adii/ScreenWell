import type { Page } from '@playwright/test';

// Supply real video frames without depending on Chromium's fake capture device.
// Inference, video playback, and track lifecycle still use the production pipeline.
export async function useTestCamera(page: Page, dim = false) {
  await page.evaluate((dim) => {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (!constraints?.video || constraints.audio) throw new Error('Expected video-only capture.');
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create test video frames.');
      const stream = canvas.captureStream(10);
      const track = stream.getVideoTracks()[0];
      let frame = 0;
      const paint = () => {
        context.fillStyle = dim
          ? frame++ % 2
            ? '#0b0b0b'
            : '#090909'
          : frame++ % 2
            ? '#636363'
            : '#606060';
        context.fillRect(0, 0, canvas.width, canvas.height);
      };
      paint();
      const timer = window.setInterval(() => {
        if (track.readyState === 'ended') window.clearInterval(timer);
        else paint();
      }, 100);
      return stream;
    };
  }, dim);
}
