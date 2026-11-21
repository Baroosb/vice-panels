// Vice Panels entry point: start the studio and keep a handle on it for screenshots
// and console tinkering. Everything runs from this folder's own files, offline.

import { initStudio } from './editor.js';

window.VicePanels = await initStudio(document);
