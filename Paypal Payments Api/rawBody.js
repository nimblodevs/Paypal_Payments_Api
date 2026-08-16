// ============================================================
// Raw Body Capture
// PayPal webhook signature verification needs the EXACT raw
// request body bytes (not the re-serialized JSON), because any
// re-serialization can change whitespace/key order and break
// the signature check. This middleware stashes the raw string
// on req.rawBody before body-parser consumes the stream.
// ============================================================

const rawBodySaver = (req, res, buf) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString('utf8');
  }
};

export default rawBodySaver;
