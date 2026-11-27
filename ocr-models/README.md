# OCR models

`ssd_int.traineddata`: Tesseract LSTM model (fast/integer build) for
seven-segment display digits, from
[Shreeshrii/tessdata_ssd](https://github.com/Shreeshrii/tessdata_ssd)
(Apache-2.0, see `LICENSE-tessdata_ssd`). Unmodified.

Served by the `ocr-assets` Vite plugin (vite.config.ts) at
`/ocr/<tesseract.js version>/lang/`. It is not precached by the service worker;
it's runtime-cached the first time the scale scanner opens.

Only integer ("fast") models work here. The repo's float models
(`ssd.traineddata`, `7seg.traineddata`, ~11 MB) abort in tesseract.js 7's
LSTM-only wasm core (`missing function: DotProductSSE`). Its author reports
that `7seg` does better on some real photos, so using it would mean converting
it to integer with `combine_tessdata -c`, or switching to the full
(non-LSTM-only) core.
