const { prisma } = require('../config/db');

const ALLOWED_FREQUENCIES = new Set(['once', 'daily', 'weekly', 'monthly']);

const parseScheduledAt = (date, time) => {
  const value = new Date(`${date}T${time}`);
  if (!date || !time || Number.isNaN(value.getTime())) {
    throw new Error('Tanggal dan waktu notifikasi tidak valid');
  }
  return value;
};

const validatePayload = (body) => {
  const title = String(body.title || '').trim();
  const content = String(body.body || '').trim();
  const frequency = String(body.frequency || 'once');
  if (!title || !content) throw new Error('Judul dan isi notifikasi wajib diisi');
  if (!ALLOWED_FREQUENCIES.has(frequency)) throw new Error('Frekuensi notifikasi tidak valid');

  const scheduledAt = body.scheduled_at
    ? new Date(body.scheduled_at)
    : parseScheduledAt(body.date, body.time);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('Tanggal dan waktu notifikasi tidak valid');

  return { title, body: content, frequency, scheduled_at: scheduledAt };
};

exports.list = async (req, res) => {
  try {
    const notifications = await prisma.customNotification.findMany({
      where: { user_id: req.user.id, is_test: false, active: true },
      orderBy: { scheduled_at: 'asc' }
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = validatePayload(req.body);
    const notification = await prisma.customNotification.create({
      data: { ...data, user_id: req.user.id, is_test: req.body.is_test === true }
    });
    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await prisma.customNotification.findFirst({
      where: { id: Number(req.params.id), user_id: req.user.id }
    });
    if (!existing) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });

    const data = validatePayload(req.body);
    const notification = await prisma.customNotification.update({
      where: { id: existing.id },
      data: { ...data, active: true }
    });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await prisma.customNotification.deleteMany({
      where: { id: Number(req.params.id), user_id: req.user.id }
    });
    if (!result.count) return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
