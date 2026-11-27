# OCR models

`ssd_int.traineddata`: Tesseract LSTM model (fast/integer build) for
seven-segment display digits, from
[Shreeshrii/tessdata_ssd](https://github.com/Shreeshrii/tessdata_ssd)
(Apache-2.0, see `LICENSE-tessdata_ssd`). Unmodified.

Served by the `ocr-assets` Vite plugin (vite.config.ts) at
`/ocr/<tesseract.js version>/lang/`. It is not precached by the service worker;
it's runtime-cached the first time the scale scanner opens.

The repo also has a larger float model (`7seg.traineddata`, ~11 MB) that its
author reports does better on some real photos. To try it, drop it in this
directory and add it to `OCR_MODELS` in src/lib/scan/ocr.ts.
