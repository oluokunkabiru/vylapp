// Tiny consistent response shapes so the frontend never has to guess.
function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}
function fail(res, status, message, details) {
  return res.status(status).json({ ok: false, error: { message, details: details || undefined } });
}
module.exports = { ok, fail };
