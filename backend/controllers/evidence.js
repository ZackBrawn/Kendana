const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/db');
const { processEvidence, commitEvidence } = require('../services/evidenceService');

// Upload and queue receipt processing
exports.store = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File gambar bukti wajib dilampirkan' });
  }

  const userId = req.user.id;
  const file = req.file;

  try {
    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${file.filename}${ext}`;

    // Rename file to preserve extension if needed
    const oldPath = file.path;
    const newPath = `${file.path}${ext}`;
    fs.renameSync(oldPath, newPath);

    // Create database record
    const evidence = await prisma.evidence.create({
      data: {
        user_id: userId,
        original_name: file.originalname,
        stored_name: storedName,
        mime_type: file.mimetype,
        extension: ext.slice(1),
        size: file.size,
        disk: 'local',
        path: newPath,
        status: 'UPLOADED',
        source: 'CHAT_UPLOAD'
      }
    });

    await prisma.evidenceProcessingLog.create({
      data: {
        evidence_id: evidence.id,
        stage: 'UPLOAD',
        status_before: null,
        status_after: 'UPLOADED',
        message: 'File bukti diunggah berhasil.'
      }
    });

    // Start AI processing in the background asynchronously
    processEvidence(evidence.id, userId)
      .catch(err => console.error('Background evidence processing error:', err));

    res.status(202).json({
      success: true,
      evidence: {
        id: evidence.id,
        uuid: evidence.uuid,
        original_name: evidence.original_name,
        mime_type: evidence.mime_type,
        size: evidence.size,
        status: 'UPLOADED',
        processing: true,
        created_at: evidence.created_at
      }
    });

  } catch (err) {
    console.error('Evidence store controller error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Retrieve draft parsed OCR results
exports.showDraft = async (req, res) => {
  const uuid = req.params.uuid;
  const userId = req.user.id;

  try {
    const evidence = await prisma.evidence.findFirst({
      where: { uuid, user_id: userId }
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Bukti transaksi tidak ditemukan' });
    }

    res.json({
      uuid: evidence.uuid,
      status: evidence.status,
      original_name: evidence.original_name,
      document_type: evidence.document_type,
      ocr_text: evidence.ocr_text,
      resolved_data: evidence.resolved_data,
      error_message: evidence.error_message,
      completed_at: evidence.completed_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Save manually revised draft values
exports.updateDraft = async (req, res) => {
  const uuid = req.params.uuid;
  const userId = req.user.id;
  const { resolved_data } = req.body;

  if (!resolved_data) {
    return res.status(400).json({ error: 'Data draft resolved_data wajib disertakan' });
  }

  try {
    const evidence = await prisma.evidence.findFirst({
      where: { uuid, user_id: userId }
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Bukti transaksi tidak ditemukan' });
    }

    const updated = await prisma.evidence.update({
      where: { id: evidence.id },
      data: { resolved_data }
    });

    res.json({
      success: true,
      resolved_data: updated.resolved_data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Commit draft to transaction_logs
exports.commit = async (req, res) => {
  const uuid = req.params.uuid;
  const userId = req.user.id;
  const overrides = req.body;

  try {
    const evidence = await prisma.evidence.findFirst({
      where: { uuid, user_id: userId }
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Bukti transaksi tidak ditemukan' });
    }

    const tx = await commitEvidence(evidence.id, userId, overrides);

    res.json({
      success: true,
      message: 'Bukti transaksi berhasil dicommit.',
      transaction: tx
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Timeline events
exports.timeline = async (req, res) => {
  const uuid = req.params.uuid;
  const userId = req.user.id;

  try {
    const evidence = await prisma.evidence.findFirst({
      where: { uuid, user_id: userId }
    });

    if (!evidence) {
      return res.status(404).json({ error: 'Bukti transaksi tidak ditemukan' });
    }

    const logs = await prisma.evidenceProcessingLog.findMany({
      where: { evidence_id: evidence.id },
      orderBy: { created_at: 'asc' }
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Statistics summary
exports.stats = async (req, res) => {
  const userId = req.user.id;

  try {
    const total = await prisma.evidence.count({ where: { user_id: userId } });
    const completed = await prisma.evidence.count({ where: { user_id: userId, status: 'COMPLETED' } });
    const failed = await prisma.evidence.count({ where: { user_id: userId, status: 'FAILED' } });

    res.json({
      total_evidence: total,
      completed,
      failed,
      success_rate: total > 0 ? parseFloat(((completed / total) * 100).toFixed(2)) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check pipeline status health
exports.health = async (req, res) => {
  try {
    const count = await prisma.evidence.count();
    res.json({
      status: 'healthy',
      queue_active: true,
      total_processed: count
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
};

