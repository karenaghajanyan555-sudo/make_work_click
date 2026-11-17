import { Config } from '@remotion/cli/config';
import { RENDER } from './src/pipeline/settings.ts';

// Studio / CLI settings. The pipeline (scripts/*) passes the same RENDER values via the Node API.
Config.setEntryPoint('./src/remotion/index.ts');
Config.setConcurrency(RENDER.concurrency);
Config.setVideoImageFormat(RENDER.imageFormat);
Config.setJpegQuality(RENDER.jpegQuality);
Config.setCrf(RENDER.crf);
Config.setPixelFormat(RENDER.pixelFormat);
Config.setChromiumOpenGlRenderer(RENDER.gl);
Config.setOverwriteOutput(true);
